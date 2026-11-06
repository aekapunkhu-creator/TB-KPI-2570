import * as XLSX from 'xlsx';
import {
  DatasetSnapshot,
  HospitalRiskRecord,
  RiskCategory,
} from '../types/tb';
import {
  FY2570_INDICATORS_SEED,
  MONTHLY_TRENDS_12M_SEED,
  PHON_NA_KAEO_DAILY_TRENDS,
  QUARTERLY_TARGETS_2570_SEED,
  RISK_GROUP_TARGETS_2570_SEED,
} from '../data/seedData';

export interface ExcelColumnMapping {
  hospitalName: string;
  district?: string;
  riskGroupName: string;
  screened: string;
  symptomatic?: string;
  abnormalCxr?: string;
  tbDiagnosed?: string;
  afbPositive?: string;
  xpertPositive?: string;
  prevScreened?: string;
}

export interface ParsedExcelPreview {
  fileName: string;
  sheetNames: string[];
  selectedSheet: string;
  headers: string[];
  rawRows: Record<string, unknown>[];
  suggestedMapping: ExcelColumnMapping;
}

function classifyRiskGroup(name: string): {
  category: RiskCategory;
  isNineRiskGroup: boolean;
} {
  const lower = name.toLowerCase();
  if (
    lower.includes('เบาหวาน') ||
    lower.includes('ไตเรื้อรัง') ||
    lower.includes('ckd') ||
    lower.includes('dm')
  ) {
    return { category: 'chronic_dm_ckd', isNineRiskGroup: true };
  }
  if (
    lower.includes('ไม่มีความเสี่ยง') ||
    lower.includes('นอกเกณฑ์') ||
    lower.includes('นอกกลุ่ม') ||
    lower.includes('สูบบุหรี่') ||
    lower.includes('ความดัน') ||
    lower.includes('walk-in') ||
    lower.includes('พระภิกษุ') ||
    lower.includes('ชุมชนแออัด')
  ) {
    return { category: 'non_risk', isNineRiskGroup: false };
  }
  const isNine =
    lower.includes('copd') ||
    lower.includes('ปอดอุดกั้น') ||
    lower.includes('ผู้สูงอายุ') ||
    lower.includes('สัมผัส') ||
    lower.includes('สุรา') ||
    lower.includes('ยาเสพติด') ||
    lower.includes('ติดเตียง') ||
    lower.includes('เคยป่วย') ||
    lower.includes('เอชไอวี') ||
    lower.includes('b24') ||
    lower.includes('hiv') ||
    lower.includes('บุคลากร');
  return { category: 'high_risk_other', isNineRiskGroup: isNine };
}

function findBestHeader(headers: string[], candidates: string[]): string {
  for (const cand of candidates) {
    const exact = headers.find(
      (h) => h.trim().toLowerCase() === cand.toLowerCase()
    );
    if (exact) return exact;
  }
  for (const cand of candidates) {
    const partial = headers.find((h) =>
      h.trim().toLowerCase().includes(cand.toLowerCase())
    );
    if (partial) return partial;
  }
  return '';
}

export function inspectExcelBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  preferredSheet?: string
): ParsedExcelPreview {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;
  const selectedSheet =
    preferredSheet && sheetNames.includes(preferredSheet)
      ? preferredSheet
      : sheetNames[0];

  const sheet = workbook.Sheets[selectedSheet];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
  });

  const headerSet = new Set<string>();
  for (const row of rawRows.slice(0, 20)) {
    for (const k of Object.keys(row)) {
      if (k && !k.startsWith('__EMPTY')) {
        headerSet.add(k);
      }
    }
  }
  const headers = Array.from(headerSet);

  const suggestedMapping: ExcelColumnMapping = {
    hospitalName:
      findBestHeader(headers, [
        'หน่วยบริการ',
        'โรงพยาบาล',
        'รพ.',
        'hospital',
        'facility',
        'hcode',
      ]) || headers[0] || '',
    district: findBestHeader(headers, ['อำเภอ', 'district', 'อ.']),
    riskGroupName:
      findBestHeader(headers, [
        'กลุ่มเสี่ยง',
        'ประเภทกลุ่มเสี่ยง',
        'risk',
        'risk_group',
        'group',
      ]) || headers[1] || '',
    screened:
      findBestHeader(headers, [
        'คัดกรองทั้งหมด',
        'คัดกรอง',
        'จำนวนคัดกรอง',
        'screened',
        'total',
      ]) || headers[2] || '',
    symptomatic: findBestHeader(headers, [
      'มีอาการ',
      'อาการสงสัย',
      'symptomatic',
      'symptom',
    ]),
    abnormalCxr: findBestHeader(headers, [
      'cxr ผิดปกติ',
      'cxrผิดปกติ',
      'ผิดปกติ',
      'abnormal_cxr',
      'abnormal',
    ]),
    tbDiagnosed: findBestHeader(headers, [
      'วินิจฉัยเป็น tb',
      'วินิจฉัย tb',
      'พบ tb',
      'tb',
      'diagnosed',
    ]),
    afbPositive: findBestHeader(headers, ['afb+', 'afb', 'เสมหะ']),
    xpertPositive: findBestHeader(headers, ['xpert', 'molecular', 'pcr']),
    prevScreened: findBestHeader(headers, [
      'คัดกรองเดิม',
      '5 พ.ย.',
      'prev_screened',
      'previous',
    ]),
  };

  return {
    fileName,
    sheetNames,
    selectedSheet,
    headers,
    rawRows,
    suggestedMapping,
  };
}

