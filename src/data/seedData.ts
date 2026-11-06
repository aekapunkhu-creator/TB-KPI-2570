import {
  AlertThresholdConfig,
  DailyTrendPoint,
  DatasetSnapshot,
  Fy2570Indicator,
  HospitalRiskRecord,
  MonthlyTrendPoint,
  QuarterlyTargetPoint,
  RiskCategory,
  RiskGroupTarget2570,
} from '../types/tb';

export const DEFAULT_POPULATION_PHON_NA_KAEO = 36955;

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholdConfig = {
  minScreeningDeltaAlert: 30,
  minTbRatePer1000Alert: 5.0,
  minAbnormalCxrPctAlert: 10.0,
  maxUnconfirmedCxrAlert: 10,
  minSymptomRecordPctAlert: 5.0,
};

interface RiskGroupMeta {
  id: string;
  name: string;
  category: RiskCategory;
  isNineRiskGroup: boolean;
}

export const RISK_GROUPS_26: RiskGroupMeta[] = [
  { id: 'rg-01', name: 'เบาหวานที่คุมระดับน้ำตาลไม่ได้', category: 'chronic_dm_ckd', isNineRiskGroup: true },
  { id: 'rg-02', name: 'ผู้สูงอายุ ≥65 ปี + โรคเบาหวาน', category: 'chronic_dm_ckd', isNineRiskGroup: true },
  { id: 'rg-03', name: 'ผู้ป่วยโรคไตเรื้อรัง (CKD)', category: 'chronic_dm_ckd', isNineRiskGroup: true },
  { id: 'rg-04', name: 'ผู้สัมผัสผู้ป่วยวัณโรคร่วมบ้าน / ใกล้ชิด', category: 'high_risk_other', isNineRiskGroup: true },
  { id: 'rg-05', name: 'ผู้สูบบุหรี่จัด / ประวัติสูบบุหรี่', category: 'non_risk', isNineRiskGroup: false },
  { id: 'rg-06', name: 'ผู้สูงอายุ ≥65 ปี + ความดันโลหิตสูง', category: 'non_risk', isNineRiskGroup: false },
  { id: 'rg-07', name: 'ผู้ติดสุราเรื้อรัง / สารเสพติด', category: 'high_risk_other', isNineRiskGroup: true },
  { id: 'rg-08', name: 'ผู้ป่วยติดเตียง / ทุพพลภาพ', category: 'high_risk_other', isNineRiskGroup: true },
  { id: 'rg-09', name: 'ผู้ที่เคยป่วยเป็นวัณโรคมาก่อน', category: 'high_risk_other', isNineRiskGroup: true },
  { id: 'rg-10', name: 'ผู้ติดเชื้อเอชไอวี / ผู้ป่วย B24', category: 'high_risk_other', isNineRiskGroup: true },
  { id: 'rg-11', name: 'บุคลากรสาธารณสุข', category: 'high_risk_other', isNineRiskGroup: true },
  { id: 'rg-12', name: 'ผู้ป่วยโรคปอดอุดกั้นเรื้อรัง (COPD)', category: 'high_risk_other', isNineRiskGroup: true },
  { id: 'rg-13', name: 'ผู้ป่วยโรคหืด (Asthma)', category: 'high_risk_other', isNineRiskGroup: false },
  { id: 'rg-14', name: 'ผู้ป่วยโรคหัวใจและหลอดเลือด', category: 'high_risk_other', isNineRiskGroup: false },
  { id: 'rg-15', name: 'ผู้ป่วยโรคหลอดเลือดสมอง (Stroke)', category: 'high_risk_other', isNineRiskGroup: false },
  { id: 'rg-16', name: 'ผู้ป่วยจิตเวชเรื้อรัง', category: 'high_risk_other', isNineRiskGroup: false },
  { id: 'rg-17', name: 'ผู้ป่วยโรคมะเร็ง / กดภูมิคุ้มกัน', category: 'high_risk_other', isNineRiskGroup: false },
  { id: 'rg-18', name: 'ผู้ป่วยโรคตับเรื้อรัง', category: 'high_risk_other', isNineRiskGroup: false },
  { id: 'rg-19', name: 'ผู้ป่วยโรคข้ออักเสบรูมาตอยด์ / SLE', category: 'high_risk_other', isNineRiskGroup: false },
  { id: 'rg-20', name: 'แรงงานต่างด้าว / ประชากรข้ามชาติ', category: 'high_risk_other', isNineRiskGroup: false },
  { id: 'rg-21', name: 'ผู้พ้นโทษ / ผู้ต้องขัง', category: 'high_risk_other', isNineRiskGroup: false },
  { id: 'rg-22', name: 'พระภิกษุ / นักบวช', category: 'non_risk', isNineRiskGroup: false },
  { id: 'rg-23', name: 'กลุ่มเปราะบาง / ชุมชนแออัด', category: 'non_risk', isNineRiskGroup: false },
  { id: 'rg-24', name: 'ผู้สูงอายุ ≥65 ปี (ทั่วไป)', category: 'high_risk_other', isNineRiskGroup: true },
  { id: 'rg-25', name: 'ผู้มีอาการสงสัยวัณโรคทั่วไป (Walk-in)', category: 'non_risk', isNineRiskGroup: false },
  { id: 'rg-26', name: 'กลุ่มไม่มีความเสี่ยง (นอกเกณฑ์)', category: 'non_risk', isNineRiskGroup: false },
];

const rgMap = new Map(RISK_GROUPS_26.map((g) => [g.id, g]));

