/**
 * Derived metric calculations. All inputs should already be normalized
 * (see engine/normalize.ts). Functions return null if the inputs don't
 * support the calculation.
 */

import type { CanonicalRow } from "../config/canonical-schema";

export function ctr(row: CanonicalRow): number | null {
  if (!row.impressions || row.impressions <= 0) return null;
  return row.clicks / row.impressions;
}

export function cpc(row: CanonicalRow): number | null {
  if (!row.clicks || row.clicks <= 0) return null;
  return row.spend / row.clicks;
}

export function cpm(row: CanonicalRow): number | null {
  if (!row.impressions || row.impressions <= 0) return null;
  return (row.spend / row.impressions) * 1000;
}

export function cvr(row: CanonicalRow): number | null {
  if (!row.clicks || row.clicks <= 0 || row.conversions == null) return null;
  return row.conversions / row.clicks;
}

export function cpa(row: CanonicalRow): number | null {
  if (!row.conversions || row.conversions <= 0) return null;
  return row.spend / row.conversions;
}

export function roas(row: CanonicalRow): number | null {
  if (!row.revenue || !row.spend || row.spend <= 0) return null;
  return row.revenue / row.spend;
}

/** Enrich a set of rows with all derived metrics. Preserves inputs. */
export function enrichRows(rows: CanonicalRow[]): CanonicalRow[] {
  return rows.map((r) => ({
    ...r,
    ctr: r.ctr ?? ctr(r) ?? undefined,
    cpc: r.cpc ?? cpc(r) ?? undefined,
    cpm: r.cpm ?? cpm(r) ?? undefined,
    cvr: r.cvr ?? cvr(r) ?? undefined,
    cpa: r.cpa ?? cpa(r) ?? undefined,
    roas: r.roas ?? roas(r) ?? undefined,
  }));
}

// ─── Benchmarks (median + MAD) ────────────────────────────────────────

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Median Absolute Deviation — robust spread measure */
function mad(nums: number[]): number {
  if (nums.length === 0) return 0;
  const med = median(nums);
  return median(nums.map((n) => Math.abs(n - med)));
}

export interface Benchmark {
  metric: string;
  median: number;
  mad: number;
  low: number;          // median - mad
  high: number;         // median + mad
  sampleSize: number;
}

export function computeBenchmarks(
  rows: CanonicalRow[],
  metrics: Array<keyof CanonicalRow> = ["ctr", "cpc", "cpm", "cvr", "cpa"],
): Record<string, Benchmark> {
  const out: Record<string, Benchmark> = {};
  for (const m of metrics) {
    const values = rows.map((r) => r[m]).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (values.length === 0) continue;
    const med = median(values);
    const spread = mad(values);
    out[m as string] = {
      metric: m as string,
      median: med,
      mad: spread,
      low: med - spread,
      high: med + spread,
      sampleSize: values.length,
    };
  }
  return out;
}