function toInt(val: unknown): number {
  if (typeof val === 'number') return Math.max(0, Math.round(val));
  const cleaned = String(val ?? '')
    .replace(/,/g, '')
    .trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

export function buildDatasetFromExcelRows(
  preview: ParsedExcelPreview,
  mapping: ExcelColumnMapping,
  reportDateLabel: string,
  previousSnapshot?: DatasetSnapshot
): DatasetSnapshot {
  const prevLookup = new Map<string, HospitalRiskRecord>();
  if (previousSnapshot) {
    for (const r of previousSnapshot.records) {
      prevLookup.set(`${r.hospitalName}::${r.riskGroupName}`, r);
    }
  }

  const hospitalIdMap = new Map<string, string>();
  const riskGroupIdMap = new Map<string, string>();
  const records: HospitalRiskRecord[] = [];

  preview.rawRows.forEach((row, idx) => {
    const hospitalName = String(row[mapping.hospitalName] ?? '').trim();
    const riskGroupName = String(row[mapping.riskGroupName] ?? '').trim();
    if (!hospitalName || !riskGroupName) return;
    if (
      hospitalName.includes('รวม') ||
      hospitalName.toLowerCase() === 'total' ||
      riskGroupName.includes('รวมทั้งหมด')
    ) {
      return;
    }

    if (!hospitalIdMap.has(hospitalName)) {
      hospitalIdMap.set(
        hospitalName,
        `h-${String(hospitalIdMap.size + 1).padStart(2, '0')}`
      );
    }
    if (!riskGroupIdMap.has(riskGroupName)) {
      riskGroupIdMap.set(
        riskGroupName,
        `rg-${String(riskGroupIdMap.size + 1).padStart(2, '0')}`
      );
    }

    const district =
      (mapping.district && String(row[mapping.district] ?? '').trim()) ||
      hospitalName.replace(/^รพ\./, '').trim();
    const screened = toInt(row[mapping.screened]);
    const symptomatic = mapping.symptomatic ? toInt(row[mapping.symptomatic]) : 0;
    const abnormalCxr = mapping.abnormalCxr ? toInt(row[mapping.abnormalCxr]) : 0;
    const tbDiagnosed = mapping.tbDiagnosed ? toInt(row[mapping.tbDiagnosed]) : 0;
    const afbPositive = mapping.afbPositive ? toInt(row[mapping.afbPositive]) : 0;
    const xpertPositive = mapping.xpertPositive
      ? toInt(row[mapping.xpertPositive])
      : 0;

    const prevMatch = prevLookup.get(`${hospitalName}::${riskGroupName}`);
    const prevScreened5Nov = mapping.prevScreened
      ? toInt(row[mapping.prevScreened])
      : prevMatch
      ? prevMatch.screened
      : screened;

    const { category, isNineRiskGroup } = classifyRiskGroup(riskGroupName);

    records.push({
      id: `imp-${idx + 1}`,
      hospitalId: hospitalIdMap.get(hospitalName)!,
      hospitalName,
      district,
      riskGroupId: riskGroupIdMap.get(riskGroupName)!,
      riskGroupName,
      riskCategory: category,
      isNineRiskGroup,
      screened,
      cxrDone: screened,
      symptomatic,
      abnormalCxr,
      tbDiagnosed,
      afbPositive,
      xpertPositive,
      ltbiPositive: 0,
      prevScreened5Nov,
      prevAbnormalCxr5Nov: prevMatch ? prevMatch.abnormalCxr : abnormalCxr,
      prevTb5Nov: prevMatch ? prevMatch.tbDiagnosed : tbDiagnosed,
    });
  });

  const nowIso = new Date().toISOString();
  return {
    id: `dataset-${Date.now()}`,
    name: `รายงานผลการคัดกรองวัณโรค (${preview.fileName})`,
    reportDateLabel: reportDateLabel.trim() || 'อัปเดตล่าสุด',
    comparisonDateLabel: previousSnapshot?.reportDateLabel || 'ก่อนหน้า',
    uploadedAt: nowIso,
    fileName: preview.fileName,
    records,
    dailyTrends: previousSnapshot?.dailyTrends || PHON_NA_KAEO_DAILY_TRENDS,
    monthlyTrends: previousSnapshot?.monthlyTrends || MONTHLY_TRENDS_12M_SEED,
    fy2570Indicators:
      previousSnapshot?.fy2570Indicators || FY2570_INDICATORS_SEED,
    riskGroupTargets:
      previousSnapshot?.riskGroupTargets || RISK_GROUP_TARGETS_2570_SEED,
    quarterlyTargets:
      previousSnapshot?.quarterlyTargets || QUARTERLY_TARGETS_2570_SEED,
  };
}

/**
 * Generates and downloads a real multi-sheet .xlsx Excel workbook from the current dataset
 * so users can inspect, modify, and re-import ExportACF data.
 */
export function downloadSampleExcelWorkbook(snapshot: DatasetSnapshot): void {
  const wb = XLSX.utils.book_new();

  const mainRows = snapshot.records.map((r) => ({
    หน่วยบริการ: r.hospitalName,
    อำเภอ: r.district,
    กลุ่มเสี่ยง: r.riskGroupName,
    คัดกรองทั้งหมด: r.screened,
    มีอาการ: r.symptomatic,
    'CXR ผิดปกติ': r.abnormalCxr,
    'วินิจฉัยเป็น TB': r.tbDiagnosed,
    'AFB+': r.afbPositive,
    Xpert: r.xpertPositive,
    'คัดกรองเดิม (5 พ.ย.)': r.prevScreened5Nov,
  }));

  const wsMain = XLSX.utils.json_to_sheet(mainRows);
  XLSX.utils.book_append_sheet(wb, wsMain, 'ExportACF_Detail');

  const monthlyRows = snapshot.monthlyTrends.map((m) => ({
    เดือน: m.monthLabel,
    เดือนเต็ม: m.fullMonthName,
    คัดกรองรายเดือน: m.screened,
    เป้าหมายรายเดือน: m.targetMonthly,
    ตรวจCXR: m.cxrDone,
    'CXR ผิดปกติ': m.abnormalCxr,
    พบTB: m.tbDiagnosed,
    หมายเหตุภาระงาน: m.workloadNote ?? '',
  }));
  const wsMonthly = XLSX.utils.json_to_sheet(monthlyRows);
  XLSX.utils.book_append_sheet(wb, wsMonthly, 'Monthly_Trend_12M');

  const trendRows = snapshot.dailyTrends.map((t) => ({
    วันที่: t.dateLabel,
    คัดกรองสะสม: t.cumulativeScreened,
    คัดกรองรายวัน: t.dailyScreened,
    'CXR ผิดปกติสะสม': t.cumulativeAbnormalCxr,
    'TB สะสม': t.cumulativeTb,
    หมายเหตุ: t.milestoneNote ?? '',
  }));
  const wsTrend = XLSX.utils.json_to_sheet(trendRows);
  XLSX.utils.book_append_sheet(wb, wsTrend, 'Daily_Trend_PhonNaKaeo');

  const targetRows = snapshot.riskGroupTargets.map((tg) => ({
    กลุ่มเสี่ยง: tg.riskGroupName,
    'เป้าหมายปี 2570': tg.target2570,
    คัดกรองแล้ว: tg.screenedAcf,
    'ความครอบคลุม (%)': tg.coveragePct,
  }));
  const wsTarget = XLSX.utils.json_to_sheet(targetRows);
  XLSX.utils.book_append_sheet(wb, wsTarget, 'Targets_FY2570');

  XLSX.writeFile(wb, `ExportACF_SakonNakhon_${Date.now()}.xlsx`);
}
