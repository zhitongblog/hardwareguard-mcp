#!/usr/bin/env node
/**
 * Local MCP JSON-RPC 2.0 stdio server mirroring the exact 4 `rovo:mcp` tools
 * declared in `manifest.yml`. Enables instant local testing with Claude Code
 * and `SKILL.md` before or alongside Atlassian Forge production deployment.
 */

import readline from "node:readline";
import {
  auditBomResolver,
  checkIpdGateResolver,
  generateMinutesResolver,
  traceEcoResolver,
} from "./index.js";

const TOOLS = [
  {
    name: "audit-bom-table",
    description:
      "Compare a PCBA BOM CSV against optional schematic parts to detect swapped values, footprint mismatches (SMB vs SMA), duplicate designators, missing MPNs, EOL parts, and capacitor derating < 1.25x.",
    inputSchema: {
      type: "object",
      required: ["bomCsv"],
      properties: {
        bomCsv: { type: "string", description: "Raw BOM CSV text" },
        schematicJson: { type: "string", description: "Optional JSON array of schematic components" },
      },
    },
  },
  {
    name: "check-ipd-gate",
    description:
      "Evaluate open hardware issues and risk-accepted exceptions to compute a conservative PASS / CONDITIONAL / REJECT tape-out verdict with owner routing.",
    inputSchema: {
      type: "object",
      required: ["boardName", "issuesJson"],
      properties: {
        boardName: { type: "string" },
        issuesJson: { type: "string" },
      },
    },
  },
  {
    name: "trace-hardware-eco",
    description:
      "Validate connector pinout and power-domain compatibility between two mated PCBs (L4 cross-board check).",
    inputSchema: {
      type: "object",
      required: ["connectorsJson"],
      properties: {
        connectorsJson: { type: "string" },
      },
    },
  },
  {
    name: "generate-review-minutes",
    description:
      "Generate executive-ready Markdown hardware review minutes with verdict, owner blockers, and explicit risk-accepted ledger.",
    inputSchema: {
      type: "object",
      required: ["boardName", "auditJson"],
      properties: {
        boardName: { type: "string" },
        auditJson: { type: "string" },
      },
    },
  },
];

export async function handleMcpMessage(msg) {
  if (!msg || typeof msg !== "object" || !msg.method) {
    return { jsonrpc: "2.0", id: msg?.id ?? null, error: { code: -32600, message: "Invalid Request" } };
  }
  if (msg.method.startsWith("notifications/") || msg.id === undefined) {
    return null;
  }
  const { id, method, params = {} } = msg;

  if (method === "initialize") {
    const ver = params.protocolVersion === "2025-03-26" ? "2025-03-26" : "2024-11-05";
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: ver,
        capabilities: { tools: {} },
        serverInfo: { name: "hardwareguard-mcp-server", version: "0.2.0" },
        instructions:
          "Always audit BOM CSVs and cross-board connectors deterministically before evaluating the IPD release gate. Never hide Risk-Accepted critical defects.",
      },
    };
  }
  if (method === "ping") {
    return { jsonrpc: "2.0", id, result: {} };
  }
  if (method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
  }
  if (method === "tools/call") {
    const name = params.name;
    const args = params.arguments || {};
    try {
      let data;
      if (name === "audit-bom-table") data = await auditBomResolver(args);
      else if (name === "check-ipd-gate") data = await checkIpdGateResolver(args);
      else if (name === "trace-hardware-eco") data = await traceEcoResolver(args);
      else if (name === "generate-review-minutes") data = await generateMinutesResolver(args);
      else {
        return { jsonrpc: "2.0", id, error: { code: -32602, message: `Unknown tool: ${name}` } };
      }
      return {
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          isError: false,
        },
      };
    } catch (err) {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: `Tool error: ${err.message}` }],
          isError: true,
        },
      };
    }
  }
  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());
if (isMain) {
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  rl.on("line", async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const msg = JSON.parse(trimmed);
      const resp = await handleMcpMessage(msg);
      if (resp) process.stdout.write(JSON.stringify(resp) + "\n");
    } catch {
      process.stdout.write(
        JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }) + "\n"
      );
    }
  });
}
