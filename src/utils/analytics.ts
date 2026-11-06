import { FilterState, HospitalRiskRecord } from '../types/tb';

export interface WilsonCIResult {
  events: number;
  total: number;
  proportion: number;
  per100: number;
  per100Lower: number;
  per100Upper: number;
  per1000: number;
  per1000Lower: number;
  per1000Upper: number;
}

export interface RelativeRiskResult {
  rr: number;
  lower95: number;
  upper95: number;
  rate1Per1000: number;
  rate2Per1000: number;
  pValueApprox: string;
}

export interface HospitalSummaryRow {
  hospitalId: string;
  hospitalName: string;
  district: string;
  screened: number;
  cxrDone: number;
  symptomatic: number;
  symptomaticPct: number;
  abnormalCxr: number;
  abnormalCxrPct: number;
  tbDiagnosed: number;
  tbRatePer1000: number;
  tbPct: number;
  afbPositive: number;
  xpertPositive: number;
  prevScreened5Nov: number;
  deltaScreened: number;
  deltaAbnormalCxr: number;
  deltaTb: number;
  topRiskGroups: {
    riskGroupName: string;
    screened: number;
    symptomatic: number;
    abnormalCxr: number;
    tbDiagnosed: number;
  }[];
}

export interface RiskGroupSummaryRow {
  riskGroupId: string;
  riskGroupName: string;
  riskCategory: HospitalRiskRecord['riskCategory'];
  isNineRiskGroup: boolean;
  screened: number;
  symptomatic: number;
  symptomaticPct: number;
  abnormalCxr: number;
  abnormalCxrPct: number;
  tbDiagnosed: number;
  tbRatePer1000: number;
  deltaScreened: number;
}

export interface ProvinceKpiSummary {
  totalScreened: number;
  prevTotalScreened: number;
  deltaScreened: number;
  totalCxrDone: number;
  totalSymptomatic: number;
  symptomaticPct: number;
  totalAbnormalCxr: number;
  prevTotalAbnormalCxr: number;
  deltaAbnormalCxr: number;
  abnormalCxrPct: number;
  totalTb: number;
  prevTotalTb: number;
  deltaTb: number;
  tbPct: number;
  tbRatePer1000: number;
  totalAfbPositive: number;
  totalXpertPositive: number;
  totalLtbiPositive: number;
  hospitalCount: number;
  riskGroupCount: number;
}

/**
 * Computes Wilson score confidence intervals for proportions, percentages, and rates per 1,000.
 */
export function wilsonConfidenceInterval(
  events: number,
  total: number,
  z = 1.96
): WilsonCIResult {
  if (total <= 0) {
    return {
      events: 0,
      total: 0,
      proportion: 0,
      per100: 0,
      per100Lower: 0,
      per100Upper: 0,
      per1000: 0,
      per1000Lower: 0,
      per1000Upper: 0,
    };
  }

  const p = Math.min(1, Math.max(0, events / total));
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const center = p + z2 / (2 * total);
  const margin = z * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total));

  const lower = Math.max(0, (center - margin) / denom);
  const upper = Math.min(1, (center + margin) / denom);

  return {
    events,
    total,
    proportion: p,
    per100: Number((p * 100).toFixed(2)),
    per100Lower: Number((lower * 100).toFixed(2)),
    per100Upper: Number((upper * 100).toFixed(2)),
    per1000: Number((p * 1000).toFixed(1)),
    per1000Lower: Number((lower * 1000).toFixed(1)),
    per1000Upper: Number((upper * 1000).toFixed(1)),
  };
}

/**
 * Computes Relative Risk (RR) and 95% confidence interval using log(RR) standard error.
 */
