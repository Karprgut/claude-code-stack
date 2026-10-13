/**
 * LLM synthesis step — takes the structured insights and asks Claude to
 * write an executive summary (account_health + primary_findings + risks +
 * opportunities). Rules already carry the causal reasoning and numbers;
 * Claude's job here is ONLY editorial polish on the summary, not to
 * invent new insights.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { InsightsOutput } from "../schema";

interface SynthesizeInput {
  meta: InsightsOutput["meta"];
  insights: InsightsOutput["insights"];
  recommendations: InsightsOutput["recommendations"];
}

export async function synthesize(input: SynthesizeInput): Promise<InsightsOutput["summary"]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return fallbackSummary(input);
  }
  try {
    const client = new Anthropic({ apiKey });
    const prompt = buildPrompt(input);
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });
    const text = res.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("")
      .trim();
    return parseSummaryJSON(text) ?? fallbackSummary(input);
  } catch (err) {
    console.error("[insights/synthesize] LLM failed:", err);
    return fallbackSummary(input);
  }
}

function buildPrompt({ meta, insights, recommendations }: SynthesizeInput): string {
  const insightsSummary = insights.map((i) => `- [${i.confidence}] ${i.title}: ${i.observation}`).join("\n");
  const recsSummary = recommendations.slice(0, 10).map((r) => `- (${r.urgency}, ${r.effort}) ${r.action}`).join("\n");
  const platformList = meta.platform.split("+").filter(Boolean);
  const platformLabel = platformList.length > 1
    ? `across ${platformList.map((p) => p.toUpperCase()).join(", ")}`
    : `from a ${(platformList[0] ?? meta.platform).toUpperCase()} account`;
  return `You are a senior performance marketing strategist. Review the following machine-detected insights ${platformLabel} and write a concise executive summary.

Account: ${meta.accountName}
Platforms in this account: ${platformList.map((p) => p.toUpperCase()).join(", ") || meta.platform.toUpperCase()}
Timeframe: ${meta.timeframe.since} to ${meta.timeframe.until}
Campaigns analyzed: ${meta.dataPoints.campaigns}

Detected insights:
${insightsSummary || "(no insights fired)"}

Top recommendations:
${recsSummary || "(no recommendations)"}

Return STRICTLY a JSON object with these exact fields (no markdown fences, no preamble):

{
  "account_health": "one or two sentences on overall account state in Spanish",
  "primary_findings": ["3 to 5 key findings, each 1 line"],
  "main_risks": ["specific risks if inaction continues"],
  "main_opportunities": ["specific opportunities to capture"]
}

Rules:
- Write in Spanish (Mexican business tone).
- Do NOT repeat the raw numbers the user already sees; INTERPRET them.
- Be specific. Say what, where, and why — not generic advice.
- If there are no insights, summary should say so plainly.

CRITICAL — funnel-stage awareness (non-negotiable):
- Campaigns fall into three stages: **Awareness (TOFU)** — reach, impressions, video views; **Consideration (MOFU)** — link clicks, landing page views, engagement; **Conversion (BOFU)** — purchases, leads, sign-ups.
- Results from different stages are NOT comparable. A link-click campaign with 10,000 results is NOT more efficient than a purchase campaign with 50 results. The purchase result is worth much more.
- NEVER say a TOFU/MOFU campaign is "better", "more efficient" or "outperforming" a BOFU campaign because it has more volume or lower cost-per-result. Those metrics only compare WITHIN the same stage.
- When recommending budget shifts, only suggest reallocating within the same funnel stage. Shifting budget from a BOFU campaign to a TOFU one to chase volume would destroy business value.
- If the account has a mix of stages and one stage dominates results by volume, explicitly note that this reflects the campaign objective, not relative efficiency.
- When critiquing a high-CPR campaign, check the funnel stage first. A BOFU campaign at $30/lead is usually healthy; a TOFU campaign at $30/video-view is alarming.

Multi-platform reasoning:
- The \`platform\` field on each row tells you where the campaign runs (meta, google, tiktok). Treat the account as ONE unit that happens to span multiple channels.
- When recommending budget shifts, prefer shifts WITHIN the same funnel stage and similar objective, regardless of platform. Example: shifting budget from a low-ROAS Meta purchase campaign to a high-ROAS Google Shopping campaign is fair game; shifting from a Meta TOFU video campaign to a Google Search branded campaign is not (different stage).
- Always reference the platform when calling out a specific campaign so the reader knows where to act.`;
}

function parseSummaryJSON(text: string): InsightsOutput["summary"] | null {
  // Strip any surrounding fences or prose defensively
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (typeof parsed.account_health !== "string") return null;
    return {
      account_health: String(parsed.account_health),
      primary_findings: Array.isArray(parsed.primary_findings) ? parsed.primary_findings.map(String) : [],
      main_risks: Array.isArray(parsed.main_risks) ? parsed.main_risks.map(String) : [],
      main_opportunities: Array.isArray(parsed.main_opportunities) ? parsed.main_opportunities.map(String) : [],
    };
  } catch {
    return null;
  }
}

/** Rule-only fallback when the LLM is unavailable. */
function fallbackSummary({ insights, recommendations }: SynthesizeInput): InsightsOutput["summary"] {
  if (insights.length === 0) {
    return {
      account_health: "No se detectaron patrones problemáticos con las reglas actuales. Revisar manualmente o ampliar el set de reglas.",
      primary_findings: [],
      main_risks: [],
      main_opportunities: [],
    };
  }
  return {
    account_health: `${insights.length} hallazgos detectados por reglas, ${recommendations.length} recomendaciones disponibles.`,
    primary_findings: insights.slice(0, 5).map((i) => i.title),
    main_risks: insights.filter((i) => i.confidence === "high").slice(0, 3).map((i) => i.business_impact),
    main_opportunities: recommendations.filter((r) => r.urgency === "high" && r.effort === "low").slice(0, 3).map((r) => r.action),
  };
}
