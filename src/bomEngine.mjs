/**
 * HardwareGuard Deterministic BOM, Cross-Board & IPD Release-Gate Engine
 * Distilled from real-world PCBA mass-production audits (L0-L4 taxonomy).
 */

export function parseBomCsv(csvText) {
  const lines = String(csvText || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

export function routeOwner(layer) {
  switch (String(layer || "").toUpperCase()) {
    case "L0":
    case "L1":
    case "L4":
      return "Hardware Engineering";
    case "L2":
      return "Procurement / Component Eng";
    case "L3":
      return "Firmware Engineering";
    default:
      return "Hardware PM";
  }
}

export function auditBom(bomCsv, schematicComponents = []) {
  const rows = parseBomCsv(bomCsv);
  const findings = [];
  const seenDesignators = new Map();
  const schMap = new Map(
    (schematicComponents || []).map((c) => [String(c.designator || "").toUpperCase(), c])
  );

  for (const row of rows) {
    const des = String(row.designator || "").toUpperCase();
    const val = String(row.value || "").trim();
    const fp = String(row.footprint || "").trim();
    const mpn = String(row.mpn || "").trim();
    const status = String(row.status || "APPROVED").toUpperCase();
    const vRated = parseFloat(row.voltagerating || "0");
    const vBus = parseFloat(row.busvoltage || "0");

    if (!des) continue;

    // Rule 1: Duplicate designator
    if (seenDesignators.has(des)) {
      findings.push({
        id: `BOM-DUP-${des}`,
        layer: "L2",
        severity: "CRITICAL",
        designator: des,
        owner: routeOwner("L2"),
        summary: `Duplicate designator ${des} appears multiple times in BOM`,
        riskAccepted: false,
      });
    }
    seenDesignators.set(des, row);

    // Rule 2: Missing MPN or unapproved substitute
    if (!mpn || mpn === "TBD" || mpn === "N/A") {
      findings.push({
        id: `BOM-MPN-${des}`,
        layer: "L2",
        severity: "HIGH",
        designator: des,
        owner: routeOwner("L2"),
        summary: `${des} (${val}) is missing a qualified Manufacturer Part Number (MPN)`,
        riskAccepted: false,
      });
    }
    if (status === "UNAPPROVED_ALT" || status === "EOL") {
      findings.push({
        id: `BOM-STATUS-${des}`,
        layer: "L2",
        severity: "HIGH",
        designator: des,
        owner: routeOwner("L2"),
        summary: `${des} (${mpn}) has lifecycle/approval risk: ${status}`,
        riskAccepted: false,
      });
    }

    // Rule 3: Capacitor / semiconductor voltage derating margin (< 1.25x bus peak)
    if (vRated > 0 && vBus > 0) {
      const margin = vRated / vBus;
      if (margin < 1.25) {
        findings.push({
          id: `BOM-DERATE-${des}`,
          layer: "L2",
          severity: margin < 1.1 ? "CRITICAL" : "HIGH",
          designator: des,
          owner: routeOwner("L1"),
          summary: `${des} voltage derating insufficient: rated ${vRated}V vs ${vBus}V bus (${margin.toFixed(2)}x < 1.25x minimum)`,
          riskAccepted: false,
        });
      }
    }

    // Rule 4: Cross-check against schematic truth (Value swap & Footprint mismatch)
    if (schMap.has(des)) {
      const sch = schMap.get(des);
      if (sch.value && val && sch.value.toLowerCase() !== val.toLowerCase()) {
        findings.push({
          id: `BOM-VAL-${des}`,
          layer: "L2",
          severity: "CRITICAL",
          designator: des,
          owner: routeOwner("L2"),
          summary: `${des} value mismatch: Schematic=${sch.value} vs BOM=${val} (possible swapped component)`,
          riskAccepted: false,
        });
      }
      if (sch.footprint && fp && sch.footprint.toLowerCase() !== fp.toLowerCase()) {
        findings.push({
          id: `BOM-FP-${des}`,
          layer: "L2",
          severity: "CRITICAL",
          designator: des,
          owner: routeOwner("L1"),
          summary: `${des} footprint mismatch: Schematic=${sch.footprint} vs BOM=${fp} (pads will not fit PCB)`,
          riskAccepted: false,
        });
      }
    }
  }

  // Rule 5: Schematic components missing from BOM
  for (const [des, sch] of schMap.entries()) {
    if (!seenDesignators.has(des)) {
      findings.push({
        id: `BOM-MISS-${des}`,
        layer: "L2",
        severity: "HIGH",
        designator: des,
        owner: routeOwner("L2"),
        summary: `Schematic part ${des} (${sch.value || "unknown"}) is missing from BOM`,
        riskAccepted: false,
      });
    }
  }

  return {
    checkedRows: rows.length,
    checkedSchematicParts: schMap.size,
    findings,
    gate: evaluateIpdGate("BOM-Audit", findings),
  };
}

export function traceCrossBoardConnectors(connectors = []) {
  const findings = [];
  for (const c of connectors) {
    const vA = Number(c.boardA_voltage ?? 0);
    const vB = Number(c.boardB_voltage ?? 0);
    const netA = String(c.boardA_net || "NC").trim();
    const netB = String(c.boardB_net || "NC").trim();

    if (vA > 0 && vB > 0 && Math.abs(vA - vB) > 0.2) {
      findings.push({
        id: `L4-VOLT-${c.connector}-P${c.pin}`,
        layer: "L4",
        severity: "CRITICAL",
        owner: routeOwner("L4"),
        summary: `Cross-board voltage conflict on ${c.connector} Pin ${c.pin}: Board A (${netA}=${vA}V) mated to Board B (${netB}=${vB}V)`,
        riskAccepted: false,
      });
    } else if ((netA === "NC" && netB !== "NC") || (netB === "NC" && netA !== "NC")) {
      findings.push({
        id: `L4-OPEN-${c.connector}-P${c.pin}`,
        layer: "L4",
        severity: "HIGH",
        owner: routeOwner("L4"),
        summary: `Disconnected cross-board signal on ${c.connector} Pin ${c.pin}: Board A='${netA}' vs Board B='${netB}'`,
        riskAccepted: false,
      });
    }
  }
  return {
    checkedPins: connectors.length,
    findings,
    gate: evaluateIpdGate("CrossBoard-L4", findings),
  };
}

/**
 * Conservative IPD Tape-Out / Pilot Release Gate:
 * - Any open CRITICAL or HIGH -> REJECT
 * - Only open MEDIUM -> CONDITIONAL
 * - Only LOW / zero open -> PASS
 * - Risk-Accepted CRITICAL/HIGH issues NEVER disappear: tracked explicitly as `acceptedRiskCount`.
 */
export function evaluateIpdGate(boardName, issues = []) {
  const open = issues.filter((i) => !i.riskAccepted);
  const accepted = issues.filter((i) => i.riskAccepted);

  const countBy = (list, sev) =>
    list.filter((i) => String(i.severity || "").toUpperCase() === sev).length;

  const openCritical = countBy(open, "CRITICAL");
  const openHigh = countBy(open, "HIGH");
  const openMedium = countBy(open, "MEDIUM");
  const openLow = countBy(open, "LOW");
  const acceptedCriticalOrHigh = countBy(accepted, "CRITICAL") + countBy(accepted, "HIGH");

  let verdict = "PASS";
  if (openCritical > 0 || openHigh > 0) {
    verdict = "REJECT";
  } else if (openMedium > 0) {
    verdict = "CONDITIONAL";
  }

  const byOwner = {};
  for (const item of open) {
    const owner = item.owner || routeOwner(item.layer);
    byOwner[owner] = (byOwner[owner] || 0) + 1;
  }

  return {
    boardName,
    verdict,
    openCount: open.length,
    breakdown: { critical: openCritical, high: openHigh, medium: openMedium, low: openLow },
    acceptedRiskCount: accepted.length,
    acceptedCriticalOrHigh,
    ownerWorkload: byOwner,
    warningBanner:
      acceptedCriticalOrHigh > 0
        ? `RISK WARNING: ${acceptedCriticalOrHigh} Critical/High defect(s) were explicitly risk-accepted and remain visible on the board.`
        : null,
  };
}

export function formatReviewMinutes(boardName, auditResult) {
  const gate = auditResult.gate || auditResult;
  const findings = auditResult.findings || [];
  const lines = [
    `# Hardware IPD Review Minutes — ${boardName}`,
    "",
    `- **Release Verdict**: **${gate.verdict}**`,
    `- **Open Defects**: ${gate.openCount} (Critical: ${gate.breakdown.critical}, High: ${gate.breakdown.high}, Medium: ${gate.breakdown.medium}, Low: ${gate.breakdown.low})`,
    `- **Risk-Accepted Ledger**: ${gate.acceptedRiskCount} (${gate.acceptedCriticalOrHigh} Critical/High)`,
  ];
  if (gate.warningBanner) {
    lines.push(`- **Executive Alert**: ${gate.warningBanner}`);
  }
  lines.push("", "## Blocking Findings by Owner", "");
  if (findings.length === 0) {
    lines.push("_No defects detected._");
  } else {
    for (const f of findings) {
      const tag = f.riskAccepted ? "RISK-ACCEPTED" : f.severity;
      lines.push(`- **[${tag}]** \`${f.id}\` (${f.owner || routeOwner(f.layer)}): ${f.summary}`);
    }
  }
  return lines.join("\n") + "\n";
}