function rec(
  id: string,
  hospitalId: string,
  hospitalName: string,
  district: string,
  riskGroupId: string,
  screened: number,
  symptomatic: number,
  abnormalCxr: number,
  tbDiagnosed: number,
  prevScreened5Nov: number,
  opts?: {
    cxrDone?: number;
    afbPositive?: number;
    xpertPositive?: number;
    prevAbnormalCxr5Nov?: number;
    prevTb5Nov?: number;
  }
): HospitalRiskRecord {
  const rg = rgMap.get(riskGroupId)!;
  return {
    id,
    hospitalId,
    hospitalName,
    district,
    riskGroupId: rg.id,
    riskGroupName: rg.name,
    riskCategory: rg.category,
    isNineRiskGroup: rg.isNineRiskGroup,
    screened,
    cxrDone: opts?.cxrDone ?? screened,
    symptomatic,
    abnormalCxr,
    tbDiagnosed,
    afbPositive: opts?.afbPositive ?? 0,
    xpertPositive: opts?.xpertPositive ?? 0,
    ltbiPositive: 0,
    prevScreened5Nov,
    prevAbnormalCxr5Nov: opts?.prevAbnormalCxr5Nov ?? abnormalCxr,
    prevTb5Nov: opts?.prevTb5Nov ?? tbDiagnosed,
  };
}

/**
 * Complete 18-hospital x 26-risk-group dataset matching ExportACF 6 Nov 2569 (5,652 screened,
 * 1,094 symptomatic [19.4%], 150 abnormal CXR [2.7%], 22 TB [0.39%], delta +366 vs 5 Nov).
 */