export function relativeRiskWithCI(
  events1: number,
  total1: number,
  events2: number,
  total2: number
): RelativeRiskResult {
  if (total1 <= 0 || total2 <= 0 || events1 <= 0 || events2 <= 0) {
    return {
      rr: 0,
      lower95: 0,
      upper95: 0,
      rate1Per1000: total1 > 0 ? Number(((events1 / total1) * 1000).toFixed(1)) : 0,
      rate2Per1000: total2 > 0 ? Number(((events2 / total2) * 1000).toFixed(1)) : 0,
      pValueApprox: '-',
    };
  }

  const r1 = events1 / total1;
  const r2 = events2 / total2;
  const rr = r1 / r2;
  const seLogRR = Math.sqrt(1 / events1 - 1 / total1 + 1 / events2 - 1 / total2);
  const lnRR = Math.log(rr);
  const lower = Math.exp(lnRR - 1.96 * seLogRR);
  const upper = Math.exp(lnRR + 1.96 * seLogRR);

  const zStat = Math.abs(lnRR) / seLogRR;
  const pValueApprox =
    zStat >= 3.29
      ? '< 0.001'
      : zStat >= 2.58
      ? '< 0.01'
      : zStat >= 1.96
      ? '< 0.05'
      : '≥ 0.05';

  return {
    rr: Number(rr.toFixed(1)),
    lower95: Number(lower.toFixed(1)),
    upper95: Number(upper.toFixed(1)),
    rate1Per1000: Number((r1 * 1000).toFixed(1)),
    rate2Per1000: Number((r2 * 1000).toFixed(1)),
    pValueApprox,
  };
}

/**
 * Computes Number Needed to Screen (NNS) to detect 1 TB case.
 */
export function numberNeededToScreen(events: number, total: number): number {
  if (events <= 0 || total <= 0) return 0;
  return Math.round(total / events);
}

/**
 * Computes TB detection rate per 100,000 population with Wilson 95% CI.
 */
export function populationRatePer100k(tbCases: number, population: number) {
  if (population <= 0) {
    return { ratePer100k: 0, lower95: 0, upper95: 0 };
  }
  const ci = wilsonConfidenceInterval(tbCases, population);
  return {
    ratePer100k: Number(((tbCases / population) * 100000).toFixed(1)),
    lower95: Number((ci.proportion === 0 ? 0 : (ci.per1000Lower * 100)).toFixed(1)),
    upper95: Number((ci.per1000Upper * 100).toFixed(1)),
  };
}

/**
 * Real-time SQL-equivalent relational WHERE filter over screening records.
 */
