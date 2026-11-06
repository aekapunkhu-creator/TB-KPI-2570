import React, { useMemo, useState } from 'react';
import {
  aggregateByHospital,
  aggregateByRiskGroup,
  computeProvinceSummary,
  HospitalSummaryRow,
} from '../utils/analytics';
import { MONTHLY_TRENDS_12M_SEED } from '../data/seedData';
import { HospitalRiskRecord, MonthlyTrendPoint } from '../types/tb';

interface Page1ProvinceOverviewProps {
  records: HospitalRiskRecord[];
  allRecords: HospitalRiskRecord[];
  monthlyTrends?: MonthlyTrendPoint[];
  reportDateLabel: string;
  comparisonDateLabel: string;
  fileName: string;
  onSelectHospitalFilter: (hospitalName: string) => void;
  onNavigateToHospitalReport: (hospitalName: string) => void;
}

export const Page1ProvinceOverview: React.FC<Page1ProvinceOverviewProps> = ({
  records,
  allRecords,
  monthlyTrends = MONTHLY_TRENDS_12M_SEED,
  reportDateLabel,
  comparisonDateLabel,
  fileName,
  onSelectHospitalFilter,
  onNavigateToHospitalReport,
}) => {
  const [showAllHospitals, setShowAllHospitals] = useState(false);
  const [showAllRiskGroups, setShowAllRiskGroups] = useState(false);
  const [trendMode, setTrendMode] = useState<'monthly' | 'cumulative'>('monthly');
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number | null>(null);

  const summary = useMemo(() => computeProvinceSummary(records), [records]);
  const fullSummary = useMemo(
    () => computeProvinceSummary(allRecords),
    [allRecords]
  );
  const hospitals = useMemo(() => aggregateByHospital(records), [records]);
  const riskGroups = useMemo(() => aggregateByRiskGroup(records), [records]);

  const filterScaleRatio =
    fullSummary.totalScreened > 0
      ? summary.totalScreened / fullSummary.totalScreened
      : 1;
  const isFilteredView = records.length !== allRecords.length;

  const computedMonthlySeries = useMemo(() => {
    let runningScreened = 0;
    let runningTarget = 0;
    let runningCxr = 0;

    return monthlyTrends.map((pt) => {
      const scaledScreened = isFilteredView
        ? Math.round(pt.screened * filterScaleRatio)
        : pt.screened;
      const scaledTarget = isFilteredView
        ? Math.max(10, Math.round(pt.targetMonthly * filterScaleRatio))
        : pt.targetMonthly;
      const scaledCxr = isFilteredView
        ? Math.round(pt.cxrDone * filterScaleRatio)
        : pt.cxrDone;
      const scaledAbnormalCxr = isFilteredView
        ? Math.round(pt.abnormalCxr * filterScaleRatio)
        : pt.abnormalCxr;
      const scaledTb = isFilteredView
        ? Math.round(pt.tbDiagnosed * filterScaleRatio)
        : pt.tbDiagnosed;

      runningScreened += scaledScreened;
      runningTarget += scaledTarget;
      runningCxr += scaledCxr;

      return {
        ...pt,
        screened: scaledScreened,
        targetMonthly: scaledTarget,
        cxrDone: scaledCxr,
        abnormalCxr: scaledAbnormalCxr,
        tbDiagnosed: scaledTb,
        cumulativeScreened: runningScreened,
        cumulativeTarget: runningTarget,
        cumulativeCxr: runningCxr,
      };
    });
  }, [monthlyTrends, filterScaleRatio, isFilteredView]);

  const total12MScreened = useMemo(
    () => computedMonthlySeries.reduce((s, m) => s + m.screened, 0),
    [computedMonthlySeries]
  );
  const avg12MScreened =
    computedMonthlySeries.length > 0
      ? Math.round(total12MScreened / computedMonthlySeries.length)
      : 0;
  const peakMonth = useMemo(() => {
    if (computedMonthlySeries.length === 0) return null;
    return computedMonthlySeries.reduce((best, cur) =>
      cur.screened > best.screened ? cur : best
    );
  }, [computedMonthlySeries]);

  const activeMonthIdx =
    hoveredMonthIdx !== null
      ? hoveredMonthIdx
      : Math.max(0, computedMonthlySeries.length - 1);
  const activeMonthPoint = computedMonthlySeries[activeMonthIdx];

  // SVG Geometry for 12-Month Line Chart
  const svgW = 1040;
  const svgH = 212;
  const padL = 56;
  const padR = 28;
  const padT = 26;
  const padB = 28;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const yMaxRaw = Math.max(
    10,
    ...computedMonthlySeries.map((d) =>
      trendMode === 'monthly'
        ? Math.max(d.screened, d.targetMonthly, d.cxrDone)
        : Math.max(d.cumulativeScreened, d.cumulativeTarget, d.cumulativeCxr)
    )
  );
  const yMax = Math.max(300, Math.ceil((yMaxRaw * 1.14) / 300) * 300);

  const chartCoords = useMemo(() => {
    const n = computedMonthlySeries.length;
    return computedMonthlySeries.map((pt, i) => {
      const valMain =
        trendMode === 'monthly' ? pt.screened : pt.cumulativeScreened;
      const valTarget =
        trendMode === 'monthly' ? pt.targetMonthly : pt.cumulativeTarget;
      const valCxr = trendMode === 'monthly' ? pt.cxrDone : pt.cumulativeCxr;

      const x =
        n > 1 ? padL + (i / (n - 1)) * plotW : padL + plotW / 2;
      const yMain = padT + plotH - (valMain / yMax) * plotH;
      const yTarget = padT + plotH - (valTarget / yMax) * plotH;
      const yCxr = padT + plotH - (valCxr / yMax) * plotH;

      return {
        x,
        yMain,
        yTarget,
        yCxr,
        valMain,
        valTarget,
        valCxr,
        meetsTarget: valMain >= valTarget,
      };
    });
  }, [computedMonthlySeries, trendMode, yMax, plotW, plotH]);

  const mainPolylinePoints = chartCoords.map((c) => `${c.x},${c.yMain}`).join(' ');
  const targetPolylinePoints = chartCoords
    .map((c) => `${c.x},${c.yTarget}`)
    .join(' ');
  const cxrPolylinePoints = chartCoords.map((c) => `${c.x},${c.yCxr}`).join(' ');
  const areaPolygonPoints =
    chartCoords.length > 0
      ? `${chartCoords[0].x},${padT + plotH} ${mainPolylinePoints} ${
          chartCoords[chartCoords.length - 1].x
        },${padT + plotH}`
      : '';

  const yTicks = [0, 1 / 3, 2 / 3, 1].map((frac) => ({
    value: Math.round(yMax * frac),
    y: padT + plotH - frac * plotH,
  }));

  const displayedHospitals = showAllHospitals
    ? hospitals
    : hospitals.slice(0, 10);
  const maxHospitalScreened = Math.max(
    1,
    ...displayedHospitals.map((h) => h.screened)
  );

  const displayedRiskGroups = showAllRiskGroups
    ? riskGroups.filter((g) => g.screened > 0)
    : riskGroups.filter((g) => g.screened > 0).slice(0, 8);
  const maxRiskScreened = Math.max(
    1,
    ...displayedRiskGroups.map((g) => g.screened)
  );

  const outcomeHospitals = useMemo(
    () =>
      [...hospitals]
        .filter((h) => h.tbDiagnosed > 0 || h.abnormalCxr > 0)
        .sort(
          (a, b) =>
            b.tbDiagnosed - a.tbDiagnosed || b.abnormalCxr - a.abnormalCxr
        )
        .slice(0, 10),
    [hospitals]
  );
  const maxOutcomeCxr = Math.max(
    1,
    ...outcomeHospitals.map((h) => h.abnormalCxr)
  );

  const highYieldRiskGroups = useMemo(
    () =>
      riskGroups
        .filter((g) => g.screened >= 8)
        .sort((a, b) => b.abnormalCxrPct - a.abnormalCxrPct)
        .slice(0, 10),
    [riskGroups]
  );

  const dmCkdScreened = useMemo(
    () =>
      records
        .filter((r) => r.riskCategory === 'chronic_dm_ckd')
        .reduce((s, r) => s + r.screened, 0),
    [records]
  );
  const dmCkdSharePct =
    summary.totalScreened > 0
      ? Math.round((dmCkdScreened / summary.totalScreened) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Page Title & Unboxed Context Line */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-blue-950">
          สรุปผลคัดกรองวัณโรค จ.สกลนคร (เขต 08) — จัดอันดับ
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          ไฟล์ {fileName} · {summary.hospitalCount} หน่วยบริการ ·{' '}
          {summary.riskGroupCount} กลุ่มเสี่ยง · เทียบข้อมูล{' '}
          {comparisonDateLabel} (คัดกรองเพิ่ม{' '}
          <span className="font-mono tabular-nums font-semibold text-emerald-700">
            {summary.deltaScreened >= 0
              ? `+${summary.deltaScreened.toLocaleString()}`
              : summary.deltaScreened.toLocaleString()}
          </span>{' '}
          ราย · TB{' '}
          {summary.deltaTb === 0
            ? 'เท่าเดิม'
            : summary.deltaTb > 0
            ? `+${summary.deltaTb} ราย`
            : `${summary.deltaTb} ราย`}
          )
        </p>
      </div>

      {/* 4 Primary KPI Cards (Sky - Cobalt Blue - Emerald Green + Clinical Alert accents) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-sky-200/80 border-t-2 border-t-blue-700 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            คัดกรองทั้งหมด (ณ {reportDateLabel})
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-blue-950">
              {summary.totalScreened.toLocaleString()}
            </span>
            <span className="text-xs font-mono tabular-nums font-semibold text-emerald-700">
              {summary.deltaScreened >= 0
                ? `+${summary.deltaScreened.toLocaleString()}`
                : summary.deltaScreened.toLocaleString()}{' '}
              ราย
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            เทียบ {comparisonDateLabel}: {summary.prevTotalScreened.toLocaleString()} →{' '}
            {summary.totalScreened.toLocaleString()} ราย
          </div>
        </div>

        <div className="bg-white border border-sky-200/80 border-t-2 border-t-sky-500 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            มีอาการสงสัยวัณโรค
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-sky-900">
              {summary.totalSymptomatic.toLocaleString()}
            </span>
            <span className="text-sm font-mono tabular-nums font-semibold text-sky-700">
              {summary.symptomaticPct}%
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            สัดส่วนผู้มีอาการต่อผู้คัดกรองทั้งหมด
          </div>
        </div>

        <div className="bg-white border border-sky-200/80 border-t-2 border-t-amber-500 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            ภาพรังสีทรวงอก (CXR) ผิดปกติ
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-amber-700">
              {summary.totalAbnormalCxr.toLocaleString()}
            </span>
            <span className="text-sm font-mono tabular-nums font-semibold text-amber-700">
              {summary.abnormalCxrPct}%
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            เทียบ {comparisonDateLabel}: {summary.prevTotalAbnormalCxr} →{' '}
            {summary.totalAbnormalCxr} (
            {summary.deltaAbnormalCxr >= 0
              ? `+${summary.deltaAbnormalCxr}`
              : summary.deltaAbnormalCxr}{' '}
            ราย)
          </div>
        </div>

        <div className="bg-white border border-sky-200/80 border-t-2 border-t-red-600 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            วินิจฉัยเป็นวัณโรค (TB)
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-red-700">
              {summary.totalTb.toLocaleString()}
            </span>
            <span className="text-sm font-mono tabular-nums font-semibold text-red-700">
              {summary.tbPct}%
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            AFB+ {summary.totalAfbPositive} ราย · Xpert {summary.totalXpertPositive} · LTBI{' '}
            {summary.totalLtbiPositive}
          </div>
        </div>
      </div>

      {/* 12-Month Trailing Monthly TB Screening Trend Line Chart */}
      <section
        aria-labelledby="monthly-trend-heading"
        className="bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5 sm:p-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-sky-100">
          <div>
            <h2
              id="monthly-trend-heading"
              className="text-base sm:text-lg font-bold text-blue-950"
            >
              แนวโน้มจำนวนการคัดกรองวัณโรครายเดือนย้อนหลัง 12 เดือน
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ภาพรวมปริมาณงานคัดกรองในพื้นที่ (ธ.ค. 2568 – พ.ย. 2569) เทียบเกณฑ์เป้าหมายรายเดือน
              {isFilteredView ? ' · ปรับสัดส่วนตามตัวกรองปัจจุบัน' : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Series Legend */}
            <div className="flex flex-wrap items-center gap-3.5 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3.5 h-1 bg-blue-700 rounded-full inline-block" />
                <span>{trendMode === 'monthly' ? 'คัดกรองรายเดือน' : 'คัดกรองสะสม'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3.5 h-0.5 bg-sky-500 inline-block" />
                <span>ตรวจ CXR</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3.5 h-0.5 border-t-2 border-dashed border-emerald-600 inline-block" />
                <span>เกณฑ์เป้าหมาย</span>
              </span>
            </div>

            {/* Monthly / Cumulative Segmented Control */}
            <div className="flex items-center gap-1 p-1 bg-sky-100/75 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setTrendMode('monthly')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  trendMode === 'monthly'
                    ? 'bg-white text-blue-800 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-blue-900'
                }`}
              >
                รายเดือน
              </button>
              <button
                type="button"
                onClick={() => setTrendMode('cumulative')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  trendMode === 'cumulative'
                    ? 'bg-white text-blue-800 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-blue-900'
                }`}
              >
                สะสม 12 เดือน
              </button>
            </div>
          </div>
        </div>

        {/* 3 Clean Unboxed Summary Figures */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-3.5 border-b border-sky-100 text-xs sm:text-sm">
          <div className="flex items-baseline justify-between sm:justify-start sm:gap-3">
            <span className="text-slate-500">ยอดคัดกรองรวม 12 เดือน:</span>
            <span className="font-mono tabular-nums font-bold text-blue-900 text-base">
              {total12MScreened.toLocaleString()} ราย
            </span>
          </div>
          <div className="flex items-baseline justify-between sm:justify-start sm:gap-3">
            <span className="text-slate-500">ปริมาณงานเฉลี่ยต่อเดือน:</span>
            <span className="font-mono tabular-nums font-bold text-emerald-700 text-base">
              {avg12MScreened.toLocaleString()} ราย/เดือน
            </span>
          </div>
          <div className="flex items-baseline justify-between sm:justify-start sm:gap-3">
            <span className="text-slate-500">เดือนปริมาณงานสูงสุด:</span>
            <span className="font-mono tabular-nums font-bold text-sky-700 text-base">
              {peakMonth
                ? `${peakMonth.monthLabel} (${peakMonth.screened.toLocaleString()} ราย)`
                : '-'}
            </span>
          </div>
        </div>

        {/* Responsive SVG Line & Area Chart */}
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[680px]">
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="w-full h-auto select-none"
              role="img"
              aria-label="กราฟเส้นแสดงแนวโน้มจำนวนการคัดกรองวัณโรครายเดือนย้อนหลัง 12 เดือน"
            >
              <defs>
                <linearGradient id="screeningAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284C7" stopOpacity="0.22" />
                  <stop offset="65%" stopColor="#10B981" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines & Y-Axis Ticks */}
              {yTicks.map((tick) => (
                <g key={tick.value}>
                  <line
                    x1={padL}
                    y1={tick.y}
                    x2={svgW - padR}
                    y2={tick.y}
                    stroke="#E2E8F0"
                    strokeDasharray={tick.value === 0 ? undefined : '4 4'}
                    strokeWidth={1}
                  />
                  <text
                    x={padL - 10}
                    y={tick.y + 4}
                    textAnchor="end"
                    fill="#64748B"
                    className="text-[11px] font-mono tabular-nums"
                  >
                    {tick.value.toLocaleString()}
                  </text>
                </g>
              ))}

              {/* Shaded Area under Primary Line */}
              {areaPolygonPoints && (
                <polygon points={areaPolygonPoints} fill="url(#screeningAreaGrad)" />
              )}

              {/* Emerald Green Target Benchmark Dashed Line */}
              {targetPolylinePoints && (
                <polyline
                  fill="none"
                  stroke="#059669"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  points={targetPolylinePoints}
                />
              )}

              {/* Sky Blue CXR Performed Secondary Line */}
              {cxrPolylinePoints && (
                <polyline
                  fill="none"
                  stroke="#0284C7"
                  strokeWidth={2}
                  strokeOpacity={0.75}
                  points={cxrPolylinePoints}
                />
              )}

              {/* Primary Cobalt Blue Monthly Screening Line */}
              {mainPolylinePoints && (
                <polyline
                  fill="none"
                  stroke="#1D4ED8"
                  strokeWidth={2.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={mainPolylinePoints}
                />
              )}

              {/* Active Month Vertical Crosshair Line */}
              {chartCoords[activeMonthIdx] && (
                <line
                  x1={chartCoords[activeMonthIdx].x}
                  y1={padT}
                  x2={chartCoords[activeMonthIdx].x}
                  y2={padT + plotH}
                  stroke="#0284C7"
                  strokeWidth={1.25}
                  strokeDasharray="3 3"
                />
              )}

              {/* Data Points, Direct Numeric Labels & X-Axis Labels */}
              {chartCoords.map((pt, idx) => {
                const month = computedMonthlySeries[idx];
                const isActive = activeMonthIdx === idx;
                const sliceW = plotW / Math.max(1, chartCoords.length);

                return (
                  <g key={month.isoMonth}>
                    {/* Active halo */}
                    {isActive && (
                      <circle
                        cx={pt.x}
                        cy={pt.yMain}
                        r={10}
                        fill="#0284C7"
                        fillOpacity={0.14}
                      />
                    )}

                    {/* Main data point circle (Emerald when meeting/exceeding target, Cobalt Blue otherwise) */}
                    <circle
                      cx={pt.x}
                      cy={pt.yMain}
                      r={isActive ? 5.5 : 4.2}
                      fill={pt.meetsTarget ? '#059669' : '#1D4ED8'}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    />

                    {/* Numeric Value above data point */}
                    <text
                      x={pt.x}
                      y={Math.max(14, pt.yMain - 9)}
                      textAnchor="middle"
                      fill={isActive ? '#1E3A8A' : '#334155'}
                      style={{
                        paintOrder: 'stroke',
                        stroke: '#FFFFFF',
                        strokeWidth: 4,
                        strokeLinejoin: 'round',
                      }}
                      className={`text-[11px] font-mono tabular-nums ${
                        isActive ? 'font-bold' : 'font-medium'
                      }`}
                    >
                      {pt.valMain.toLocaleString()}
                    </text>

                    {/* X-Axis Month Label */}
                    <text
                      x={pt.x}
                      y={svgH - 10}
                      textAnchor="middle"
                      fill={isActive ? '#1D4ED8' : '#475569'}
                      className={`text-[11px] ${
                        isActive ? 'font-bold' : 'font-medium'
                      }`}
                    >
                      {month.monthLabel}
                    </text>

                    {/* Interactive Invisible Hit Target */}
                    <rect
                      x={pt.x - sliceW / 2}
                      y={0}
                      width={sliceW}
                      height={svgH}
                      fill="transparent"
                      className="cursor-pointer"
                      tabIndex={0}
                      role="button"
                      aria-label={`ดูข้อมูลเดือน ${month.fullMonthName}: คัดกรอง ${pt.valMain.toLocaleString()} ราย`}
                      onMouseEnter={() => setHoveredMonthIdx(idx)}
                      onFocus={() => setHoveredMonthIdx(idx)}
                      onClick={() => setHoveredMonthIdx(idx)}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Live Month Detail Inspection Bar */}
        {activeMonthPoint && chartCoords[activeMonthIdx] && (
          <div className="mt-3 px-4 py-2.5 bg-sky-50/75 border border-sky-200/80 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-blue-950">
                {activeMonthPoint.fullMonthName}
              </span>
              {activeMonthPoint.workloadNote && (
                <>
                  <span aria-hidden="true" className="text-sky-300">
                    ·
                  </span>
                  <span className="text-slate-700">{activeMonthPoint.workloadNote}</span>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums shrink-0">
              <span className="text-blue-900">
                คัดกรอง:{' '}
                <strong>
                  {chartCoords[activeMonthIdx].valMain.toLocaleString()}
                </strong>{' '}
                ราย
              </span>
              <span
                className={
                  chartCoords[activeMonthIdx].meetsTarget
                    ? 'text-emerald-700 font-semibold'
                    : 'text-sky-700'
                }
              >
                เป้า:{' '}
                {chartCoords[activeMonthIdx].valTarget.toLocaleString()} (
                {chartCoords[activeMonthIdx].valMain >=
                chartCoords[activeMonthIdx].valTarget
                  ? `+${(
                      chartCoords[activeMonthIdx].valMain -
                      chartCoords[activeMonthIdx].valTarget
                    ).toLocaleString()}`
                  : (
                      chartCoords[activeMonthIdx].valMain -
                      chartCoords[activeMonthIdx].valTarget
                    ).toLocaleString()}
                )
              </span>
              <span className="text-amber-700">
                CXR ผิดปกติ: <strong>{activeMonthPoint.abnormalCxr}</strong>
              </span>
              <span className="text-red-700">
                พบ TB: <strong>{activeMonthPoint.tbDiagnosed}</strong> ราย
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 2x2 Analytical Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Top 10 Hospitals by Screening Volume */}
        <div className="bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-blue-950">
                อันดับ รพ. ตามจำนวนคัดกรอง ({showAllHospitals ? 'ทั้งหมด 18 แห่ง' : 'Top 10'})
              </h2>
              <p className="text-xs text-slate-500">
                คลิกชื่อโรงพยาบาลเพื่อกรองข้อมูลหรือดูรายงานเฉพาะแห่ง
              </p>
            </div>
            {hospitals.length > 10 && (
              <button
                type="button"
                onClick={() => setShowAllHospitals((prev) => !prev)}
                className="text-xs font-medium text-blue-700 hover:text-blue-900 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {showAllHospitals ? 'แสดง Top 10' : `ดูครบ ${hospitals.length} รพ.`}
              </button>
            )}
          </div>

          <div className="space-y-2.5 flex-1">
            {displayedHospitals.map((h: HospitalSummaryRow, idx: number) => {
              const widthPct = Math.max(
                2,
                Math.round((h.screened / maxHospitalScreened) * 100)
              );
              const sharePct =
                fullSummary.totalScreened > 0
                  ? ((h.screened / fullSummary.totalScreened) * 100).toFixed(1)
                  : '0.0';
              return (
                <div key={h.hospitalId} className="group">
                  <div className="flex items-center justify-between text-xs mb-1 gap-2">
                    <button
                      type="button"
                      onClick={() => onNavigateToHospitalReport(h.hospitalName)}
                      className="text-left font-medium text-slate-800 hover:text-blue-700 truncate cursor-pointer"
                    >
                      <span className="font-mono tabular-nums text-sky-600/80 mr-1.5">
                        {idx + 1}.
                      </span>
                      {h.hospitalName}
                    </button>
                    <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
                      {h.deltaScreened > 0 && (
                        <span className="text-emerald-700 font-semibold">
                          +{h.deltaScreened}
                        </span>
                      )}
                      <span className="font-semibold text-blue-950">
                        {h.screened.toLocaleString()}
                      </span>
                      <span className="text-slate-400 w-11 text-right">
                        ({sharePct}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-sky-50 rounded-sm overflow-hidden">
                    <div
                      className={`h-full rounded-sm transition-all ${
                        idx === 0 ? 'bg-blue-700' : 'bg-sky-600/85'
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Top 8 Risk Groups by Screening Volume */}
        <div className="bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-blue-950">
                อันดับกลุ่มเสี่ยง ตามจำนวนคัดกรอง ({showAllRiskGroups ? 'ทั้งหมด' : 'Top 8'})
              </h2>
              <p className="text-xs text-slate-500">
                กลุ่มเบาหวาน + สูงอายุเบาหวาน + CKD คิดเป็น {dmCkdSharePct}% ของผู้คัดกรองทั้งหมด
              </p>
            </div>
            {riskGroups.filter((g) => g.screened > 0).length > 8 && (
              <button
                type="button"
                onClick={() => setShowAllRiskGroups((prev) => !prev)}
                className="text-xs font-medium text-blue-700 hover:text-blue-900 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {showAllRiskGroups ? 'แสดง Top 8' : 'ดูทุกกลุ่มเสี่ยง'}
              </button>
            )}
          </div>

          <div className="space-y-2.5 flex-1">
            {displayedRiskGroups.map((rg, idx) => {
              const widthPct = Math.max(
                2,
                Math.round((rg.screened / maxRiskScreened) * 100)
              );
              return (
                <div key={rg.riskGroupId}>
                  <div className="flex items-center justify-between text-xs mb-1 gap-2">
                    <span className="font-medium text-slate-800 truncate">
                      <span className="font-mono tabular-nums text-sky-600/80 mr-1.5">
                        {idx + 1}.
                      </span>
                      {rg.riskGroupName}
                    </span>
                    <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
                      <span className="text-slate-500">
                        CXR {rg.abnormalCxr} ({rg.abnormalCxrPct}%)
                      </span>
                      <span className="font-semibold text-blue-950 w-12 text-right">
                        {rg.screened.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-sky-50 rounded-sm overflow-hidden">
                    <div
                      className={`h-full rounded-sm ${
                        rg.riskCategory === 'chronic_dm_ckd'
                          ? 'bg-blue-900'
                          : 'bg-emerald-600'
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 3: Hospitals Ranked by Outcome (TB Confirmed / Abnormal CXR) */}
        <div className="bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5 sm:p-6 flex flex-col">
          <div className="mb-4">
            <h2 className="text-base font-bold text-blue-950">
              อันดับ รพ. ตามผลลัพธ์ (พบ TB / CXR ผิดปกติ)
            </h2>
            <p className="text-xs text-slate-500">
              เปรียบเทียบจำนวนผู้ป่วย TB (สีแดงเข้ม) และผู้ที่ CXR ผิดปกติ (สีอำพัน) รายโรงพยาบาล
            </p>
          </div>

          <div className="space-y-3 flex-1">
            {outcomeHospitals.map((h) => {
              const cxrWidth = Math.round(
                (h.abnormalCxr / maxOutcomeCxr) * 100
              );
              const tbWidth = Math.max(
                h.tbDiagnosed > 0 ? 6 : 0,
                Math.round((h.tbDiagnosed / maxOutcomeCxr) * 100)
              );

              return (
                <div key={h.hospitalId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectHospitalFilter(h.hospitalName)}
                      className="font-medium text-slate-800 hover:text-blue-700 truncate text-left cursor-pointer"
                    >
                      {h.hospitalName}
                    </button>
                    <div className="flex items-center gap-3 font-mono tabular-nums shrink-0">
                      <span className="text-red-700 font-semibold">
                        TB {h.tbDiagnosed} ราย ({h.tbPct}%)
                      </span>
                      <span className="text-amber-700">
                        CXR {h.abnormalCxr} ({h.abnormalCxrPct}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-sky-50 rounded-sm overflow-hidden flex items-center">
                    {tbWidth > 0 && (
                      <div
                        className="h-full bg-red-600"
                        style={{ width: `${tbWidth}%` }}
                        title={`วินิจฉัย TB: ${h.tbDiagnosed} ราย`}
                      />
                    )}
                    {cxrWidth > tbWidth && (
                      <div
                        className="h-full bg-amber-400"
                        style={{ width: `${cxrWidth - tbWidth}%` }}
                        title={`CXR ผิดปกติ: ${h.abnormalCxr} ราย`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 4: Risk Groups Ranked by Abnormal CXR Rate (n >= 8) */}
        <div className="bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5 sm:p-6 flex flex-col">
          <div className="mb-4">
            <h2 className="text-base font-bold text-blue-950">
              อันดับกลุ่มเสี่ยง ตามอัตรา CXR ผิดปกติ (n ≥ 8)
            </h2>
            <p className="text-xs text-slate-500">
              แสดงร้อยละ CXR ผิดปกติ พร้อมขนาดตัวอย่าง (n) และจำนวนผู้ป่วย TB ที่พบ (หมายเหตุ: กลุ่ม n น้อยควรตีความอย่างระมัดระวัง)
            </p>
          </div>

          <div className="space-y-2.5 flex-1">
            {highYieldRiskGroups.map((rg) => {
              const widthPct = Math.min(
                100,
                Math.max(2, Math.round(rg.abnormalCxrPct))
              );
              const isHigh = rg.abnormalCxrPct >= 20;

              return (
                <div key={rg.riskGroupId}>
                  <div className="flex items-center justify-between text-xs mb-1 gap-2">
                    <span className="font-medium text-slate-800 truncate">
                      {rg.riskGroupName}{' '}
                      <span className="text-slate-400 font-mono tabular-nums">
                        (n={rg.screened.toLocaleString()})
                      </span>
                    </span>
                    <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
                      {rg.tbDiagnosed > 0 && (
                        <span className="text-red-700 font-semibold">
                          TB {rg.tbDiagnosed}
                        </span>
                      )}
                      <span
                        className={`font-semibold w-14 text-right ${
                          isHigh ? 'text-red-700' : 'text-sky-800'
                        }`}
                      >
                        {rg.abnormalCxrPct}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-sky-50 rounded-sm overflow-hidden">
                    <div
                      className={`h-full rounded-sm ${
                        isHigh ? 'bg-red-600' : 'bg-sky-600'
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Key Observations Section (Page 1 Bottom Block) */}
      <section className="bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5 sm:p-6">
        <h2 className="text-base font-bold text-blue-950 mb-4">
          ข้อสังเกตสำคัญ (เทียบข้อมูล {comparisonDateLabel})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <div className="p-4 bg-sky-50/45 border border-sky-200/80 rounded-lg">
            <div className="font-semibold text-blue-950 mb-1">
              1. ยอดคัดกรองเพิ่มรายวันและอันดับหน่วยบริการ
            </div>
            <p>
              คัดกรองเพิ่ม{' '}
              <span className="font-mono tabular-nums font-semibold text-emerald-700">
                366
              </span>{' '}
              ราย (5,286 → 5,652) แต่ TB เท่าเดิม 22 ราย สัดส่วนที่พบลดเหลือ{' '}
              <span className="font-mono tabular-nums">0.39%</span>; เพิ่มมากที่
              โพนนาแก้ว +100 (730 → 830), วาริชภูมิ +97 (65 → 162), อากาศอำนวย +57,
              พระอาจารย์ฝั้นฯ +48 (ขึ้นอันดับ 4) และกุสุมาลย์ +33; เต่างอยและวานรนิวาสไม่เปลี่ยน
            </p>
          </div>

          <div className="p-4 bg-sky-50/45 border border-sky-200/80 rounded-lg">
            <div className="font-semibold text-blue-950 mb-1">
              2. ความเปลี่ยนแปลงของผล CXR ผิดปกติ
            </div>
            <p>
              CXR ผิดปกติทั้งจังหวัดเพิ่มเพียง{' '}
              <span className="font-mono tabular-nums font-semibold text-amber-700">
                1
              </span>{' '}
              ราย (149 → 150 ราย คิดเป็น 2.7%) โดยเพิ่มขึ้นที่ รพ.โพนนาแก้ว (39 → 40 ราย)
            </p>
          </div>

          <div className="p-4 bg-sky-50/45 border border-sky-200/80 rounded-lg">
            <div className="font-semibold text-blue-950 mb-1">
              3. สัดส่วนโรคเรื้อรังเทียบกลุ่มให้ผลบวกสูง
            </div>
            <p>
              เบาหวาน (คุมไม่ได้ + สูงอายุ) และ CKD รวม{' '}
              <span className="font-mono tabular-nums font-semibold text-blue-900">
                73%
              </span>{' '}
              ของการคัดกรอง แต่ CXR ผิดปกติเพียง{' '}
              <span className="font-mono tabular-nums">0.5–0.8%</span>; กลุ่มที่ผลสูง:
              &ldquo;ไม่มีความเสี่ยง&rdquo; 66.7% (n=9, TB 3 ราย), COPD 47.2% (n=53,
              TB 7 ราย), ผู้สูงอายุ 45.0% (n=20) — ตัวอย่างน้อย ตีความระวัง
            </p>
          </div>

          <div className="p-4 bg-sky-50/45 border border-sky-200/80 rounded-lg">
            <div className="font-semibold text-blue-950 mb-1">
              4. การส่งตรวจยืนยันทางห้องปฏิบัติการและความครบถ้วน
            </div>
            <p>
              AFB 2 ราย (บวกทั้งคู่ ที่โพนนาแก้ว) Xpert ยังเป็น 0; สมเด็จพระยุพราชฯ
              (531 ราย) และพระอาจารย์ฝั้นฯ (558 ราย) ไม่มีข้อมูลอาการ; เต่างอยพบ TB 2 ราย
              แต่ CXR ผิดปกติ 0 (และมี CXR 706 จาก 727 ราย); LTBI 0 ราย
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