export const SAKON_NAKHON_SEED_RECORDS: HospitalRiskRecord[] = [
  // 1. รพ.โพนนาแก้ว (830 screened [+100 vs 730], 23 symptomatic [2.8%], 40 abnormal CXR [4.8%, +1 vs 39], 7 TB [0.84%], 2 AFB+)
  rec('pnk-01', 'h-01', 'รพ.โพนนาแก้ว', 'โพนนาแก้ว', 'rg-01', 568, 9, 11, 0, 500),
  rec('pnk-02', 'h-01', 'รพ.โพนนาแก้ว', 'โพนนาแก้ว', 'rg-02', 115, 4, 3, 1, 100),
  rec('pnk-03', 'h-01', 'รพ.โพนนาแก้ว', 'โพนนาแก้ว', 'rg-03', 44, 2, 2, 1, 38),
  rec('pnk-04', 'h-01', 'รพ.โพนนาแก้ว', 'โพนนาแก้ว', 'rg-12', 28, 2, 1, 0, 24),
  rec('pnk-05', 'h-01', 'รพ.โพนนาแก้ว', 'โพนนาแก้ว', 'rg-10', 14, 0, 0, 0, 12),
  rec('pnk-06', 'h-01', 'รพ.โพนนาแก้ว', 'โพนนาแก้ว', 'rg-08', 11, 0, 0, 0, 10),
  rec('pnk-07', 'h-01', 'รพ.โพนนาแก้ว', 'โพนนาแก้ว', 'rg-04', 9, 1, 1, 1, 8),
  rec('pnk-08', 'h-01', 'รพ.โพนนาแก้ว', 'โพนนาแก้ว', 'rg-09', 8, 0, 0, 0, 7),
  rec('pnk-09', 'h-01', 'รพ.โพนนาแก้ว', 'โพนนาแก้ว', 'rg-06', 8, 0, 5, 0, 7),
  rec('pnk-10', 'h-01', 'รพ.โพนนาแก้ว', 'โพนนาแก้ว', 'rg-25', 7, 0, 3, 0, 6),
  rec('pnk-11', 'h-01', 'รพ.โพนนาแก้ว', 'โพนนาแก้ว', 'rg-26', 6, 2, 6, 2, 6, {
    afbPositive: 2,
    prevAbnormalCxr5Nov: 5,
  }),
  rec('pnk-12', 'h-01', 'รพ.โพนนาแก้ว', 'โพนนาแก้ว', 'rg-24', 5, 1, 5, 0, 5),
  rec('pnk-13', 'h-01', 'รพ.โพนนาแก้ว', 'โพนนาแก้ว', 'rg-07', 4, 1, 1, 1, 4),
  rec('pnk-14', 'h-01', 'รพ.โพนนาแก้ว', 'โพนนาแก้ว', 'rg-05', 3, 1, 2, 1, 3),

  // 2. รพ.เต่างอย (727 screened [+0], 706 CXR done, 162 symptomatic, 0 abnormal CXR, 2 TB)
  rec('tng-01', 'h-02', 'รพ.เต่างอย', 'เต่างอย', 'rg-01', 275, 55, 0, 1, 275, { cxrDone: 265 }),
  rec('tng-02', 'h-02', 'รพ.เต่างอย', 'เต่างอย', 'rg-02', 185, 42, 0, 0, 185, { cxrDone: 180 }),
  rec('tng-03', 'h-02', 'รพ.เต่างอย', 'เต่างอย', 'rg-03', 98, 24, 0, 0, 98, { cxrDone: 95 }),
  rec('tng-04', 'h-02', 'รพ.เต่างอย', 'เต่างอย', 'rg-04', 54, 15, 0, 1, 54, { cxrDone: 52 }),
  rec('tng-05', 'h-02', 'รพ.เต่างอย', 'เต่างอย', 'rg-05', 85, 13, 0, 0, 85, { cxrDone: 84 }),
  rec('tng-06', 'h-02', 'รพ.เต่างอย', 'เต่างอย', 'rg-06', 30, 13, 0, 0, 30, { cxrDone: 30 }),

  // 3. รพ.วานรนิวาส (660 screened [+0], 158 symptomatic, 24 abnormal CXR, 4 TB)
  rec('wnn-01', 'h-03', 'รพ.วานรนิวาส', 'วานรนิวาส', 'rg-01', 225, 46, 2, 0, 225),
  rec('wnn-02', 'h-03', 'รพ.วานรนิวาส', 'วานรนิวาส', 'rg-02', 142, 34, 1, 0, 142),
  rec('wnn-03', 'h-03', 'รพ.วานรนิวาส', 'วานรนิวาส', 'rg-03', 84, 21, 1, 0, 84),
  rec('wnn-04', 'h-03', 'รพ.วานรนิวาส', 'วานรนิวาส', 'rg-12', 10, 11, 10, 4, 10),
  rec('wnn-05', 'h-03', 'รพ.วานรนิวาส', 'วานรนิวาส', 'rg-04', 58, 16, 4, 0, 58),
  rec('wnn-06', 'h-03', 'รพ.วานรนิวาส', 'วานรนิวาส', 'rg-07', 42, 10, 4, 0, 42),
  rec('wnn-07', 'h-03', 'รพ.วานรนิวาส', 'วานรนิวาส', 'rg-24', 5, 3, 2, 0, 5),
  rec('wnn-08', 'h-03', 'รพ.วานรนิวาส', 'วานรนิวาส', 'rg-13', 94, 17, 0, 0, 94),

  // 4. รพ.พระอาจารย์ฝั้น อาจาโร (558 screened [+48 vs 510], 0 symptomatic [unrecorded], 14 abnormal CXR, 2 TB)
  rec('paf-01', 'h-04', 'รพ.พระอาจารย์ฝั้น อาจาโร', 'พรรณานิคม', 'rg-01', 198, 0, 2, 0, 174),
  rec('paf-02', 'h-04', 'รพ.พระอาจารย์ฝั้น อาจาโร', 'พรรณานิคม', 'rg-02', 124, 0, 1, 0, 112),
  rec('paf-03', 'h-04', 'รพ.พระอาจารย์ฝั้น อาจาโร', 'พรรณานิคม', 'rg-03', 68, 0, 1, 0, 62),
  rec('paf-04', 'h-04', 'รพ.พระอาจารย์ฝั้น อาจาโร', 'พรรณานิคม', 'rg-12', 10, 0, 10, 2, 10),
  rec('paf-05', 'h-04', 'รพ.พระอาจารย์ฝั้น อาจาโร', 'พรรณานิคม', 'rg-05', 96, 0, 0, 0, 92),
  rec('paf-06', 'h-04', 'รพ.พระอาจารย์ฝั้น อาจาโร', 'พรรณานิคม', 'rg-06', 36, 0, 0, 0, 34),
  rec('paf-07', 'h-04', 'รพ.พระอาจารย์ฝั้น อาจาโร', 'พรรณานิคม', 'rg-08', 26, 0, 0, 0, 26),

  // 5. รพ.สมเด็จพระยุพราชสว่างแดนดิน (531 screened [+11 vs 520], 0 symptomatic [unrecorded], 11 abnormal CXR, 1 TB)
  rec('swd-01', 'h-05', 'รพ.สมเด็จพระยุพราชสว่างแดนดิน', 'สว่างแดนดิน', 'rg-01', 188, 0, 1, 0, 182),
  rec('swd-02', 'h-05', 'รพ.สมเด็จพระยุพราชสว่างแดนดิน', 'สว่างแดนดิน', 'rg-02', 118, 0, 1, 0, 115),
  rec('swd-03', 'h-05', 'รพ.สมเด็จพระยุพราชสว่างแดนดิน', 'สว่างแดนดิน', 'rg-03', 64, 0, 1, 0, 62),
  rec('swd-04', 'h-05', 'รพ.สมเด็จพระยุพราชสว่างแดนดิน', 'สว่างแดนดิน', 'rg-24', 10, 0, 2, 1, 10),
  rec('swd-05', 'h-05', 'รพ.สมเด็จพระยุพราชสว่างแดนดิน', 'สว่างแดนดิน', 'rg-04', 44, 0, 3, 0, 44),
  rec('swd-06', 'h-05', 'รพ.สมเด็จพระยุพราชสว่างแดนดิน', 'สว่างแดนดิน', 'rg-10', 22, 0, 2, 0, 22),
  rec('swd-07', 'h-05', 'รพ.สมเด็จพระยุพราชสว่างแดนดิน', 'สว่างแดนดิน', 'rg-11', 35, 0, 1, 0, 35),
  rec('swd-08', 'h-05', 'รพ.สมเด็จพระยุพราชสว่างแดนดิน', 'สว่างแดนดิน', 'rg-14', 50, 0, 0, 0, 50),

  // 6. รพ.สกลนคร (445 screened [+5], 118 symptomatic, 12 abnormal CXR, 2 TB)
  rec('skn-01', 'h-06', 'รพ.สกลนคร (รพศ.)', 'เมืองสกลนคร', 'rg-01', 130, 28, 1, 0, 127),
  rec('skn-02', 'h-06', 'รพ.สกลนคร (รพศ.)', 'เมืองสกลนคร', 'rg-02', 92, 22, 0, 0, 90),
  rec('skn-03', 'h-06', 'รพ.สกลนคร (รพศ.)', 'เมืองสกลนคร', 'rg-03', 56, 14, 0, 0, 56),
  rec('skn-04', 'h-06', 'รพ.สกลนคร (รพศ.)', 'เมืองสกลนคร', 'rg-04', 48, 18, 2, 0, 48),
  rec('skn-05', 'h-06', 'รพ.สกลนคร (รพศ.)', 'เมืองสกลนคร', 'rg-11', 28, 8, 2, 0, 28),
  rec('skn-06', 'h-06', 'รพ.สกลนคร (รพศ.)', 'เมืองสกลนคร', 'rg-10', 22, 10, 3, 0, 22),
  rec('skn-07', 'h-06', 'รพ.สกลนคร (รพศ.)', 'เมืองสกลนคร', 'rg-17', 61, 14, 0, 0, 61),
  rec('skn-08', 'h-06', 'รพ.สกลนคร (รพศ.)', 'เมืองสกลนคร', 'rg-12', 5, 2, 4, 1, 5),
  rec('skn-09', 'h-06', 'รพ.สกลนคร (รพศ.)', 'เมืองสกลนคร', 'rg-26', 3, 2, 0, 1, 3),

  // 7. รพ.อากาศอำนวย (382 screened [+57 vs 325], 96 symptomatic, 9 abnormal CXR, 1 TB)
  rec('aka-01', 'h-07', 'รพ.อากาศอำนวย', 'อากาศอำนวย', 'rg-01', 156, 34, 1, 0, 130),
  rec('aka-02', 'h-07', 'รพ.อากาศอำนวย', 'อากาศอำนวย', 'rg-02', 84, 20, 0, 0, 70),
  rec('aka-03', 'h-07', 'รพ.อากาศอำนวย', 'อากาศอำนวย', 'rg-03', 48, 12, 0, 0, 40),
  rec('aka-04', 'h-07', 'รพ.อากาศอำนวย', 'อากาศอำนวย', 'rg-05', 42, 14, 3, 0, 35),
  rec('aka-05', 'h-07', 'รพ.อากาศอำนวย', 'อากาศอำนวย', 'rg-06', 32, 8, 2, 0, 30),
  rec('aka-06', 'h-07', 'รพ.อากาศอำนวย', 'อากาศอำนวย', 'rg-07', 20, 8, 3, 1, 20),

  // 8. รพ.พังโคน (318 screened [+6], 89 symptomatic, 8 abnormal CXR, 1 TB)
  rec('phk-01', 'h-08', 'รพ.พังโคน', 'พังโคน', 'rg-01', 128, 32, 1, 0, 125),
  rec('phk-02', 'h-08', 'รพ.พังโคน', 'พังโคน', 'rg-02', 66, 18, 0, 0, 64),
  rec('phk-03', 'h-08', 'รพ.พังโคน', 'พังโคน', 'rg-03', 44, 12, 0, 0, 43),
  rec('phk-04', 'h-08', 'รพ.พังโคน', 'พังโคน', 'rg-04', 36, 12, 3, 0, 36),
  rec('phk-05', 'h-08', 'รพ.พังโคน', 'พังโคน', 'rg-09', 24, 8, 2, 0, 24),
  rec('phk-06', 'h-08', 'รพ.พังโคน', 'พังโคน', 'rg-14', 20, 7, 2, 1, 20),

  // 9. รพ.กุสุมาลย์ (295 screened [+33 vs 262], 84 symptomatic, 7 abnormal CXR, 1 TB)
  rec('ksm-01', 'h-09', 'รพ.กุสุมาลย์', 'กุสุมาลย์', 'rg-01', 112, 28, 1, 0, 98),
  rec('ksm-02', 'h-09', 'รพ.กุสุมาลย์', 'กุสุมาลย์', 'rg-02', 58, 16, 0, 0, 50),
  rec('ksm-03', 'h-09', 'รพ.กุสุมาลย์', 'กุสุมาลย์', 'rg-03', 42, 11, 0, 0, 36),
  rec('ksm-04', 'h-09', 'รพ.กุสุมาลย์', 'กุสุมาลย์', 'rg-05', 38, 12, 2, 0, 34),
  rec('ksm-05', 'h-09', 'รพ.กุสุมาลย์', 'กุสุมาลย์', 'rg-08', 25, 9, 2, 0, 24),
  rec('ksm-06', 'h-09', 'รพ.กุสุมาลย์', 'กุสุมาลย์', 'rg-15', 20, 8, 2, 1, 20),

  // 10. รพ.พรรณานิคม (246 screened [+5], 76 symptomatic, 6 abnormal CXR, 0 TB)
  rec('pnn-01', 'h-10', 'รพ.พรรณานิคม', 'พรรณานิคม', 'rg-01', 92, 26, 0, 0, 89),
  rec('pnn-02', 'h-10', 'รพ.พรรณานิคม', 'พรรณานิคม', 'rg-02', 48, 14, 0, 0, 46),
  rec('pnn-03', 'h-10', 'รพ.พรรณานิคม', 'พรรณานิคม', 'rg-03', 36, 10, 0, 0, 36),
  rec('pnn-04', 'h-10', 'รพ.พรรณานิคม', 'พรรณานิคม', 'rg-06', 32, 11, 2, 0, 32),
  rec('pnn-05', 'h-10', 'รพ.พรรณานิคม', 'พรรณานิคม', 'rg-16', 20, 8, 2, 0, 20),
  rec('pnn-06', 'h-10', 'รพ.พรรณานิคม', 'พรรณานิคม', 'rg-18', 18, 7, 2, 0, 18),

  // 11. รพ.วาริชภูมิ (162 screened [+97 vs 65], 54 symptomatic, 5 abnormal CXR, 1 TB)
  rec('wrp-01', 'h-11', 'รพ.วาริชภูมิ', 'วาริชภูมิ', 'rg-01', 54, 16, 0, 0, 22),
  rec('wrp-02', 'h-11', 'รพ.วาริชภูมิ', 'วาริชภูมิ', 'rg-02', 32, 10, 0, 0, 12),
  rec('wrp-03', 'h-11', 'รพ.วาริชภูมิ', 'วาริชภูมิ', 'rg-03', 24, 8, 0, 0, 10),
  rec('wrp-04', 'h-11', 'รพ.วาริชภูมิ', 'วาริชภูมิ', 'rg-04', 22, 8, 2, 0, 9),
  rec('wrp-05', 'h-11', 'รพ.วาริชภูมิ', 'วาริชภูมิ', 'rg-07', 16, 6, 2, 0, 6),
  rec('wrp-06', 'h-11', 'รพ.วาริชภูมิ', 'วาริชภูมิ', 'rg-19', 14, 6, 1, 1, 6),

  // 12. รพ.คำตากล้า (138 screened [+3], 48 symptomatic, 4 abnormal CXR, 0 TB)
  rec('ktk-01', 'h-12', 'รพ.คำตากล้า', 'คำตากล้า', 'rg-01', 42, 14, 0, 0, 40),
  rec('ktk-02', 'h-12', 'รพ.คำตากล้า', 'คำตากล้า', 'rg-02', 26, 9, 0, 0, 25),
  rec('ktk-03', 'h-12', 'รพ.คำตากล้า', 'คำตากล้า', 'rg-03', 18, 6, 0, 0, 18),
  rec('ktk-04', 'h-12', 'รพ.คำตากล้า', 'คำตากล้า', 'rg-05', 24, 9, 2, 0, 24),
  rec('ktk-05', 'h-12', 'รพ.คำตากล้า', 'คำตากล้า', 'rg-20', 16, 6, 1, 0, 16),
  rec('ktk-06', 'h-12', 'รพ.คำตากล้า', 'คำตากล้า', 'rg-22', 12, 4, 1, 0, 12),

  // 13. รพ.ส่องดาว (112 screened [+1], 42 symptomatic, 3 abnormal CXR, 0 TB)
  rec('sdw-01', 'h-13', 'รพ.ส่องดาว', 'ส่องดาว', 'rg-01', 34, 12, 0, 0, 33),
  rec('sdw-02', 'h-13', 'รพ.ส่องดาว', 'ส่องดาว', 'rg-02', 22, 8, 0, 0, 22),
  rec('sdw-03', 'h-13', 'รพ.ส่องดาว', 'ส่องดาว', 'rg-03', 16, 6, 0, 0, 16),
  rec('sdw-04', 'h-13', 'รพ.ส่องดาว', 'ส่องดาว', 'rg-09', 18, 7, 1, 0, 18),
  rec('sdw-05', 'h-13', 'รพ.ส่องดาว', 'ส่องดาว', 'rg-21', 12, 5, 1, 0, 12),
  rec('sdw-06', 'h-13', 'รพ.ส่องดาว', 'ส่องดาว', 'rg-23', 10, 4, 1, 0, 10),

  // 14. รพ.บ้านม่วง (86 screened [+0], 36 symptomatic, 2 abnormal CXR, 0 TB)
  rec('bmg-01', 'h-14', 'รพ.บ้านม่วง', 'บ้านม่วง', 'rg-01', 26, 10, 0, 0, 26),
  rec('bmg-02', 'h-14', 'รพ.บ้านม่วง', 'บ้านม่วง', 'rg-02', 16, 7, 0, 0, 16),
  rec('bmg-03', 'h-14', 'รพ.บ้านม่วง', 'บ้านม่วง', 'rg-03', 12, 5, 0, 0, 12),
  rec('bmg-04', 'h-14', 'รพ.บ้านม่วง', 'บ้านม่วง', 'rg-04', 18, 8, 1, 0, 18),
  rec('bmg-05', 'h-14', 'รพ.บ้านม่วง', 'บ้านม่วง', 'rg-08', 14, 6, 1, 0, 14),

  // 15. รพ.เจริญศิลป์ (64 screened [+0], 32 symptomatic, 2 abnormal CXR, 0 TB)
  rec('jrs-01', 'h-15', 'รพ.เจริญศิลป์', 'เจริญศิลป์', 'rg-01', 20, 10, 0, 0, 20),
  rec('jrs-02', 'h-15', 'รพ.เจริญศิลป์', 'เจริญศิลป์', 'rg-02', 12, 6, 0, 0, 12),
  rec('jrs-03', 'h-15', 'รพ.เจริญศิลป์', 'เจริญศิลป์', 'rg-03', 10, 5, 0, 0, 10),
  rec('jrs-04', 'h-15', 'รพ.เจริญศิลป์', 'เจริญศิลป์', 'rg-06', 12, 6, 1, 0, 12),
  rec('jrs-05', 'h-15', 'รพ.เจริญศิลป์', 'เจริญศิลป์', 'rg-10', 10, 5, 1, 0, 10),

  // 16. รพ.กุดบาก (42 screened [+0], 28 symptomatic, 1 abnormal CXR, 0 TB)
  rec('kdb-01', 'h-16', 'รพ.กุดบาก', 'กุดบาก', 'rg-01', 14, 9, 0, 0, 14),
  rec('kdb-02', 'h-16', 'รพ.กุดบาก', 'กุดบาก', 'rg-02', 8, 5, 0, 0, 8),
  rec('kdb-03', 'h-16', 'รพ.กุดบาก', 'กุดบาก', 'rg-03', 6, 4, 0, 0, 6),
  rec('kdb-04', 'h-16', 'รพ.กุดบาก', 'กุดบาก', 'rg-05', 14, 10, 1, 0, 14),

  // 17. รพ.นิคมน้ำอูน (32 screened [+0], 26 symptomatic, 1 abnormal CXR, 0 TB)
  rec('nnu-01', 'h-17', 'รพ.นิคมน้ำอูน', 'นิคมน้ำอูน', 'rg-01', 12, 10, 0, 0, 12),
  rec('nnu-02', 'h-17', 'รพ.นิคมน้ำอูน', 'นิคมน้ำอูน', 'rg-02', 8, 6, 0, 0, 8),
  rec('nnu-03', 'h-17', 'รพ.นิคมน้ำอูน', 'นิคมน้ำอูน', 'rg-03', 6, 5, 0, 0, 6),
  rec('nnu-04', 'h-17', 'รพ.นิคมน้ำอูน', 'นิคมน้ำอูน', 'rg-11', 6, 5, 1, 0, 6),

  // 18. รพ.โคกศรีสุพรรณ (24 screened [+0], 22 symptomatic, 1 abnormal CXR, 0 TB)
  rec('kss-01', 'h-18', 'รพ.โคกศรีสุพรรณ', 'โคกศรีสุพรรณ', 'rg-01', 10, 9, 0, 0, 10),
  rec('kss-02', 'h-18', 'รพ.โคกศรีสุพรรณ', 'โคกศรีสุพรรณ', 'rg-02', 6, 6, 0, 0, 6),
  rec('kss-03', 'h-18', 'รพ.โคกศรีสุพรรณ', 'โคกศรีสุพรรณ', 'rg-03', 4, 4, 0, 0, 4),
  rec('kss-04', 'h-18', 'รพ.โคกศรีสุพรรณ', 'โคกศรีสุพรรณ', 'rg-07', 4, 3, 1, 0, 4),
];

