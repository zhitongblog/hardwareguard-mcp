import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  auditBomResolver,
  checkIpdGateResolver,
  generateMinutesResolver,
  traceEcoResolver,
} from "../src/index.mjs";
import { handleMcpMessage } from "../src/mcp-stdio.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("auditBomResolver catches real-world swapped resistors, footprint mismatch, derating & missing part", async () => {
  const bomCsv = fs.readFileSync(path.join(__dirname, "../fixtures/sample_pcba_bom.csv"), "utf8");
  const schematicJson = fs.readFileSync(
    path.join(__dirname, "../fixtures/sample_schematic.json"),
    "utf8"
  );

  const res = await auditBomResolver({ bomCsv, schematicJson });
  const ids = new Set(res.findings.map((f) => f.id));

  assert.equal(res.gate.verdict, "REJECT");
  assert.ok(ids.has("BOM-VAL-R24"), "must detect R24 value swap");
  assert.ok(ids.has("BOM-VAL-R27"), "must detect R27 value swap");
  assert.ok(ids.has("BOM-FP-D1"), "must detect D1 SMB vs SMA footprint mismatch");
  assert.ok(ids.has("BOM-DERATE-C_BUS1"), "must detect 400V/373V = 1.07x derating failure");
  assert.ok(ids.has("BOM-MPN-U1"), "must detect TBD MPN");
  assert.ok(ids.has("BOM-MISS-TVS1"), "must detect TVS1 missing from BOM");
});

test("traceEcoResolver catches 5V vs 12V cross-board conflict and open RS485 pin", async () => {
  const connectorsJson = fs.readFileSync(
    path.join(__dirname, "../fixtures/sample_crossboard.json"),
    "utf8"
  );
  const res = await traceEcoResolver({ connectorsJson });
  assert.equal(res.gate.verdict, "REJECT");
  assert.equal(res.findings.length, 2);
});

test("checkIpdGateResolver keeps Risk-Accepted critical defects visible while allowing conditional pass", async () => {
  const issuesJson = JSON.stringify([
    { id: "BOM-DERATE-C1", layer: "L2", severity: "CRITICAL", summary: "Derating exception", riskAccepted: true },
    { id: "L1-SILK-1", layer: "L1", severity: "LOW", summary: "Silkscreen overlap", riskAccepted: false },
  ]);
  const gate = await checkIpdGateResolver({ boardName: "PB95-RevC", issuesJson });
  assert.equal(gate.verdict, "PASS");
  assert.equal(gate.acceptedCriticalOrHigh, 1);
  assert.match(gate.warningBanner, /RISK WARNING/);

  const minutes = await generateMinutesResolver({ boardName: "PB95-RevC", auditJson: JSON.stringify(gate) });
  assert.match(minutes.markdown, /Release Verdict.*PASS/);
  assert.match(minutes.markdown, /RISK WARNING/);
});

test("MCP JSON-RPC 2.0 server mirrors all 4 rovo:mcp tools cleanly", async () => {
  const init = await handleMcpMessage({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-03-26" },
  });
  assert.equal(init.result.protocolVersion, "2025-03-26");

  const list = await handleMcpMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  assert.equal(list.result.tools.length, 4);

  const bomCsv = fs.readFileSync(path.join(__dirname, "../fixtures/sample_pcba_bom.csv"), "utf8");
  const call = await handleMcpMessage({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: { name: "audit-bom-table", arguments: { bomCsv } },
  });
  assert.equal(call.result.isError, false);
  assert.match(call.result.content[0].text, /BOM-DERATE-C_BUS1/);
});
