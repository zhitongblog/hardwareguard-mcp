# Judge Verification Guide (2-Minute Reproduction)

> **Atlassian Codegeist 2026**
> - **Main Track 3**: Apps for Specialized Industries (Manufacturing / Smart Hardware / Automotive)
> - **Bonus Track**: Best App with Atlassian MCP (`rovo:mcp` + `SKILL.md`)
> - **Live Demo Video (1080p)**: https://youtu.be/1ml8jgXW-mo
> - **1-Click Forge Production Install Link (Jira + Confluence)**: [Install HardwareGuard MCP v2.0.0](https://developer.atlassian.com/console/install/ca9901af-d16e-4831-bb64-b7e43575f20b?signature=AYABeJFWNO9Z7jSfXPAZKmzsjhMAAAADAAdhd3Mta21zAEthcm46YXdzOmttczp1cy13ZXN0LTI6NzA5NTg3ODM1MjQzOmtleS83MDVlZDY3MC1mNTdjLTQxYjUtOWY5Yi1lM2YyZGNjMTQ2ZTcAuAECAQB4CxqLTo9l4lqXuFjNim1xJM%2Bp%2F3TVP9xHS2BrU5DRRucBBtnnhmMZpRQzsKK6REHYhAAAAH4wfAYJKoZIhvcNAQcGoG8wbQIBADBoBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDIvVupSp8Wvv6uG3VwIBEIA7x%2BBqIggxDkehPTQxcPecG5f0PLblPBhXFucRVsmdpjqWpzjVXVqMGTlKble60MiZHkmqEZJqLMvX5IgAB2F3cy1rbXMAS2Fybjphd3M6a21zOmV1LXdlc3QtMTo3MDk1ODc4MzUyNDM6a2V5LzQ2MzBjZTZiLTAwYzMtNGRlMi04NzdiLTYyN2UyMDYwZTVjYwC4AQICAHi9bVMAkme4qVQX1fQHo6ePw3H40A7cGfz7yrmSfBWMXgEYYVicB29a6bW0dLUJZm%2FkAAAAfjB8BgkqhkiG9w0BBwagbzBtAgEAMGgGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMO9GsRpbvUO9bbcjEAgEQgDtYWwva4sCll9JhOgNDtAr1gjQCiV941nHIz0o0WEMz4%2BVQpuglZJFvGXQwaAuKKO%2Fwq96F3QNU7HIylgAHYXdzLWttcwBLYXJuOmF3czprbXM6dXMtZWFzdC0xOjcwOTU4NzgzNTI0MzprZXkvNmMxMjBiYTAtNGNkNS00OTg1LWI4MmUtNDBhMDQ5NTJjYzU3ALgBAgIAeDYASx0XCjkny4iLV6vz%2BKtEGSGT6kdt0QRpkn6D%2FlVEAYpyLDr0MsxG7B0RGGtDj%2F0AAAB%2BMHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAy2hO9%2FLqNaEDEU55MCARCAOzmvWDbHlX2uInFohg0P%2BT3ihATIhpux4tS7%2BHv4ETltzyRaSX8GSQgPexGk%2B%2BYXKafOLo6zxN4EJbccAgAAAAAMAAAQAAAAAAAAAAAAAAAAAIx07vImEigHG%2B02MYfSibz%2F%2F%2F%2F%2FAAAAAQAAAAAAAAAAAAAAAQAAADJWSzPCNuMkYY1JPdAZxC%2Bx7HZPU70FtNehuwnLgI3Qt0%2F0Zmlfw4hLW7GuzFWlVwHJ8qfwoEKZgd3ruwRHqOVdYAo%3D&product=jira&product=confluence)

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