export const PHON_NA_KAEO_DAILY_TRENDS: DailyTrendPoint[] = [
  { dateLabel: '16 ต.ค.', isoDate: '2026-10-16', cumulativeScreened: 200, dailyScreened: 200, cumulativeAbnormalCxr: 9, cumulativeTb: 2, milestoneNote: 'เริ่มต้นคัดกรองเชิงรุก (TB 2 ราย)' },
  { dateLabel: '19 ต.ค.', isoDate: '2026-10-19', cumulativeScreened: 274, dailyScreened: 74, cumulativeAbnormalCxr: 13, cumulativeTb: 2 },
  { dateLabel: '22 ต.ค.', isoDate: '2026-10-22', cumulativeScreened: 356, dailyScreened: 82, cumulativeAbnormalCxr: 17, cumulativeTb: 2 },
  { dateLabel: '25 ต.ค.', isoDate: '2026-10-25', cumulativeScreened: 432, dailyScreened: 76, cumulativeAbnormalCxr: 20, cumulativeTb: 2 },
  { dateLabel: '27 ต.ค.', isoDate: '2026-10-27', cumulativeScreened: 479, dailyScreened: 47, cumulativeAbnormalCxr: 22, cumulativeTb: 2, milestoneNote: 'สะสม 479 ราย (TB 2 ราย)' },
  { dateLabel: '28 ต.ค.', isoDate: '2026-10-28', cumulativeScreened: 518, dailyScreened: 39, cumulativeAbnormalCxr: 25, cumulativeTb: 3, milestoneNote: 'พบ TB เพิ่มเป็น 3 ราย' },
  { dateLabel: '29 ต.ค.', isoDate: '2026-10-29', cumulativeScreened: 562, dailyScreened: 44, cumulativeAbnormalCxr: 28, cumulativeTb: 5, milestoneNote: 'พบ TB เพิ่มเป็น 5 ราย' },
  { dateLabel: '1 พ.ย.', isoDate: '2026-11-01', cumulativeScreened: 628, dailyScreened: 66, cumulativeAbnormalCxr: 32, cumulativeTb: 5 },
  { dateLabel: '3 พ.ย.', isoDate: '2026-11-03', cumulativeScreened: 682, dailyScreened: 54, cumulativeAbnormalCxr: 36, cumulativeTb: 5 },
  { dateLabel: '4 พ.ย.', isoDate: '2026-11-04', cumulativeScreened: 708, dailyScreened: 26, cumulativeAbnormalCxr: 38, cumulativeTb: 7, milestoneNote: 'พบ TB เพิ่มเป็น 7 ราย' },
  { dateLabel: '5 พ.ย.', isoDate: '2026-11-05', cumulativeScreened: 730, dailyScreened: 22, cumulativeAbnormalCxr: 39, cumulativeTb: 7 },
  { dateLabel: '6 พ.ย.', isoDate: '2026-11-06', cumulativeScreened: 830, dailyScreened: 100, cumulativeAbnormalCxr: 40, cumulativeTb: 7, milestoneNote: 'คัดกรองเพิ่ม +100 ราย (สะสม 830 ราย)' },
];

