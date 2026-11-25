# Judge Verification Guide (2-Minute Reproduction)

> **Atlassian Codegeist 2026**
> - **Main Track 3**: Apps for Specialized Industries (Manufacturing / Smart Hardware / Automotive)
> - **Bonus Track**: Best App with Atlassian MCP (`rovo:mcp` + `SKILL.md`)

## Option A: Instant Local Verification (Zero Credentials, 30 Seconds)

```bash
# 1. Run deterministic BOM / L4 Cross-Board / IPD Gate + MCP stdio conformance suite
npm test

# 2. Run the local MCP server matching manifest.yml's 4 rovo:mcp tools
node src/mcp-stdio.mjs
```

### What `npm test` Proves
1. **Real-World PCBA BOM Catch (`fixtures/sample_pcba_bom.csv` vs `sample_schematic.json`)**:
   - Detects swapped resistor values (`BOM-VAL-R24`, `BOM-VAL-R27`)
   - Detects SMB vs SMA pad footprint mismatch (`BOM-FP-D1`)
   - Detects capacitor voltage derating violation (`BOM-DERATE-C_BUS1`: 400V rated on 373V bus = `1.07x < 1.25x`)
   - Detects missing MPN (`BOM-MPN-U1`) and schematic part omitted from BOM (`BOM-MISS-TVS1`)
   - Returns conservative **`REJECT`** gate verdict
2. **Cross-Board L4 Connector Audit (`fixtures/sample_crossboard.json`)**:
   - Flags `5V` mated to `12V` (`L4-VOLT-CN1-CN2-P1`) and dangling `RS485_A` (`L4-OPEN-CN1-CN2-P5`)
3. **Conservative Risk-Accepted Ledger**:
   - Even when a Critical defect is explicitly waived (`riskAccepted: true`), `check-ipd-gate` and `generate-review-minutes` emit a prominent `RISK WARNING` banner so executive sign-off never hides residual risk.
4. **Full MCP JSON-RPC 2.0 Conformance**:
   - Verifies `initialize` (`2025-03-26`), `ping`, `tools/list`, and `tools/call` across all 4 `rovo:mcp` tools.

## Option B: Deploy to Atlassian Forge Production Site

```bash
npm install -g @forge/cli
forge login
forge register
forge deploy -e production
forge install --product jira --environment production
```

Then pair **`SKILL.md`** with Claude Code / Rovo Agent to run cross-ticket Jira ECO + Confluence BOM audits directly via `rovo:mcp`.
