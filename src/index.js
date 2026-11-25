import {
  auditBom,
  evaluateIpdGate,
  formatReviewMinutes,
  traceCrossBoardConnectors,
} from "./bomEngine.js";

export async function auditBomResolver({ bomCsv, schematicJson }) {
  const schematic = schematicJson ? JSON.parse(schematicJson) : [];
  return auditBom(bomCsv, schematic);
}

export async function checkIpdGateResolver({ boardName, issuesJson }) {
  const issues = issuesJson ? JSON.parse(issuesJson) : [];
  return evaluateIpdGate(boardName, issues);
}

export async function traceEcoResolver({ connectorsJson }) {
  const connectors = connectorsJson ? JSON.parse(connectorsJson) : [];
  return traceCrossBoardConnectors(connectors);
}

export async function generateMinutesResolver({ boardName, auditJson }) {
  const parsed = typeof auditJson === "string" ? JSON.parse(auditJson) : auditJson;
  return {
    boardName,
    markdown: formatReviewMinutes(boardName, parsed),
  };
}

export async function ecoPanelResolver(req) {
  const sampleIssues = req?.payload?.issues || [];
  return evaluateIpdGate(req?.payload?.boardName || "Current Jira Hardware ECO", sampleIssues);
}
