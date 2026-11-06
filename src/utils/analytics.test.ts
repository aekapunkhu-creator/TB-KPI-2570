import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ALERT_THRESHOLDS,
  DEFAULT_POPULATION_PHON_NA_KAEO,
  INITIAL_DATASET_SNAPSHOT,
  MONTHLY_TRENDS_12M_SEED,
  SAKON_NAKHON_SEED_RECORDS,
} from '../data/seedData';
import {
  aggregateByHospital,
  aggregateByRiskGroup,
  computeProvinceSummary,
  filterScreeningRecords,
  numberNeededToScreen,
  populationRatePer100k,
  relativeRiskWithCI,
  runRelationalSqlQuery,
  wilsonConfidenceInterval,
} from './analytics';
import { detectSignificantChanges } from './changeDetector';

test('seed dataset reconciles exact province-wide ExportACF 6 Nov 2569 totals', () => {
  const summary = computeProvinceSummary(SAKON_NAKHON_SEED_RECORDS);
  assert.equal(summary.hospitalCount, 18);
  assert.equal(summary.riskGroupCount, 26);
  assert.equal(summary.totalScreened, 5652);
  assert.equal(summary.prevTotalScreened, 5286);
  assert.equal(summary.deltaScreened, 366);
  assert.equal(summary.totalSymptomatic, 1094);
  assert.equal(summary.symptomaticPct, 19.4);
  assert.equal(summary.totalAbnormalCxr, 150);
  assert.equal(summary.prevTotalAbnormalCxr, 149);
  assert.equal(summary.deltaAbnormalCxr, 1);
  assert.equal(summary.abnormalCxrPct, 2.7);
  assert.equal(summary.totalTb, 22);
  assert.equal(summary.deltaTb, 0);
  assert.equal(summary.tbPct, 0.39);
  assert.equal(summary.totalAfbPositive, 2);
  assert.equal(summary.totalXpertPositive, 0);

  const dmCkdScreened = SAKON_NAKHON_SEED_RECORDS.filter(
    (r) => r.riskCategory === 'chronic_dm_ckd'
  ).reduce((s, r) => s + r.screened, 0);
  assert.equal(Math.round((dmCkdScreened / summary.totalScreened) * 100), 73);
});

test('Phon Na Kaeo hospital records reconcile exact Page 3 & Page 4 counts', () => {
  const pnkRecords = filterScreeningRecords(SAKON_NAKHON_SEED_RECORDS, {
    hospitalName: 'รพ.โพนนาแก้ว',
    riskCategory: 'all',
    findingFilter: 'all',
    searchQuery: '',
  });
  const pnkSummary = computeProvinceSummary(pnkRecords);
  assert.equal(pnkSummary.totalScreened, 830);
  assert.equal(pnkSummary.deltaScreened, 100);
  assert.equal(pnkSummary.totalSymptomatic, 23);
  assert.equal(pnkSummary.symptomaticPct, 2.8);
  assert.equal(pnkSummary.totalAbnormalCxr, 40);
  assert.equal(pnkSummary.deltaAbnormalCxr, 1);
  assert.equal(pnkSummary.abnormalCxrPct, 4.8);
  assert.equal(pnkSummary.totalTb, 7);
  assert.equal(pnkSummary.tbPct, 0.84);

  // Chronic DM/CKD vs Other groups at Phon Na Kaeo
  const dmCkd = pnkRecords.filter((r) => r.riskCategory === 'chronic_dm_ckd');
  const other = pnkRecords.filter((r) => r.riskCategory !== 'chronic_dm_ckd');
  const dmSummary = computeProvinceSummary(dmCkd);
  const otherSummary = computeProvinceSummary(other);

  assert.equal(dmSummary.totalScreened, 727);
  assert.equal(dmSummary.totalAbnormalCxr, 16);
  assert.equal(dmSummary.abnormalCxrPct, 2.2);
  assert.equal(dmSummary.totalTb, 2);
  assert.equal(dmSummary.tbRatePer1000, 2.8);

  assert.equal(otherSummary.totalScreened, 103);
  assert.equal(otherSummary.totalAbnormalCxr, 24);
  assert.equal(otherSummary.abnormalCxrPct, 23.3);
  assert.equal(otherSummary.totalTb, 5);
  assert.equal(otherSummary.tbRatePer1000, 48.5);
});