export const MONTHLY_TRENDS_12M_SEED: MonthlyTrendPoint[] = [
  { monthLabel: 'ธ.ค. 68', fullMonthName: 'ธันวาคม 2568', isoMonth: '2025-12', screened: 1420, targetMonthly: 1800, cxrDone: 1390, abnormalCxr: 36, tbDiagnosed: 5, workloadNote: 'รณรงค์คัดกรองเชิงรุกชุมชนและผู้สัมผัสร่วมบ้านช่วงต้นฤดูหนาว' },
  { monthLabel: 'ม.ค. 69', fullMonthName: 'มกราคม 2569', isoMonth: '2026-01', screened: 1680, targetMonthly: 1800, cxrDone: 1645, abnormalCxr: 42, tbDiagnosed: 6, workloadNote: 'ตรวจ CXR ผู้ป่วยเบาหวานและ CKD ในคลินิกโรคเรื้อรัง 18 รพ.' },
  { monthLabel: 'ก.พ. 69', fullMonthName: 'กุมภาพันธ์ 2569', isoMonth: '2026-02', screened: 1540, targetMonthly: 1800, cxrDone: 1510, abnormalCxr: 39, tbDiagnosed: 5, workloadNote: 'คัดกรองผู้สูงอายุ ≥65 ปี และผู้ป่วย COPD ในพื้นที่อำเภอเป้าหมาย' },
  { monthLabel: 'มี.ค. 69', fullMonthName: 'มีนาคม 2569', isoMonth: '2026-03', screened: 1890, targetMonthly: 1800, cxrDone: 1860, abnormalCxr: 48, tbDiagnosed: 7, workloadNote: 'เร่งรัดปิดยอดคัดกรองไตรมาส 2 เกินเป้าหมายรายเดือน (+90 ราย)' },
  { monthLabel: 'เม.ย. 69', fullMonthName: 'เมษายน 2569', isoMonth: '2026-04', screened: 1180, targetMonthly: 1800, cxrDone: 1155, abnormalCxr: 31, tbDiagnosed: 4, workloadNote: 'ช่วงเทศกาลสงกรานต์ ปริมาณผู้รับบริการเชิงรุกลดลงชั่วคราว' },
  { monthLabel: 'พ.ค. 69', fullMonthName: 'พฤษภาคม 2569', isoMonth: '2026-05', screened: 1610, targetMonthly: 1800, cxrDone: 1580, abnormalCxr: 41, tbDiagnosed: 6, workloadNote: 'กลับมาเปิดหน่วยรถเอกซเรย์เคลื่อนที่และคัดกรองผู้ต้องขัง/กลุ่มเปราะบาง' },
  { monthLabel: 'มิ.ย. 69', fullMonthName: 'มิถุนายน 2569', isoMonth: '2026-06', screened: 1750, targetMonthly: 1800, cxrDone: 1715, abnormalCxr: 44, tbDiagnosed: 6, workloadNote: 'ปรับปรุงฐานข้อมูลกลุ่มเสี่ยง HOSxP ณ 25 มิ.ย. 2569' },
  { monthLabel: 'ก.ค. 69', fullMonthName: 'กรกฎาคม 2569', isoMonth: '2026-07', screened: 1640, targetMonthly: 1800, cxrDone: 1610, abnormalCxr: 40, tbDiagnosed: 5, workloadNote: 'คัดกรองเชิงรุกชุมชนแออัดและบุคลากรสาธารณสุขประจำปี' },
  { monthLabel: 'ส.ค. 69', fullMonthName: 'สิงหาคม 2569', isoMonth: '2026-08', screened: 2120, targetMonthly: 1800, cxrDone: 2085, abnormalCxr: 54, tbDiagnosed: 8, workloadNote: 'เร่งรัดค้นหาผู้ป่วยเชิงรุกช่วงโค้งสุดท้ายปีงบประมาณ 2569' },
  { monthLabel: 'ก.ย. 69', fullMonthName: 'กันยายน 2569', isoMonth: '2026-09', screened: 2340, targetMonthly: 1800, cxrDone: 2300, abnormalCxr: 59, tbDiagnosed: 9, workloadNote: 'ปิดยอดคัดกรองปีงบประมาณ 2569 สูงเกินเป้า +30%' },
  { monthLabel: 'ต.ค. 69', fullMonthName: 'ตุลาคม 2569', isoMonth: '2026-10', screened: 3860, targetMonthly: 2100, cxrDone: 3845, abnormalCxr: 102, tbDiagnosed: 15, workloadNote: 'เริ่มปีงบประมาณ 2570 และเปิดปฏิบัติการ ExportACF เต็มรูปแบบ (16 ต.ค.)' },
  { monthLabel: 'พ.ย. 69*', fullMonthName: 'พฤศจิกายน 2569 (ถึง 6 พ.ย.)', isoMonth: '2026-11', screened: 1792, targetMonthly: 2100, cxrDone: 1786, abnormalCxr: 48, tbDiagnosed: 7, workloadNote: 'ยอดคัดกรอง 6 วันแรกของเดือน พ.ย. (รวมรอบ ExportACF ต.ค.–6 พ.ย. = 5,652 ราย)' },
];

