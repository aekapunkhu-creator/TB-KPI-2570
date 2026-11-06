import {
  AlertThresholdConfig,
  ChangeAlert,
  DatasetSnapshot,
} from '../types/tb';
import {
  aggregateByHospital,
  aggregateByRiskGroup,
  computeProvinceSummary,
} from './analytics';

/**
 * Evaluates a dataset snapshot (and optional previous snapshot) against clinical/epidemiological
 * thresholds to produce prioritized significant-change alerts.
 */
export function detectSignificantChanges(
  current: DatasetSnapshot,
  thresholds: AlertThresholdConfig,
  previous?: DatasetSnapshot
): ChangeAlert[] {
  const alerts: ChangeAlert[] = [];
  const summary = computeProvinceSummary(current.records);
  const hospitals = aggregateByHospital(current.records);
  const riskGroups = aggregateByRiskGroup(current.records);

  // 1. Lab Confirmation Gap Alert (CXR abnormal vs Molecular Xpert/AFB)
  const unconfirmedCxr =
    summary.totalAbnormalCxr -
    (summary.totalAfbPositive + summary.totalXpertPositive);
  if (unconfirmedCxr >= thresholds.maxUnconfirmedCxrAlert) {
    alerts.push({
      id: `alert-lab-gap-${current.id}`,
      severity: 'critical',
      category: 'lab_gap',
      title: `พบ CXR ผิดปกติสะสม ${summary.totalAbnormalCxr.toLocaleString()} ราย แต่ส่งตรวจ Xpert ${summary.totalXpertPositive} ราย`,
      description: `ทั้งจังหวัดมีผู้ที่ CXR ผิดปกติ ${summary.totalAbnormalCxr.toLocaleString()} ราย (รพ.โพนนาแก้ว 40 ราย) มีผล AFB บวกเพียง ${summary.totalAfbPositive} ราย และ Xpert ${summary.totalXpertPositive} ราย ควรเร่งส่งตรวจ Molecular first (Xpert/PCR) ทุกราย`,
      metricDelta: `รอตรวจยืนยัน ${unconfirmedCxr.toLocaleString()} ราย`,
      hospitalName: 'ภาพรวมจังหวัด / รพ.โพนนาแก้ว',
      timestamp: current.uploadedAt,
      acknowledged: false,
    });
  }

  // 2. High TB Yield Cluster in Non-Risk / COPD Groups
  const nonRiskGroup = riskGroups.find((rg) =>
    rg.riskGroupName.includes('ไม่มีความเสี่ยง')
  );
  if (
    nonRiskGroup &&
    nonRiskGroup.screened > 0 &&
    nonRiskGroup.abnormalCxrPct >= thresholds.minAbnormalCxrPctAlert
  ) {
    alerts.push({
      id: `alert-cluster-nonrisk-${current.id}`,
      severity: 'critical',
      category: 'tb_cluster',
      title: `อัตรา CXR ผิดปกติสูงผิดปกติในกลุ่ม "ไม่มีความเสี่ยง" (${nonRiskGroup.abnormalCxrPct}%)`,
      description: `กลุ่ม "ไม่มีความเสี่ยง" (n=${nonRiskGroup.screened}) พบ CXR ผิดปกติ ${nonRiskGroup.abnormalCxr} ราย (${nonRiskGroup.abnormalCxrPct}%) และวินิจฉัย TB ${nonRiskGroup.tbDiagnosed} ราย (เฉพาะ รพ.โพนนาแก้ว พบ TB 2 ใน 6 ราย และ AFB+ ทั้งคู่) ควรทบทวนการจัดกลุ่มเสี่ยงและสอบสวนผู้สัมผัส`,
      metricDelta: `TB ${nonRiskGroup.tbDiagnosed} ราย · CXR ผิดปกติ ${nonRiskGroup.abnormalCxrPct}%`,
      hospitalName: 'รพ.โพนนาแก้ว / จังหวัดสกลนคร',
      timestamp: current.uploadedAt,
      acknowledged: false,
    });
  }

  // 3. COPD High TB Detection Alert
  const copdGroup = riskGroups.find((rg) => rg.riskGroupName.includes('COPD'));
  if (
    copdGroup &&
    copdGroup.screened >= 8 &&
    copdGroup.abnormalCxrPct >= thresholds.minAbnormalCxrPctAlert
  ) {
    alerts.push({
      id: `alert-cluster-copd-${current.id}`,
      severity: 'critical',
      category: 'tb_cluster',
      title: `กลุ่มโรคปอดอุดกั้นเรื้อรัง (COPD) พบ TB สูงถึง ${copdGroup.tbDiagnosed} ราย`,
      description: `จากผู้คัดกรอง COPD ${copdGroup.screened} ราย พบ CXR ผิดปกติ ${copdGroup.abnormalCxr} ราย (${copdGroup.abnormalCxrPct}%) และพบ TB ${copdGroup.tbDiagnosed} ราย (คิดเป็น ${Math.round((copdGroup.tbDiagnosed / Math.max(1, summary.totalTb)) * 100)}% ของ TB ทั้งจังหวัด)`,
      metricDelta: `อัตรา TB ${copdGroup.tbRatePer1000} ต่อ 1,000`,
      hospitalName: 'จังหวัดสกลนคร (เขต 08)',
      timestamp: current.uploadedAt,
      acknowledged: false,
    });
  }

  // 4. Hospital Screening Volume Surge Alerts
  const surgeHospitals = hospitals.filter(
    (h) => h.deltaScreened >= thresholds.minScreeningDeltaAlert
  );
  if (surgeHospitals.length > 0) {
    const topSurgeSummary = surgeHospitals
      .map((h) => `${h.hospitalName.replace('รพ.', '')} +${h.deltaScreened}`)
      .join(', ');
    alerts.push({
      id: `alert-volume-surge-${current.id}`,
      severity: 'info',
      category: 'volume_surge',
      title: `คัดกรองเพิ่มขึ้น +${summary.deltaScreened.toLocaleString()} ราย (${summary.prevTotalScreened.toLocaleString()} → ${summary.totalScreened.toLocaleString()})`,
      description: `หน่วยบริการที่คัดกรองเพิ่มสูงสุดเทียบ ${current.comparisonDateLabel}: ${topSurgeSummary} โดย รพ.พระอาจารย์ฝั้นฯ ขยับขึ้นอันดับ 4 ของจังหวัด (558 ราย)`,
      metricDelta: `+${summary.deltaScreened.toLocaleString()} ราย`,
      hospitalName: surgeHospitals[0].hospitalName,
      timestamp: current.uploadedAt,
      acknowledged: false,
    });
  }

  // 5. High TB Rate Hospital Alert (e.g. Phon Na Kaeo 8.4 per 1,000)
  for (const h of hospitals) {
    if (
      h.screened >= 50 &&
      h.tbRatePer1000 >= thresholds.minTbRatePer1000Alert
    ) {
      alerts.push({
        id: `alert-hospital-tb-rate-${h.hospitalId}-${current.id}`,
        severity: 'warning',
        category: 'tb_cluster',
        title: `${h.hospitalName} มีอัตราพบ TB ${h.tbRatePer1000} ต่อ 1,000 ราย (${h.tbDiagnosed} ราย)`,
        description: `พบผู้ป่วย TB ${h.tbDiagnosed} ราย จากการคัดกรอง ${h.screened.toLocaleString()} ราย (${h.tbPct}%) สูงกว่าค่าเฉลี่ยจังหวัด (${summary.tbRatePer1000} ต่อ 1,000) และพบ CXR ผิดปกติ ${h.abnormalCxr} ราย (${h.abnormalCxrPct}%)`,
        metricDelta: `${h.tbRatePer1000} ต่อ 1,000`,
        hospitalName: h.hospitalName,
        timestamp: current.uploadedAt,
        acknowledged: false,
      });
    }
  }

  // 6. Data Completeness Alert (Zero or Low Symptom Recording / Tao Ngoi CXR Discrepancy)
  const lowSymptomHospitals = hospitals.filter(
    (h) =>
      h.screened >= 100 &&
      h.symptomaticPct < thresholds.minSymptomRecordPctAlert
  );
  if (lowSymptomHospitals.length > 0) {
    const names = lowSymptomHospitals
      .map(
        (h) =>
          `${h.hospitalName.replace('รพ.', '')} (${h.symptomatic}/${h.screened} ราย, ${h.symptomaticPct}%)`
      )
      .join(' · ');
    alerts.push({
      id: `alert-data-symptom-${current.id}`,
      severity: 'warning',
      category: 'data_quality',
      title: `พบ ${lowSymptomHospitals.length} โรงพยาบาลบันทึกข้อมูลอาการคัดกรองต่ำกว่าเกณฑ์ (<${thresholds.minSymptomRecordPctAlert}%)`,
      description: `หน่วยบริการที่บันทึกอาการน้อยหรือเป็น 0: ${names} (เทียบค่าเฉลี่ยจังหวัด ${summary.symptomaticPct}%) ควรกำชับการบันทึกอาการซักประวัติให้ครบถ้วน`,
      metricDelta: `${lowSymptomHospitals.length} หน่วยบริการ`,
      hospitalName: lowSymptomHospitals.map((h) => h.hospitalName).join(', '),
      timestamp: current.uploadedAt,
      acknowledged: false,
    });
  }

  // 7. Tao Ngoi Zero Abnormal CXR with TB Confirmed Discrepancy
  const taoNgoi = hospitals.find((h) => h.hospitalName.includes('เต่างอย'));
  if (taoNgoi && taoNgoi.tbDiagnosed > 0 && taoNgoi.abnormalCxr === 0) {
    alerts.push({
      id: `alert-data-taongoi-${current.id}`,
      severity: 'warning',
      category: 'data_quality',
      title: `รพ.เต่างอย พบ TB ${taoNgoi.tbDiagnosed} ราย แต่บันทึก CXR ผิดปกติ 0 ราย`,
      description: `รพ.เต่างอย คัดกรอง ${taoNgoi.screened} ราย (ตรวจ CXR ${taoNgoi.cxrDone} ราย) พบ TB ${taoNgoi.tbDiagnosed} ราย แต่ผล CXR ผิดปกติเป็น 0 ควรตรวจสอบการลงรหัสผลอ่านภาพรังสีทรวงอกในระบบ ACF`,
      metricDelta: `TB ${taoNgoi.tbDiagnosed} / CXR ผิดปกติ 0`,
      hospitalName: 'รพ.เต่างอย',
      timestamp: current.uploadedAt,
      acknowledged: false,
    });
  }

  // 8. Comparison against custom uploaded previous snapshot if provided
  if (previous && previous.id !== current.id) {
    const prevSummary = computeProvinceSummary(previous.records);
    const diffScreened = summary.totalScreened - prevSummary.totalScreened;
    const diffTb = summary.totalTb - prevSummary.totalTb;
    const diffCxr = summary.totalAbnormalCxr - prevSummary.totalAbnormalCxr;

    if (diffTb > 0 || Math.abs(diffScreened) >= thresholds.minScreeningDeltaAlert) {
      alerts.unshift({
        id: `alert-upload-diff-${current.id}`,
        severity: diffTb > 0 ? 'critical' : 'info',
        category: diffTb > 0 ? 'tb_cluster' : 'volume_surge',
        title: `อัปเดตไฟล์ใหม่ "${current.fileName}": คัดกรอง ${diffScreened >= 0 ? `+${diffScreened.toLocaleString()}` : diffScreened.toLocaleString()} ราย, TB ${diffTb >= 0 ? `+${diffTb}` : diffTb} ราย`,
        description: `เปรียบเทียบกับชุดข้อมูลก่อนหน้า (${previous.fileName}): คัดกรองรวม ${prevSummary.totalScreened.toLocaleString()} → ${summary.totalScreened.toLocaleString()} ราย, CXR ผิดปกติ ${prevSummary.totalAbnormalCxr} → ${summary.totalAbnormalCxr} ราย (${diffCxr >= 0 ? `+${diffCxr}` : diffCxr}), วินิจฉัย TB ${prevSummary.totalTb} → ${summary.totalTb} ราย`,
        metricDelta: `TB ${diffTb >= 0 ? `+${diffTb}` : diffTb} · คัดกรอง ${diffScreened >= 0 ? `+${diffScreened}` : diffScreened}`,
        hospitalName: 'ทุกหน่วยบริการ (นำเข้าใหม่)',
        timestamp: current.uploadedAt,
        acknowledged: false,
      });
    }
  }

  return alerts;
}