test('epidemiological Wilson 95% CI, NNS, Relative Risk, and population rate match Page 4', () => {
  const pnkCi = wilsonConfidenceInterval(7, 830);
  assert.equal(pnkCi.per1000, 8.4);
  assert.equal(pnkCi.per1000Lower, 4.1);
  assert.equal(pnkCi.per1000Upper, 17.3);

  const provCi = wilsonConfidenceInterval(22, 5652);
  assert.equal(provCi.per1000, 3.9);
  assert.equal(provCi.per1000Lower, 2.6);
  assert.equal(provCi.per1000Upper, 5.9);

  assert.equal(numberNeededToScreen(7, 830), 119);
  assert.equal(numberNeededToScreen(22, 5652), 257);
  assert.equal(numberNeededToScreen(15, 4822), 321);

  const rrVsOther = relativeRiskWithCI(7, 830, 15, 4822);
  assert.equal(rrVsOther.rr, 2.7);
  assert.equal(rrVsOther.lower95, 1.1);
  assert.equal(rrVsOther.upper95, 6.6);

  const rrGroups = relativeRiskWithCI(5, 103, 2, 727);
  assert.equal(rrGroups.rr, 17.6);
  assert.equal(rrGroups.lower95, 3.5);
  assert.equal(rrGroups.upper95, 89.8);

  const popRateDefault = populationRatePer100k(7, DEFAULT_POPULATION_PHON_NA_KAEO);
  assert.equal(popRateDefault.ratePer100k, 18.9);

  const popRateCustom = populationRatePer100k(7, 40000);
  assert.equal(popRateCustom.ratePer100k, 17.5);
});

test('hospital aggregation ranks 18 hospitals and returns top 4 risk groups', () => {
  const hospitals = aggregateByHospital(SAKON_NAKHON_SEED_RECORDS);
  assert.equal(hospitals.length, 18);
  assert.equal(hospitals[0].hospitalName, 'รพ.โพนนาแก้ว');
  assert.equal(hospitals[0].screened, 830);
  assert.equal(hospitals[0].topRiskGroups.length, 4);
  assert.equal(hospitals[3].hospitalName, 'รพ.พระอาจารย์ฝั้น อาจาโร');
  assert.equal(hospitals[3].screened, 558);

  const riskGroups = aggregateByRiskGroup(SAKON_NAKHON_SEED_RECORDS);
  assert.equal(riskGroups.length, 26);
  const copd = riskGroups.find((g) => g.riskGroupName.includes('COPD'));
  assert.equal(copd?.screened, 53);
  assert.equal(copd?.abnormalCxr, 25);
  assert.equal(copd?.abnormalCxrPct, 47.2);
  assert.equal(copd?.tbDiagnosed, 7);
});

test('relational SQL query engine and change detector operate deterministically', () => {
  const sqlRes = runRelationalSqlQuery(
    SAKON_NAKHON_SEED_RECORDS,
    'SELECT hospital_name, SUM(screened), SUM(tb_diagnosed) FROM screening_records GROUP BY hospital_name ORDER BY total_screened DESC LIMIT 5'
  );
  assert.equal(sqlRes.error, undefined);
  assert.equal(sqlRes.rowCount, 5);
  assert.equal(sqlRes.rows[0].hospital_name, 'รพ.โพนนาแก้ว');
  assert.equal(sqlRes.rows[0].total_screened, 830);
  assert.equal(sqlRes.rows[0].tb_diagnosed, 7);

  const alerts = detectSignificantChanges(
    INITIAL_DATASET_SNAPSHOT,
    DEFAULT_ALERT_THRESHOLDS
  );
  assert.ok(alerts.length >= 6);
  assert.ok(alerts.some((a) => a.category === 'lab_gap'));
  assert.ok(alerts.some((a) => a.category === 'tb_cluster'));
  assert.ok(alerts.some((a) => a.category === 'volume_surge'));
  assert.ok(alerts.some((a) => a.category === 'data_quality'));
});