export const FY2570_INDICATORS_SEED: Fy2570Indicator[] = [
  {
    id: 'ind-1',
    code: 'ตัวชี้วัดที่ 1',
    name: 'ความครอบคลุมการขึ้นทะเบียน TB รายใหม่และกลับเป็นซ้ำ',
    quarterlyCriteria: '100% · ≥25 / ≥50 / ≥75 / 100%',
    phonNaKaeoTarget: '54 ราย (ร่างจังหวัด: Q1=17, Q2=34, Q3=50, Q4=54)',
    currentStatusText: 'พบจากคัดกรอง 7 ราย = 41% ของเป้า Q1 (13% ของเป้าทั้งปี)',
    currentPct: 41.2,
    targetPct: 25,
    evaluationStatus: 'pending_verify',
    evaluationLabel: 'ตรวจสอบ NTIP',
    detailNote: 'เกณฑ์กองวัณโรค Q1 = 14 ราย (ร่างจังหวัด = 17 ราย) — ยังไม่รวมผู้ป่วยตั้งรับและต้องตรวจการขึ้นทะเบียน NTIP',
  },
  {
    id: 'ind-2',
    code: 'ตัวชี้วัดที่ 2',
    name: 'คัดกรอง CXR ในกลุ่มเสี่ยง',
    quarterlyCriteria: '100% · ≥25 / ≥50 / ≥75 / 100%',
    phonNaKaeoTarget: '2,520 ราย (Q1=630, Q2=1,260, Q3=1,890)',
    currentStatusText: '806 ราย = 32.0% (ผ่านเกณฑ์ Q1 ที่ 25% แล้ว)',
    currentPct: 32.0,
    targetPct: 25,
    evaluationStatus: 'passed',
    evaluationLabel: 'ผ่านเกณฑ์ Q1',
    detailNote: 'ต้องคัดกรองเพิ่มอีก 1,714 ราย (~159 ราย/เดือน ถึง 30 ก.ย. 2570)',
  },
  {
    id: 'ind-3',
    code: 'ตัวชี้วัดที่ 3',
    name: 'ผู้ป่วย B+ ได้ Molecular + DST',
    quarterlyCriteria: '100% ทุกรอบ',
    phonNaKaeoTarget: 'ผู้ป่วย B+ ทุกราย',
    currentStatusText: 'AFB บวก 2 ราย แต่ Xpert 0 ราย · CXR ผิดปกติ 40 ราย',
    currentPct: 0,
    targetPct: 100,
    evaluationStatus: 'action_required',
    evaluationLabel: 'ต้องเร่งดำเนินการ',
    detailNote: 'เร่งส่งตรวจ Xpert / PCR ในผู้ป่วย AFB+ และผู้ที่ CXR ผิดปกติทั้ง 40 ราย',
  },
  {
    id: 'ind-4',
    code: 'ตัวชี้วัดที่ 4',
    name: 'อัตราสำเร็จการรักษา',
    quarterlyCriteria: '≥88% (9 เดือน ≥70%)',
    phonNaKaeoTarget: 'ผู้ป่วยปอดรายใหม่ขึ้นทะเบียน ต.ค.–ธ.ค. 69',
    currentStatusText: 'ยังประเมินไม่ได้ · ถ้ามี 7 ราย ต้องสำเร็จครบ 7 ราย (6 ราย = 85.7%)',
    currentPct: 0,
    targetPct: 88,
    evaluationStatus: 'awaiting_eval',
    evaluationLabel: 'รอประเมินผล',
    detailNote: 'กำกับผู้ดูแลการกินยา (DOT) และติดตามผู้ป่วยไตรมาส 1 ทุกราย',
  },
  {
    id: 'ind-5',
    code: 'ตัวชี้วัดที่ 5',
    name: 'อัตราขาดยา',
    quarterlyCriteria: '<2% (9 และ 12 เดือน)',
    phonNaKaeoTarget: 'กลุ่มเดียวกับข้อ 4 (ขึ้นทะเบียน ต.ค.–ธ.ค. 69)',
    currentStatusText: 'ยังประเมินไม่ได้ · ถ้ามี 7 ราย ต้องไม่มีขาดยา (0 ราย)',
    currentPct: 0,
    targetPct: 2,
    evaluationStatus: 'awaiting_eval',
    evaluationLabel: 'รอประเมินผล',
    detailNote: 'ติดตามต่อเนื่องทุกเดือนเพื่อไม่ให้เกิดการขาดยา',
  },
];

