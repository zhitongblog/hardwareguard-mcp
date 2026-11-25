---
name: hardwareguard-ipd-review
description: Run deterministic PCBA BOM audits, cross-board L4 connector checks, and conservative IPD mass-production release gating via Atlassian Rovo MCP (`HardwareGuard MCP`).
---

# Skill: HardwareGuard IPD Release Gate (Atlassian `rovo:mcp`)

## Overview
This skill teaches Claude Code, Rovo Agents, and external MCP clients how to run a **zero-hallucination hardware pre-tape-out / pilot-run audit** across Jira Hardware ECO tickets and Confluence BOM tables using the `hardwareguard-mcp-server` Forge app.

## Available `rovo:mcp` Tools
1. **`audit-bom-table`**: Deterministic L2 cross-check of a BOM CSV against schematic components (detects swapped resistor values, SMB/SMA footprint mismatches, missing MPNs, EOL parts, and capacitor derating < 1.25x).
2. **`trace-hardware-eco`**: Deterministic L4 cross-board connector audit (detects 5V vs 12V domain conflicts and dangling cross-board signals like RS485/I2C).
3. **`check-ipd-gate`**: Computes conservative release verdict (`REJECT` / `CONDITIONAL` / `PASS`), routes workload by discipline (`Hardware`, `Procurement`, `Firmware`), and preserves **Risk-Accepted** fatal defects visibly.
4. **`generate-review-minutes`**: Generates meeting-ready Markdown minutes ready to paste into Confluence or a Jira ECO comment.

## Agent Operating Procedure
1. **Never rely on LLM arithmetic for derating or BOM diffs**: Always pass raw CSV/JSON tables to `audit-bom-table` and `trace-hardware-eco`.
2. **Never treat "Unchecked" as "Clean"**: If schematic JSON is missing, explicitly warn the user that only BOM completeness (L2) was audited and connectivity/value swaps remain unchecked.
3. **Never hide Risk-Accepted defects**: Always surface `warningBanner` when any Critical/High issue is marked `riskAccepted: true`.
4. **End with `generate-review-minutes`** so the Hardware PM can paste the verdict directly into the Jira ECO review ticket.