test('Excel workbook buffer parsing builds valid DatasetSnapshot and detects changes', async () => {
  const XLSX = await import('xlsx');
  const { inspectExcelBuffer, buildDatasetFromExcelRows } = await import(
    './excelParser'
  );

  const sampleRows = [
    {
      หน่วยบริการ: 'รพ.โพนนาแก้ว',
      อำเภอ: 'โพนนาแก้ว',
      กลุ่มเสี่ยง: 'เบาหวานที่คุมระดับน้ำตาลไม่ได้',
      คัดกรองทั้งหมด: 620,
      มีอาการ: 15,
      'CXR ผิดปกติ': 14,
      'วินิจฉัยเป็น TB': 1,
      'AFB+': 1,
      Xpert: 1,
    },
    {
      หน่วยบริการ: 'รพ.วาริชภูมิ',
      อำเภอ: 'วาริชภูมิ',
      กลุ่มเสี่ยง: 'ผู้ป่วยโรคปอดอุดกั้นเรื้อรัง (COPD)',
      คัดกรองทั้งหมด: 85,
      มีอาการ: 30,
      'CXR ผิดปกติ': 18,
      'วินิจฉัยเป็น TB': 3,
      'AFB+': 0,
      Xpert: 2,
    },
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleRows);
  XLSX.utils.book_append_sheet(wb, ws, 'ExportACF');
  const arrayBuf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

  const preview = inspectExcelBuffer(arrayBuf, 'ExportACF_7Nov.xlsx');
  assert.equal(preview.rawRows.length, 2);
  assert.equal(preview.suggestedMapping.hospitalName, 'หน่วยบริการ');
  assert.equal(preview.suggestedMapping.riskGroupName, 'กลุ่มเสี่ยง');
  assert.equal(preview.suggestedMapping.screened, 'คัดกรองทั้งหมด');

  const nextSnap = buildDatasetFromExcelRows(
    preview,
    preview.suggestedMapping,
    '7 พ.ย. 2569',
    INITIAL_DATASET_SNAPSHOT
  );
  assert.equal(nextSnap.records.length, 2);
  const sum = computeProvinceSummary(nextSnap.records);
  assert.equal(sum.totalScreened, 705);
  assert.equal(sum.totalTb, 4);
});

test('12-month trailing monthly trend data covers Dec 2568 to Nov 2569 and reconciles ACF totals', () => {
  assert.equal(MONTHLY_TRENDS_12M_SEED.length, 12);
  assert.equal(MONTHLY_TRENDS_12M_SEED[0].monthLabel, 'ธ.ค. 68');
  assert.equal(MONTHLY_TRENDS_12M_SEED[11].monthLabel, 'พ.ย. 69*');

  for (const pt of MONTHLY_TRENDS_12M_SEED) {
    assert.ok(pt.screened > 0);
    assert.ok(pt.targetMonthly > 0);
    assert.ok(pt.cxrDone > 0 && pt.cxrDone <= pt.screened);
    assert.ok(pt.abnormalCxr >= 0);
    assert.ok(pt.tbDiagnosed >= 0);
  }

  const total12M = MONTHLY_TRENDS_12M_SEED.reduce((s, p) => s + p.screened, 0);
  assert.equal(total12M, 22822);

  // Oct 2569 + Nov 2569 (up to 6 Nov) equals total province ExportACF screened count (5,652)
  const octNovScreened =
    MONTHLY_TRENDS_12M_SEED[10].screened + MONTHLY_TRENDS_12M_SEED[11].screened;
  assert.equal(octNovScreened, 5652);
});