export const RISK_GROUP_TARGETS_2570_SEED: RiskGroupTarget2570[] = [
  { riskGroupId: 'rg-01', riskGroupName: 'เบาหวานคุมไม่ได้ + ผู้สูงอายุเบาหวาน', target2570: 1420, screenedAcf: 683, coveragePct: 48.1, priorityLevel: 'on_track' },
  { riskGroupId: 'rg-03', riskGroupName: 'ผู้ป่วยโรคไตเรื้อรัง (CKD)', target2570: 293, screenedAcf: 44, coveragePct: 15.0, priorityLevel: 'critical_low' },
  { riskGroupId: 'rg-12', riskGroupName: 'ผู้ป่วย COPD (รวมอายุ ≥65 ปี)', target2570: 127, screenedAcf: 28, coveragePct: 22.0, priorityLevel: 'critical_low' },
  { riskGroupId: 'rg-10', riskGroupName: 'ผู้ติดเชื้อเอชไอวี / ผู้ป่วย B24', target2570: 56, screenedAcf: 14, coveragePct: 25.0, priorityLevel: 'moderate' },
  { riskGroupId: 'rg-08', riskGroupName: 'ผู้ป่วยติดเตียง / ทุพพลภาพ', target2570: 183, screenedAcf: 11, coveragePct: 6.0, priorityLevel: 'critical_low' },
  { riskGroupId: 'rg-04', riskGroupName: 'ผู้สัมผัสร่วมบ้านและใกล้ชิด (เป้า 42 ราย)', target2570: 42, screenedAcf: 9, coveragePct: 21.4, priorityLevel: 'critical_low' },
  { riskGroupId: 'rg-09', riskGroupName: 'ผู้ที่เคยป่วยเป็นวัณโรคมาก่อน', target2570: 100, screenedAcf: 8, coveragePct: 8.0, priorityLevel: 'critical_low' },
  { riskGroupId: 'rg-24', riskGroupName: 'ผู้สูงอายุ ≥65 ปี (กลุ่มเสี่ยงทั่วไป)', target2570: 112, screenedAcf: 5, coveragePct: 4.5, priorityLevel: 'critical_low' },
  { riskGroupId: 'rg-07', riskGroupName: 'ผู้ติดสุราเรื้อรัง / ยาเสพติด', target2570: 133, screenedAcf: 4, coveragePct: 3.0, priorityLevel: 'critical_low' },
  { riskGroupId: 'rg-11', riskGroupName: 'บุคลากรสาธารณสุข', target2570: 54, screenedAcf: 0, coveragePct: 0.0, priorityLevel: 'critical_low' },
];