export function filterScreeningRecords(
  records: HospitalRiskRecord[],
  filters: FilterState
): HospitalRiskRecord[] {
  const q = filters.searchQuery.trim().toLowerCase();

  return records.filter((rec) => {
    if (filters.hospitalName !== 'all' && rec.hospitalName !== filters.hospitalName) {
      return false;
    }
    if (filters.riskCategory !== 'all' && rec.riskCategory !== filters.riskCategory) {
      return false;
    }
    if (filters.findingFilter === 'symptomatic' && rec.symptomatic <= 0) {
      return false;
    }
    if (filters.findingFilter === 'abnormal_cxr' && rec.abnormalCxr <= 0) {
      return false;
    }
    if (filters.findingFilter === 'tb_diagnosed' && rec.tbDiagnosed <= 0) {
      return false;
    }
    if (q) {
      const hay = `${rec.hospitalName} ${rec.district} ${rec.riskGroupName}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/**
 * Computes aggregated province-wide KPI summary from filtered records.
 */
export function computeProvinceSummary(
  records: HospitalRiskRecord[]
): ProvinceKpiSummary {
  const hospitals = new Set<string>();
  const riskGroups = new Set<string>();

  let totalScreened = 0;
  let prevTotalScreened = 0;
  let totalCxrDone = 0;
  let totalSymptomatic = 0;
  let totalAbnormalCxr = 0;
  let prevTotalAbnormalCxr = 0;
  let totalTb = 0;
  let prevTotalTb = 0;
  let totalAfbPositive = 0;
  let totalXpertPositive = 0;
  let totalLtbiPositive = 0;

  for (const r of records) {
    if (r.screened > 0) {
      hospitals.add(r.hospitalName);
      riskGroups.add(r.riskGroupName);
    }
    totalScreened += r.screened;
    prevTotalScreened += r.prevScreened5Nov;
    totalCxrDone += r.cxrDone;
    totalSymptomatic += r.symptomatic;
    totalAbnormalCxr += r.abnormalCxr;
    prevTotalAbnormalCxr += r.prevAbnormalCxr5Nov;
    totalTb += r.tbDiagnosed;
    prevTotalTb += r.prevTb5Nov;
    totalAfbPositive += r.afbPositive;
    totalXpertPositive += r.xpertPositive;
    totalLtbiPositive += r.ltbiPositive;
  }

  return {
    totalScreened,
    prevTotalScreened,
    deltaScreened: totalScreened - prevTotalScreened,
    totalCxrDone,
    totalSymptomatic,
    symptomaticPct:
      totalScreened > 0
        ? Number(((totalSymptomatic / totalScreened) * 100).toFixed(1))
        : 0,
    totalAbnormalCxr,
    prevTotalAbnormalCxr,
    deltaAbnormalCxr: totalAbnormalCxr - prevTotalAbnormalCxr,
    abnormalCxrPct:
      totalScreened > 0
        ? Number(((totalAbnormalCxr / totalScreened) * 100).toFixed(1))
        : 0,
    totalTb,
    prevTotalTb,
    deltaTb: totalTb - prevTotalTb,
    tbPct:
      totalScreened > 0
        ? Number(((totalTb / totalScreened) * 100).toFixed(2))
        : 0,
    tbRatePer1000:
      totalScreened > 0
        ? Number(((totalTb / totalScreened) * 1000).toFixed(1))
        : 0,
    totalAfbPositive,
    totalXpertPositive,
    totalLtbiPositive,
    hospitalCount: hospitals.size,
    riskGroupCount: riskGroups.size,
  };
}

/**
 * Relational GROUP BY hospitalName aggregation with top 4 risk groups per hospital.
 */
export function aggregateByHospital(
  records: HospitalRiskRecord[]
): HospitalSummaryRow[] {
  const map = new Map<
    string,
    {
      hospitalId: string;
      hospitalName: string;
      district: string;
      screened: number;
      cxrDone: number;
      symptomatic: number;
      abnormalCxr: number;
      tbDiagnosed: number;
      afbPositive: number;
      xpertPositive: number;
      prevScreened5Nov: number;
      prevAbnormalCxr5Nov: number;
      prevTb5Nov: number;
      riskGroups: Map<
        string,
        {
          riskGroupName: string;
          screened: number;
          symptomatic: number;
          abnormalCxr: number;
          tbDiagnosed: number;
        }
      >;
    }
  >();

  for (const r of records) {
    let entry = map.get(r.hospitalName);
    if (!entry) {
      entry = {
        hospitalId: r.hospitalId,
        hospitalName: r.hospitalName,
        district: r.district,
        screened: 0,
        cxrDone: 0,
        symptomatic: 0,
        abnormalCxr: 0,
        tbDiagnosed: 0,
        afbPositive: 0,
        xpertPositive: 0,
        prevScreened5Nov: 0,
        prevAbnormalCxr5Nov: 0,
        prevTb5Nov: 0,
        riskGroups: new Map(),
      };
      map.set(r.hospitalName, entry);
    }

    entry.screened += r.screened;
    entry.cxrDone += r.cxrDone;
    entry.symptomatic += r.symptomatic;
    entry.abnormalCxr += r.abnormalCxr;
    entry.tbDiagnosed += r.tbDiagnosed;
    entry.afbPositive += r.afbPositive;
    entry.xpertPositive += r.xpertPositive;
    entry.prevScreened5Nov += r.prevScreened5Nov;
    entry.prevAbnormalCxr5Nov += r.prevAbnormalCxr5Nov;
    entry.prevTb5Nov += r.prevTb5Nov;

    if (r.screened > 0) {
      const rg = entry.riskGroups.get(r.riskGroupName) ?? {
        riskGroupName: r.riskGroupName,
        screened: 0,
        symptomatic: 0,
        abnormalCxr: 0,
        tbDiagnosed: 0,
      };
      rg.screened += r.screened;
      rg.symptomatic += r.symptomatic;
      rg.abnormalCxr += r.abnormalCxr;
      rg.tbDiagnosed += r.tbDiagnosed;
      entry.riskGroups.set(r.riskGroupName, rg);
    }
  }

  return Array.from(map.values())
    .map((h) => {
      const topRiskGroups = Array.from(h.riskGroups.values())
        .sort((a, b) => b.screened - a.screened)
        .slice(0, 4);

      return {
        hospitalId: h.hospitalId,
        hospitalName: h.hospitalName,
        district: h.district,
        screened: h.screened,
        cxrDone: h.cxrDone,
        symptomatic: h.symptomatic,
        symptomaticPct:
          h.screened > 0
            ? Number(((h.symptomatic / h.screened) * 100).toFixed(1))
            : 0,
        abnormalCxr: h.abnormalCxr,
        abnormalCxrPct:
          h.screened > 0
            ? Number(((h.abnormalCxr / h.screened) * 100).toFixed(1))
            : 0,
        tbDiagnosed: h.tbDiagnosed,
        tbRatePer1000:
          h.screened > 0
            ? Number(((h.tbDiagnosed / h.screened) * 1000).toFixed(1))
            : 0,
        tbPct:
          h.screened > 0
            ? Number(((h.tbDiagnosed / h.screened) * 100).toFixed(2))
            : 0,
        afbPositive: h.afbPositive,
        xpertPositive: h.xpertPositive,
        prevScreened5Nov: h.prevScreened5Nov,
        deltaScreened: h.screened - h.prevScreened5Nov,
        deltaAbnormalCxr: h.abnormalCxr - h.prevAbnormalCxr5Nov,
        deltaTb: h.tbDiagnosed - h.prevTb5Nov,
        topRiskGroups,
      };
    })
    .sort((a, b) => b.screened - a.screened);
}

/**
 * Relational GROUP BY riskGroupName aggregation.
 */
export function aggregateByRiskGroup(
  records: HospitalRiskRecord[]
): RiskGroupSummaryRow[] {
  const map = new Map<
    string,
    {
      riskGroupId: string;
      riskGroupName: string;
      riskCategory: HospitalRiskRecord['riskCategory'];
      isNineRiskGroup: boolean;
      screened: number;
      symptomatic: number;
      abnormalCxr: number;
      tbDiagnosed: number;
      prevScreened5Nov: number;
    }
  >();

  for (const r of records) {
    let entry = map.get(r.riskGroupName);
    if (!entry) {
      entry = {
        riskGroupId: r.riskGroupId,
        riskGroupName: r.riskGroupName,
        riskCategory: r.riskCategory,
        isNineRiskGroup: r.isNineRiskGroup,
        screened: 0,
        symptomatic: 0,
        abnormalCxr: 0,
        tbDiagnosed: 0,
        prevScreened5Nov: 0,
      };
      map.set(r.riskGroupName, entry);
    }

    entry.screened += r.screened;
    entry.symptomatic += r.symptomatic;
    entry.abnormalCxr += r.abnormalCxr;
    entry.tbDiagnosed += r.tbDiagnosed;
    entry.prevScreened5Nov += r.prevScreened5Nov;
  }

  return Array.from(map.values())
    .map((rg) => ({
      riskGroupId: rg.riskGroupId,
      riskGroupName: rg.riskGroupName,
      riskCategory: rg.riskCategory,
      isNineRiskGroup: rg.isNineRiskGroup,
      screened: rg.screened,
      symptomatic: rg.symptomatic,
      symptomaticPct:
        rg.screened > 0
          ? Number(((rg.symptomatic / rg.screened) * 100).toFixed(1))
          : 0,
      abnormalCxr: rg.abnormalCxr,
      abnormalCxrPct:
        rg.screened > 0
          ? Number(((rg.abnormalCxr / rg.screened) * 100).toFixed(1))
          : 0,
      tbDiagnosed: rg.tbDiagnosed,
      tbRatePer1000:
        rg.screened > 0
          ? Number(((rg.tbDiagnosed / rg.screened) * 1000).toFixed(1))
          : 0,
      deltaScreened: rg.screened - rg.prevScreened5Nov,
    }))
    .sort((a, b) => b.screened - a.screened);
}

export interface SqlExecutionResult {
  columns: string[];
  rows: Record<string, string | number>[];
  executionTimeMs: number;
  sqlExecuted: string;
  rowCount: number;
  error?: string;
}

/**
 * Executes structured SQL SELECT queries against the relational screening_records table.
 * Supports SELECT, WHERE, GROUP BY (hospital_name, risk_group_name, risk_category, district),
 * ORDER BY, and LIMIT for instant analytical exploration.
 */
export function runRelationalSqlQuery(
  records: HospitalRiskRecord[],
  rawSql: string
): SqlExecutionResult {
  const start = performance.now();
  const normalized = rawSql.trim().replace(/;+$/, '');

  if (!/^select\s+/i.test(normalized)) {
    return {
      columns: [],
      rows: [],
      executionTimeMs: 0,
      sqlExecuted: rawSql,
      rowCount: 0,
      error: 'รองรับเฉพาะคำสั่ง SELECT สำหรับสืบค้นและวิเคราะห์ข้อมูลเท่านั้น',
    };
  }

  let working = [...records];

  // Parse optional WHERE clause
  const whereMatch = normalized.match(
    /\bwhere\b([\s\S]+?)(?=\bgroup\s+by\b|\border\s+by\b|\blimit\b|$)/i
  );
  if (whereMatch) {
    const condStr = whereMatch[1].trim();
    const parts = condStr.split(/\s+and\s+/i);
    for (const part of parts) {
      const eqMatch = part.match(
        /^\s*([a-zA-Z_]+)\s*=\s*['"]([^'"]+)['"]\s*$/i
      );
      const likeMatch = part.match(
        /^\s*([a-zA-Z_]+)\s+like\s+['"]%?([^'%"]+)%?['"]\s*$/i
      );
      const gtMatch = part.match(/^\s*([a-zA-Z_]+)\s*(>=|>|<=|<)\s*(\d+(?:\.\d+)?)\s*$/i);

      if (eqMatch) {
        const [, col, val] = eqMatch;
        working = working.filter((r) => getFieldValue(r, col) === val);
      } else if (likeMatch) {
        const [, col, val] = likeMatch;
        const vLower = val.toLowerCase();
        working = working.filter((r) =>
          String(getFieldValue(r, col)).toLowerCase().includes(vLower)
        );
      } else if (gtMatch) {
        const [, col, op, numStr] = gtMatch;
        const num = Number(numStr);
        working = working.filter((r) => {
          const v = Number(getFieldValue(r, col));
          if (op === '>') return v > num;
          if (op === '>=') return v >= num;
          if (op === '<') return v < num;
          return v <= num;
        });
      }
    }
  }

  // Parse optional GROUP BY
  const groupMatch = normalized.match(
    /\bgroup\s+by\b([\s\S]+?)(?=\border\s+by\b|\blimit\b|$)/i
  );

  let resultRows: Record<string, string | number>[] = [];

  if (groupMatch) {
    const groupCol = groupMatch[1].trim().split(',')[0].trim();
    const grouped = new Map<string, HospitalRiskRecord[]>();
    for (const r of working) {
      const key = String(getFieldValue(r, groupCol));
      const arr = grouped.get(key) ?? [];
      arr.push(r);
      grouped.set(key, arr);
    }

    resultRows = Array.from(grouped.entries()).map(([key, items]) => {
      const screened = items.reduce((s, x) => s + x.screened, 0);
      const symptomatic = items.reduce((s, x) => s + x.symptomatic, 0);
      const abnormalCxr = items.reduce((s, x) => s + x.abnormalCxr, 0);
      const tbDiagnosed = items.reduce((s, x) => s + x.tbDiagnosed, 0);
      const afbPositive = items.reduce((s, x) => s + x.afbPositive, 0);
      const xpertPositive = items.reduce((s, x) => s + x.xpertPositive, 0);
      const prevScreened = items.reduce((s, x) => s + x.prevScreened5Nov, 0);

      return {
        [groupCol]: key,
        total_screened: screened,
        delta_vs_prev: screened - prevScreened,
        symptomatic,
        abnormal_cxr: abnormalCxr,
        abnormal_cxr_pct:
          screened > 0 ? Number(((abnormalCxr / screened) * 100).toFixed(1)) : 0,
        tb_diagnosed: tbDiagnosed,
        tb_per_1000:
          screened > 0 ? Number(((tbDiagnosed / screened) * 1000).toFixed(1)) : 0,
        afb_positive: afbPositive,
        xpert_positive: xpertPositive,
      };
    });
  } else {
    resultRows = working.map((r) => ({
      hospital_name: r.hospitalName,
      district: r.district,
      risk_group_name: r.riskGroupName,
      risk_category: r.riskCategory,
      screened: r.screened,
      symptomatic: r.symptomatic,
      abnormal_cxr: r.abnormalCxr,
      tb_diagnosed: r.tbDiagnosed,
      afb_positive: r.afbPositive,
      xpert_positive: r.xpertPositive,
      delta_vs_prev: r.screened - r.prevScreened5Nov,
    }));
  }

  // Parse optional ORDER BY
  const orderMatch = normalized.match(/\border\s+by\b([\s\S]+?)(?=\blimit\b|$)/i);
  if (orderMatch) {
    const orderParts = orderMatch[1].trim().split(/\s+/);
    const orderCol = orderParts[0];
    const dir = (orderParts[1] || 'ASC').toUpperCase() === 'DESC' ? -1 : 1;
    resultRows.sort((a, b) => {
      const av = a[orderCol] ?? 0;
      const bv = b[orderCol] ?? 0;
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * dir;
      }
      return String(av).localeCompare(String(bv), 'th') * dir;
    });
  }

  // Parse optional LIMIT
  const limitMatch = normalized.match(/\blimit\s+(\d+)/i);
  if (limitMatch) {
    resultRows = resultRows.slice(0, Number(limitMatch[1]));
  }

  const columns = resultRows.length > 0 ? Object.keys(resultRows[0]) : [];
  const elapsed = Number((performance.now() - start).toFixed(2));

  return {
    columns,
    rows: resultRows,
    executionTimeMs: elapsed,
    sqlExecuted: normalized,
    rowCount: resultRows.length,
  };
}

function getFieldValue(r: HospitalRiskRecord, col: string): string | number {
  switch (col.toLowerCase()) {
    case 'hospital_name':
    case 'hospitalname':
      return r.hospitalName;
    case 'district':
      return r.district;
    case 'risk_group_name':
    case 'riskgroupname':
      return r.riskGroupName;
    case 'risk_category':
    case 'riskcategory':
      return r.riskCategory;
    case 'screened':
      return r.screened;
    case 'symptomatic':
      return r.symptomatic;
    case 'abnormal_cxr':
    case 'abnormalcxr':
      return r.abnormalCxr;
    case 'tb_diagnosed':
    case 'tbdiagnosed':
      return r.tbDiagnosed;
    case 'afb_positive':
      return r.afbPositive;
    case 'xpert_positive':
      return r.xpertPositive;
    default:
      return r.hospitalName;
  }
}
