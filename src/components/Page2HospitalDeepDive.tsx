import React, { useMemo, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { aggregateByHospital, HospitalSummaryRow } from '../utils/analytics';
import { HospitalRiskRecord } from '../types/tb';

interface Page2HospitalDeepDiveProps {
  records: HospitalRiskRecord[];
  onNavigateToHospitalReport: (hospitalName: string) => void;
}

type SortKey = 'screened' | 'tb' | 'cxr_pct' | 'delta';

export const Page2HospitalDeepDive: React.FC<Page2HospitalDeepDiveProps> = ({
  records,
  onNavigateToHospitalReport,
}) => {
  const [sortBy, setSortBy] = useState<SortKey>('screened');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const hospitals = useMemo(() => {
    const list = aggregateByHospital(records);
    return [...list].sort((a, b) => {
      if (sortBy === 'tb')
        return b.tbDiagnosed - a.tbDiagnosed || b.abnormalCxr - a.abnormalCxr;
      if (sortBy === 'cxr_pct')
        return b.abnormalCxrPct - a.abnormalCxrPct || b.screened - a.screened;
      if (sortBy === 'delta')
        return b.deltaScreened - a.deltaScreened || b.screened - a.screened;
      return b.screened - a.screened;
    });
  }, [records, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-blue-950">
            รายละเอียดเชิงลึกรายโรงพยาบาล ({hospitals.length} หน่วยบริการ)
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            เรียงตามจำนวนคัดกรอง · แสดงกลุ่มเสี่ยง 4 อันดับแรกของแต่ละ รพ. (คัดกรอง / มีอาการ / CXR ผิดปกติ)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-sky-100/75 rounded-lg">
            {(
              [
                { id: 'screened', label: 'คัดกรองมากสุด' },
                { id: 'tb', label: 'พบ TB มากสุด' },
                { id: 'cxr_pct', label: '% CXR ผิดปกติ' },
                { id: 'delta', label: 'ยอดเพิ่มรายวัน' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSortBy(item.id)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  sortBy === item.id
                    ? 'bg-white text-blue-800 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-blue-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 bg-sky-100/75 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-blue-800 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-blue-900'
              }`}
            >
              การ์ดเชิงลึก
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-blue-800 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-blue-900'
              }`}
            >
              ตารางสรุป
            </button>
          </div>
        </div>
      </div>

      {hospitals.length === 0 ? (
        <div className="bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-12 text-center text-sm text-slate-500">
          ไม่พบข้อมูลหน่วยบริการตามเงื่อนไขที่กรอง
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead className="bg-sky-50/70 border-b border-sky-200/80 text-blue-950">
              <tr>
                <th className="py-3 px-4 font-semibold">อันดับ</th>
                <th className="py-3 px-4 font-semibold">หน่วยบริการ</th>
                <th className="py-3 px-4 font-semibold text-right">คัดกรอง</th>
                <th className="py-3 px-4 font-semibold text-right">เพิ่ม (5 พ.ย.)</th>
                <th className="py-3 px-4 font-semibold text-right">มีอาการ (%)</th>
                <th className="py-3 px-4 font-semibold text-right">CXR ผิดปกติ (%)</th>
                <th className="py-3 px-4 font-semibold text-right">พบ TB (%)</th>
                <th className="py-3 px-4 font-semibold">กลุ่มเสี่ยงอันดับ 1</th>
                <th className="py-3 px-4 font-semibold text-right">รายงาน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100">
              {hospitals.map((h, idx) => (
                <tr key={h.hospitalId} className="hover:bg-sky-50/45">
                  <td className="py-2.5 px-4 font-mono tabular-nums text-sky-700">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-blue-950">
                    {h.hospitalName}
                    <span className="block text-xs font-normal text-slate-500">
                      อ.{h.district}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-right font-semibold text-blue-950">
                    {h.screened.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-right text-emerald-700 font-semibold">
                    {h.deltaScreened > 0 ? `+${h.deltaScreened}` : '0'}
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-right text-sky-900">
                    {h.symptomatic.toLocaleString()} ({h.symptomaticPct}%)
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-right text-amber-700 font-medium">
                    {h.abnormalCxr.toLocaleString()} ({h.abnormalCxrPct}%)
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-right text-red-700 font-semibold">
                    {h.tbDiagnosed} ({h.tbPct}%)
                  </td>
                  <td className="py-2.5 px-4 text-xs text-slate-700 max-w-[220px] truncate">
                    {h.topRiskGroups[0]?.riskGroupName || '-'} (
                    {h.topRiskGroups[0]?.screened || 0})
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onNavigateToHospitalReport(h.hospitalName)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 cursor-pointer"
                    >
                      <span>เจาะลึก</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {hospitals.map((h: HospitalSummaryRow, idx: number) => (
            <article
              key={h.hospitalId}
              className="bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5 flex flex-col justify-between"
            >
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-sky-100">
                  <div>
                    <div className="text-xs text-sky-700 font-mono tabular-nums">
                      อันดับที่ {idx + 1} · อ.{h.district}
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-blue-950 mt-0.5">
                      {h.hospitalName}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigateToHospitalReport(h.hospitalName)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>รายงาน รพ.</span>
                    <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>

                {/* 4 Hospital Summary Metrics */}
                <div className="grid grid-cols-4 gap-2 py-3 border-b border-sky-100 text-center">
                  <div>
                    <div className="text-xs text-slate-500">คัดกรอง</div>
                    <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-blue-950">
                      {h.screened.toLocaleString()}
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-emerald-700 font-semibold">
                      {h.deltaScreened > 0 ? `+${h.deltaScreened} ราย` : 'คงที่'}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">มีอาการ</div>
                    <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-sky-900">
                      {h.symptomatic.toLocaleString()}
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-sky-700">
                      {h.symptomaticPct}%
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">CXR ผิดปกติ</div>
                    <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-amber-700">
                      {h.abnormalCxr.toLocaleString()}
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-amber-700">
                      {h.abnormalCxrPct}%
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">พบ TB</div>
                    <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-red-700">
                      {h.tbDiagnosed}
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-red-700">
                      {h.tbPct}%
                    </div>
                  </div>
                </div>

                {/* Top 4 Risk Groups Table */}
                <div className="mt-3">
                  <div className="text-xs font-semibold text-blue-950 mb-2">
                    กลุ่มเสี่ยง 4 อันดับแรก (คัดกรอง / มีอาการ / CXR ผิดปกติ)
                  </div>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="text-sky-800/80 border-b border-sky-100">
                        <th className="py-1.5 text-left font-medium">กลุ่มเสี่ยง</th>
                        <th className="py-1.5 text-right font-medium">คัดกรอง</th>
                        <th className="py-1.5 text-right font-medium">มีอาการ</th>
                        <th className="py-1.5 text-right font-medium">CXR ผิดปกติ</th>
                        <th className="py-1.5 text-right font-medium">TB</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-50">
                      {h.topRiskGroups.map((rg) => (
                        <tr key={rg.riskGroupName}>
                          <td className="py-1.5 pr-2 text-slate-800 truncate max-w-[200px]">
                            {rg.riskGroupName}
                          </td>
                          <td className="py-1.5 text-right font-mono tabular-nums font-semibold text-blue-950">
                            {rg.screened.toLocaleString()}
                          </td>
                          <td className="py-1.5 text-right font-mono tabular-nums text-slate-600">
                            {rg.symptomatic}
                          </td>
                          <td className="py-1.5 text-right font-mono tabular-nums text-amber-700">
                            {rg.abnormalCxr}
                          </td>
                          <td className="py-1.5 text-right font-mono tabular-nums font-semibold text-red-700">
                            {rg.tbDiagnosed}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