export const QUARTERLY_TARGETS_2570_SEED: QuarterlyTargetPoint[] = [
  { quarter: 'Q1 (6 พ.ย. ปัจจุบัน)', label: 'ไตรมาส 1 (ต.ค.–ธ.ค. 69)', targetCumulative: 630, tbTargetCumulative: 17, actualCumulative: 806 },
  { quarter: 'Q2', label: 'ไตรมาส 2 (ม.ค.–มี.ค. 70)', targetCumulative: 1260, tbTargetCumulative: 34, actualCumulative: null },
  { quarter: 'Q3', label: 'ไตรมาส 3 (เม.ย.–มิ.ย. 70)', targetCumulative: 1890, tbTargetCumulative: 50, actualCumulative: null },
  { quarter: 'Q4', label: 'ไตรมาส 4 (ก.ค.–ก.ย. 70)', targetCumulative: 2520, tbTargetCumulative: 54, actualCumulative: null },
];

export const INITIAL_DATASET_SNAPSHOT: DatasetSnapshot = {
  id: 'export-acf-2569-11-06',
  name: 'สรุปผลคัดกรองวัณโรค จ.สกลนคร (เขต 08) — ExportACF',
  reportDateLabel: '6 พ.ย. 2569',
  comparisonDateLabel: '5 พ.ย. 2569',
  uploadedAt: '2026-11-06T08:30:00+07:00',
  fileName: 'ExportACF_SakonNakhon_25691106.xlsx',
  records: SAKON_NAKHON_SEED_RECORDS,
  dailyTrends: PHON_NA_KAEO_DAILY_TRENDS,
  monthlyTrends: MONTHLY_TRENDS_12M_SEED,
  fy2570Indicators: FY2570_INDICATORS_SEED,
  riskGroupTargets: RISK_GROUP_TARGETS_2570_SEED,
  quarterlyTargets: QUARTERLY_TARGETS_2570_SEED,
};
