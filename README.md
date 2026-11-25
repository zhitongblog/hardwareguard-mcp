# HardwareGuard MCP (Atlassian Codegeist 2026)

> **Target Tracks**:
> - **Main Track 3**: *Apps for Specialized Industries (Manufacturing / Smart Hardware / Automotive)* — $15,000 / $8,000 / $5,000
> - **Bonus Track**: *Best App with Atlassian MCP (`rovo:mcp` + `SKILL.md`)* — $1,500 (6 winners)

## What It Solves
Smart-hardware and manufacturing teams manage ECOs in **Jira** and BOM tables in **Confluence**, yet costly tape-out mistakes (swapped resistor values, SMB vs SMA footprint mismatches, 5V-to-12V cross-board connector conflicts, under-derated bus capacitors) slip into pilot production because LLMs hallucinate spreadsheet diffs.

**HardwareGuard MCP** embeds a **deterministic hardware engineering audit engine** inside Atlassian Forge and exposes it via **`rovo:mcp`** + an open-source **`SKILL.md`** so Rovo Agents and Claude Code can enforce a conservative `PASS / CONDITIONAL / REJECT` IPD release gate directly from Jira & Confluence context.

## Verify Locally Right Now
```bash
npm test
```

## Deploy to Atlassian Forge (Submission Steps)
```bash
npm install -g @forge/cli
forge login
forge register
forge deploy -e production
forge install --product jira --environment production
# Enable Sharing in Atlassian Developer Console to generate the judge installation link
```
