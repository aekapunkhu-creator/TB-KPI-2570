import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Share2 } from 'lucide-react';
import {
  aggregateByHospital,
  aggregateByRiskGroup,
  computeProvinceSummary,
} from '../utils/analytics';
import { DailyTrendPoint, HospitalRiskRecord } from '../types/tb';

interface Page3HospitalReportProps {
  allRecords: HospitalRiskRecord[];
  dailyTrends: DailyTrendPoint[];
  reportDateLabel: string;
  focusHospitalName: string;
  onChangeFocusHospital: (name: string) => void;
  onOpenShareModal?: () => void;
  onNavigateToTargets2570?: () => void;
  isExecutiveMode?: boolean;
}

export const Page3HospitalReport: React.FC<Page3HospitalReportProps> = ({
  allRecords,
  dailyTrends,
  reportDateLabel,
  focusHospitalName,
  onChangeFocusHospital,
  onOpenShareModal,
  onNavigateToTargets2570,
  isExecutiveMode = false,
}) => {
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);

  const provinceSummary = useMemo(
    () => computeProvinceSummary(allRecords),
    [allRecords]
  );
  const allHospitals = useMemo(
    () => aggregateByHospital(allRecords),
    [allRecords]
  );

  const focusRecords = useMemo(
    () => allRecords.filter((r) => r.hospitalName === focusHospitalName),
    [allRecords, focusHospitalName]
  );
  const focusSummary = useMemo(
    () => computeProvinceSummary(focusRecords),
    [focusRecords]
  );
  const focusRiskGroups = useMemo(
    () =>
      aggregateByRiskGroup(focusRecords).filter(
        (g) => g.screened > 0 || g.riskGroupName.includes('บุคลากร')
      ),
    [focusRecords]
  );

  const rankIndex =
    allHospitals.findIndex((h) => h.hospitalName === focusHospitalName) + 1;
  const shareOfProvinceScreened =
    provinceSummary.totalScreened > 0
      ? ((focusSummary.totalScreened / provinceSummary.totalScreened) * 100).toFixed(1)
      : '0.0';
  const shareOfProvinceTb =
    provinceSummary.totalTb > 0
      ? Math.round((focusSummary.totalTb / provinceSummary.totalTb) * 100)
      : 0;

  const isPhonNaKaeo = focusHospitalName === 'รพ.โพนนาแก้ว';
  const dmCkdSummary = useMemo(
    () =>
      computeProvinceSummary(
        focusRecords.filter((r) => r.riskCategory === 'chronic_dm_ckd')
      ),
    [focusRecords]
  );
  const dmCkdSharePct =
    focusSummary.totalScreened > 0
      ? ((dmCkdSummary.totalScreened / focusSummary.totalScreened) * 100).toFixed(1)
      : '0.0';
  const maxTrendScreened = Math.max(
    1,
    ...dailyTrends.map((d) => d.cumulativeScreened)
  );

  return (
    <div className="space-y-6">
      {/* Page Title & Hospital Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-blue-950">
            รายงาน{focusHospitalName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            ข้อมูล ExportACF {reportDateLabel} · เทียบกับภาพรวมจังหวัดสกลนครและแนวโน้มตั้งแต่ 16 ต.ค.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2.5 shrink-0">
          {!isExecutiveMode && (
            <div>
              <label
                htmlFor="focus-hospital-select"
                className="block text-xs font-medium text-slate-600 mb-1"
              >
                เลือกหน่วยบริการที่ต้องการดูรายงาน
              </label>
              <select
                id="focus-hospital-select"
                value={focusHospitalName}
                onChange={(e) => onChangeFocusHospital(e.target.value)}
                className="h-9 px-3 text-xs sm:text-sm bg-white border border-sky-200 rounded-lg text-blue-950 focus:border-blue-700 focus:outline-none"
              >
                {allHospitals.map((h) => (
                  <option key={h.hospitalId} value={h.hospitalName}>
                    {h.hospitalName} ({h.screened.toLocaleString()} ราย)
                  </option>
                ))}
              </select>
            </div>
          )}

          {onNavigateToTargets2570 && (
            <button
              type="button"
              onClick={onNavigateToTargets2570}
              className="no-print h-9 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-blue-800 bg-white border border-sky-200 hover:bg-sky-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>ตัวชี้วัด 2570</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-700 shrink-0" aria-hidden="true" />
            </button>
          )}

          {!isExecutiveMode && onOpenShareModal && (
            <button
              type="button"
              onClick={onOpenShareModal}
              className="no-print h-9 px-3.5 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>แชร์ข้อมูลเฉพาะ {focusHospitalName}</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-sky-200/80 border-t-2 border-t-blue-700 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">คัดกรองทั้งหมด</div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-blue-950">
              {focusSummary.totalScreened.toLocaleString()}
            </span>
            <span className="text-xs font-mono tabular-nums font-semibold text-emerald-700">
              อันดับ {rankIndex || 1} จาก {allHospitals.length} รพ.
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            {shareOfProvinceScreened}% ของจังหวัด ({provinceSummary.totalScreened.toLocaleString()} ราย)
          </div>
        </div>

        <div className="bg-white border border-sky-200/80 border-t-2 border-t-sky-500 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">มีอาการ</div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-sky-900">
              {focusSummary.symptomaticPct}%
            </span>
            <span className="text-sm font-mono tabular-nums text-sky-700 font-semibold">
              ({focusSummary.totalSymptomatic.toLocaleString()} ราย)
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            จังหวัด {provinceSummary.symptomaticPct}%
            {focusSummary.symptomaticPct < 5 ? ' — บันทึกอาการน้อย' : ''}
          </div>
        </div>

        <div className="bg-white border border-sky-200/80 border-t-2 border-t-amber-500 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">CXR ผิดปกติ</div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-amber-700">
              {focusSummary.totalAbnormalCxr.toLocaleString()}
            </span>
            <span className="text-sm font-mono tabular-nums font-semibold text-amber-700">
              ({focusSummary.abnormalCxrPct}%)
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            จังหวัด {provinceSummary.abnormalCxrPct}% ({provinceSummary.totalAbnormalCxr} ราย)
          </div>
        </div>

        <div className="bg-white border border-sky-200/80 border-t-2 border-t-red-600 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">วินิจฉัย TB</div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-red-700">
              {focusSummary.totalTb}
            </span>
            <span className="text-sm font-mono tabular-nums font-semibold text-red-700">
              ({focusSummary.tbPct}%)
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            {shareOfProvinceTb}% ของ TB ทั้งจังหวัด ({provinceSummary.totalTb} ราย)
          </div>
        </div>
      </div>

      {/* Cumulative Screening & Abnormal CXR Trend Chart (21-day progression) */}
      <section className="bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-blue-950">
              แนวโน้มการคัดกรอง (จำนวนราย) — สะสมตั้งแต่ 16 ต.ค. ถึง 6 พ.ย. 2569
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ตัวเลขบนแท่ง = คัดกรองสะสม · ตัวเลขสีขาวในแท่ง = CXR ผิดปกติสะสม · TB 2 ราย จนถึง 27 ต.ค. เพิ่มเป็น 3 ราย วันที่ 28 และ 5 ราย วันที่ 29 ต.ค. (คงที่ถึง 3 พ.ย.) และ 7 ราย วันที่ 4 พ.ย. (คงที่ถึง 6 พ.ย.)
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs shrink-0">
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <span className="w-3 h-3 bg-blue-700 inline-block rounded-xs" />
              คัดกรองสะสม
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <span className="w-3 h-3 bg-amber-500 inline-block rounded-xs" />
              CXR ผิดปกติสะสม
            </span>
          </div>
        </div>

        {/* Interactive SVG Combo Bar Chart */}
        <div className="relative overflow-x-auto pb-2">
          <div className="min-w-[680px]">
            <div className="grid grid-cols-12 gap-2 items-end h-64 pt-8 pb-2 px-2 border-b border-sky-200/80">
              {dailyTrends.map((pt, i) => {
                const barHeightPct = Math.max(
                  12,
                  Math.round((pt.cumulativeScreened / maxTrendScreened) * 100)
                );
                const cxrBarHeightPct = Math.max(
                  8,
                  Math.round(
                    (pt.cumulativeAbnormalCxr / maxTrendScreened) * 100 * 3.5
                  )
                );
                const isHovered = hoveredTrendIdx === i;

                return (
                  <div
                    key={pt.isoDate}
                    onMouseEnter={() => setHoveredTrendIdx(i)}
                    onMouseLeave={() => setHoveredTrendIdx(null)}
                    className="flex flex-col items-center justify-end h-full relative group"
                  >
                    {/* TB Milestone Tag above bar if changed */}
                    {pt.milestoneNote && (
                      <div className="mb-1 text-[10px] font-mono tabular-nums font-semibold text-red-700 whitespace-nowrap">
                        TB {pt.cumulativeTb}
                      </div>
                    )}

                    {/* Screened cumulative count on top of bar */}
                    <div className="text-xs font-mono tabular-nums font-semibold text-blue-950 mb-1">
                      {pt.cumulativeScreened}
                    </div>

                    {/* Bar container */}
                    <div
                      className={`w-full max-w-[44px] rounded-t-md transition-colors relative flex flex-col justify-end items-center pb-1.5 ${
                        isHovered ? 'bg-blue-800' : 'bg-blue-700'
                      }`}
                      style={{ height: `${barHeightPct}%` }}
                    >
                      {/* Inner Abnormal CXR indicator */}
                      <div
                        className="w-full bg-amber-500/35 absolute bottom-0 left-0 right-0 rounded-b-none"
                        style={{ height: `${Math.min(90, cxrBarHeightPct)}%` }}
                      />
                      <span className="relative z-10 text-[11px] font-mono tabular-nums font-bold text-white">
                        {pt.cumulativeAbnormalCxr}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-Axis Dates & TB Row */}
            <div className="grid grid-cols-12 gap-2 px-2 pt-2 text-center">
              {dailyTrends.map((pt) => (
                <div key={pt.isoDate} className="space-y-0.5">
                  <div className="text-[11px] font-medium text-blue-950">
                    {pt.dateLabel}
                  </div>
                  <div className="text-[10px] font-mono tabular-nums text-emerald-700 font-semibold">
                    +{pt.dailyScreened}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {hoveredTrendIdx !== null && dailyTrends[hoveredTrendIdx] && (
            <div className="mt-3 p-3 bg-sky-50/75 border border-sky-200/80 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="font-semibold text-blue-950">
                วันที่ {dailyTrends[hoveredTrendIdx].dateLabel} 2569{' '}
                {dailyTrends[hoveredTrendIdx].milestoneNote
                  ? `— ${dailyTrends[hoveredTrendIdx].milestoneNote}`
                  : ''}
              </div>
              <div className="flex items-center gap-4 font-mono tabular-nums">
                <span className="text-blue-900">
                  คัดกรองสะสม:{' '}
                  <strong>
                    {dailyTrends[hoveredTrendIdx].cumulativeScreened}
                  </strong>{' '}
                  ราย (+{dailyTrends[hoveredTrendIdx].dailyScreened})
                </span>
                <span className="text-amber-700">
                  CXR ผิดปกติสะสม:{' '}
                  <strong>
                    {dailyTrends[hoveredTrendIdx].cumulativeAbnormalCxr}
                  </strong>{' '}
                  ราย
                </span>
                <span className="text-red-700">
                  วินิจฉัย TB สะสม:{' '}
                  <strong>{dailyTrends[hoveredTrendIdx].cumulativeTb}</strong> ราย
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Risk Groups Breakdown for Focus Hospital */}
      <section className="bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="text-base font-bold text-blue-950">
            กลุ่มเสี่ยงที่คัดกรอง ({focusHospitalName})
          </h2>
          <p className="text-xs text-slate-500">
            แสดงจำนวนคัดกรอง มีอาการ CXR ผิดปกติ และผู้ป่วย TB แยกรายกลุ่มเสี่ยงทั้งหมดของหน่วยบริการ
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead className="bg-sky-50/70 border-b border-sky-200/80 text-blue-950">
              <tr>
                <th className="py-2.5 px-3 font-semibold">กลุ่มเสี่ยง</th>
                <th className="py-2.5 px-3 font-semibold">หมวดหมู่</th>
                <th className="py-2.5 px-3 font-semibold text-right">คัดกรอง</th>
                <th className="py-2.5 px-3 font-semibold text-right">มีอาการ</th>
                <th className="py-2.5 px-3 font-semibold text-right">CXR ผิดปกติ (%)</th>
                <th className="py-2.5 px-3 font-semibold text-right">พบ TB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100">
              {focusRiskGroups.map((rg) => (
                <tr key={rg.riskGroupId} className="hover:bg-sky-50/45">
                  <td className="py-2.5 px-3 font-medium text-blue-950">
                    {rg.riskGroupName}
                  </td>
                  <td className="py-2.5 px-3 text-xs text-sky-800">
                    {rg.riskCategory === 'chronic_dm_ckd'
                      ? 'โรคเรื้อรัง (DM/CKD)'
                      : rg.isNineRiskGroup
                      ? '9 กลุ่มเสี่ยงเป้าหมาย'
                      : 'นอก 9 กลุ่มเสี่ยง'}
                  </td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-right font-semibold text-blue-950">
                    {rg.screened.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-right text-sky-900">
                    {rg.symptomatic}
                  </td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-right text-amber-700 font-medium">
                    {rg.abnormalCxr} ({rg.abnormalCxrPct}%)
                  </td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-right font-bold text-red-700">
                    {rg.tbDiagnosed > 0 ? `${rg.tbDiagnosed} ราย` : '0'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Analytical Findings & Clinical Recommendations (2 Balanced Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5 sm:p-6">
          <h2 className="text-base font-bold text-blue-950 mb-3">
            ผลการวิเคราะห์ ({focusHospitalName})
          </h2>
          {isPhonNaKaeo ? (
            <ul className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed list-disc pl-5">
              <li>
                เบาหวาน (คุมไม่ได้ + สูงอายุ) และ CKD คิดเป็น{' '}
                <strong className="font-mono tabular-nums">{dmCkdSharePct}%</strong>{' '}
                ของที่คัดกรอง ({dmCkdSummary.totalScreened.toLocaleString()} ราย) พบ CXR ผิดปกติ{' '}
                {dmCkdSummary.totalAbnormalCxr} ราย ({dmCkdSummary.abnormalCxrPct}%) และพบ TB{' '}
                {dmCkdSummary.totalTb} ราย
              </li>
              <li>
                TB 7 ราย อยู่ในกลุ่ม &ldquo;ไม่มีความเสี่ยง&rdquo; 2 ใน 6 ราย
                (AFB บวกทั้ง 2 ราย), ผู้สูงอายุ+เบาหวาน 1 ใน 115, CKD 1 ใน 44,
                ผู้ติดยาเสพติด 1 ใน 1, ผู้สูบบุหรี่ 1 ใน 3 และผู้สัมผัสใกล้ชิดนอกบ้าน
                1 ใน 1
              </li>
              <li>
                ผู้สูงอายุทั่วไป 5 ราย และกลุ่ม &ldquo;ไม่มีความเสี่ยง&rdquo; 6 ราย
                พบ CXR ผิดปกติครบทุกราย (100%)
              </li>
              <li>
                คัดกรองเพิ่ม <strong className="font-mono tabular-nums">4.2 เท่า</strong>{' '}
                ใน 21 วัน (200 → {focusSummary.totalScreened.toLocaleString()} ราย) TB เพิ่มจาก 2 เป็น{' '}
                {focusSummary.totalTb} ราย อัตราพบ {focusSummary.tbPct}%
                (วันที่ 16 ต.ค. 1.0%) CXR ผิดปกติเพิ่มเป็น{' '}
                {focusSummary.totalAbnormalCxr.toLocaleString()} ราย
              </li>
            </ul>
          ) : (
            <ul className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed list-disc pl-5">
              <li>
                {focusHospitalName} คัดกรองสะสม{' '}
                <strong className="font-mono tabular-nums">
                  {focusSummary.totalScreened.toLocaleString()}
                </strong>{' '}
                ราย (คิดเป็น {shareOfProvinceScreened}% ของทั้งจังหวัด)
              </li>
              <li>
                พบผู้มีอาการ {focusSummary.totalSymptomatic.toLocaleString()} ราย (
                {focusSummary.symptomaticPct}%) และพบ CXR ผิดปกติ{' '}
                {focusSummary.totalAbnormalCxr.toLocaleString()} ราย (
                {focusSummary.abnormalCxrPct}%)
              </li>
              <li>
                วินิจฉัยเป็นผู้ป่วยวัณโรค (TB) จำนวน{' '}
                <strong className="font-mono tabular-nums">
                  {focusSummary.totalTb}
                </strong>{' '}
                ราย ({focusSummary.tbPct}%)
              </li>
            </ul>
          )}
        </section>

        <section className="bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5 sm:p-6">
          <h2 className="text-base font-bold text-blue-950 mb-3">
            ข้อเสนอแนะเบื้องต้น
          </h2>
          <ul className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed list-disc pl-5">
            <li>
              ติดตามผู้ CXR ผิดปกติ{' '}
              <strong className="font-mono tabular-nums">
                {focusSummary.totalAbnormalCxr}
              </strong>{' '}
              ราย ให้ตรวจยืนยัน — ปัจจุบันมี AFB {focusSummary.totalAfbPositive}{' '}
              ราย (บวกทั้งคู่) และ Xpert {focusSummary.totalXpertPositive} ราย
            </li>
            <li>
              ทบทวนการจัดกลุ่มเสี่ยงของผู้ป่วย 2 รายในกลุ่ม &ldquo;ไม่มีความเสี่ยง&rdquo;
              และพิจารณาสอบสวนผู้สัมผัสอย่างเร่งด่วน
            </li>
            <li>
              เพิ่มการคัดกรองกลุ่มที่ให้ผลสูงกว่า: ผู้สัมผัสผู้ป่วย ผู้สูบบุหรี่ ผู้สูงอายุ
            </li>
            <li>
              บันทึกอาการคัดกรองให้ครบถ้วน (ปัจจุบัน {focusHospitalName} บันทึก{' '}
              <strong className="font-mono tabular-nums">
                {focusSummary.totalSymptomatic}
              </strong>{' '}
              จาก{' '}
              <strong className="font-mono tabular-nums">
                {focusSummary.totalScreened}
              </strong>{' '}
              ราย)
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};
