import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  SearchCheck,
  Share2,
} from 'lucide-react';
import {
  Fy2570Indicator,
  QuarterlyTargetPoint,
  RiskGroupTarget2570,
} from '../types/tb';

interface Page5Targets2570Props {
  indicators: Fy2570Indicator[];
  riskGroupTargets: RiskGroupTarget2570[];
  quarterlyTargets: QuarterlyTargetPoint[];
  populationDenominator: number;
  checkedActions?: Record<string, boolean>;
  onToggleAction?: (id: string) => void;
  onOpenShareModal?: () => void;
  onNavigateToHospitalReport?: () => void;
  isExecutiveMode?: boolean;
}

const ACTION_PLAN_ITEMS = [
  {
    id: 'act-1',
    title: 'เร่งกลุ่มที่ครอบคลุมต่ำ',
    detail:
      'บุคลากรสาธารณสุข 0% · ยาเสพติด/สุรา 3% · ติดเตียง 6% · เคยเป็น TB 8% · CKD 15% · ผู้สัมผัส 21% · COPD อายุ ≥65 ปี 22%',
  },
  {
    id: 'act-2',
    title: 'สอบสวนผู้สัมผัสผู้ป่วย 7 ราย',
    detail:
      'สอบสวนผู้สัมผัสร่วมบ้านและใกล้ชิดของผู้ป่วยทั้ง 7 ราย และส่ง CXR ให้ครบ (เป้า 42 ราย ทำแล้ว 9 ราย คิดเป็น 21.4%)',
  },
  {
    id: 'act-3',
    title: 'ส่ง Molecular first ในผู้ CXR ผิดปกติทุกราย (40 ราย)',
    detail:
      'ส่ง Xpert (500 บาท) หรือ PCR MTB/MDR (600 บาท) สปสช.ชดเชยใน 9+3 กลุ่มเสี่ยง (ถ้าส่ง Xpert ทุกราย ≈ 20,000 บาท) · อ่านผล CXR ด้วย AI ภายใน 5 วัน โดยพยาบาล TB clinic / Mr.TB รับรองผล',
  },
  {
    id: 'act-4',
    title: 'กำกับตัวชี้วัด 4–5 (สำเร็จ ≥88% และขาดยา <2%)',
    detail:
      'ขึ้นทะเบียน NTIP ทันที กำหนดผู้ดูแลการกินยา (DOT) และติดตามผู้ป่วยกลุ่มไตรมาส 1 ทุกรายให้ครบ 7 ราย',
  },
  {
    id: 'act-5',
    title: 'คัดกรองนอกกลุ่มเสี่ยง (อายุ ≥40 ปี)',
    detail:
      'นัด CXR ปีละ 1 ครั้งในคลินิกโรคเรื้อรัง (งบ PPA) สำหรับผู้มีอายุ ≥40 ปีที่สูบบุหรี่ มี COPD เบาหวานคุมไม่ได้ หรือความดันสูง',
  },
];

export const Page5Targets2570: React.FC<Page5Targets2570Props> = ({
  indicators,
  riskGroupTargets,
  quarterlyTargets,
  populationDenominator,
  checkedActions: controlledCheckedActions,
  onToggleAction,
  onOpenShareModal,
  onNavigateToHospitalReport,
  isExecutiveMode = false,
}) => {
  const [localCheckedActions, setLocalCheckedActions] = useState<
    Record<string, boolean>
  >({});
  const checkedActions = controlledCheckedActions ?? localCheckedActions;

  const toggleAction = (id: string) => {
    if (onToggleAction) {
      onToggleAction(id);
    } else {
      setLocalCheckedActions((prev) => ({ ...prev, [id]: !prev[id] }));
    }
  };

  const renderStatusBadge = (ind: Fy2570Indicator) => {
    switch (ind.evaluationStatus) {
      case 'passed':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <span>{ind.evaluationLabel}</span>
          </span>
        );
      case 'action_required':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
            <span>{ind.evaluationLabel}</span>
          </span>
        );
      case 'pending_verify':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800">
            <SearchCheck className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
            <span>{ind.evaluationLabel}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            <span>{ind.evaluationLabel}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-blue-950">
            ตัวชี้วัดและแผนคัดกรอง อำเภอโพนนาแก้ว ปีงบประมาณ 2570
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            ที่มา: เอกสารจังหวัดสกลนคร (ร่าง ก.ย.–ต.ค. 2569) · ตัวชี้วัดกองวัณโรค 30 ต.ค. 2569 · ข้อมูลคัดกรอง ExportACF {indicators[0]?.currentStatusText ? 'ล่าสุด' : '6 พ.ย. 2569'} · ปีงบประมาณ 2570 = 1 ต.ค. 2569–30 ก.ย. 2570 (ขณะนี้อยู่ไตรมาส 1)
          </p>
        </div>

        {(onNavigateToHospitalReport || (!isExecutiveMode && onOpenShareModal)) && (
          <div className="no-print flex flex-wrap items-center gap-2 shrink-0">
            {onNavigateToHospitalReport && (
              <button
                type="button"
                onClick={onNavigateToHospitalReport}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-800 bg-white border border-sky-200 hover:bg-sky-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>ข้อมูลเฉพาะ รพ.โพนนาแก้ว</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-blue-700 shrink-0" aria-hidden="true" />
              </button>
            )}

            {!isExecutiveMode && onOpenShareModal && (
              <button
                type="button"
                onClick={onOpenShareModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>แชร์หน้าตัวชี้วัดให้ผู้บริหารดูสด</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4 FY 2570 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-sky-200/80 border-t-2 border-t-blue-700 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            ประชากร (1 ม.ค. 68)
          </div>
          <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-blue-950">
            {populationDenominator.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            HDC 36,619 · อายุ ≥40 ปี 19,103
          </div>
        </div>

        <div className="bg-white border border-sky-200/80 border-t-2 border-t-sky-500 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            เป้าขึ้นทะเบียน TB ปี 2570
          </div>
          <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-sky-900">
            54 ราย
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            146 ต่อแสน · ไตรมาส 1 = 17 ราย (พบแล้ว 7)
          </div>
        </div>

        <div className="bg-white border border-sky-200/80 border-t-2 border-t-emerald-600 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            เป้า CXR 9 กลุ่มเสี่ยง
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-emerald-700">
              2,520
            </span>
            <span className="text-sm font-mono tabular-nums font-semibold text-emerald-700">
              32.0%
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            คัดกรองแล้ว 806 ราย (ผ่านเกณฑ์ Q1 ที่ 25%)
          </div>
        </div>

        <div className="bg-white border border-sky-200/80 border-t-2 border-t-blue-500 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            เป้า CXR นอกกลุ่มเสี่ยง อายุ ≥40
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-blue-900">
              665
            </span>
            <span className="text-sm font-mono tabular-nums font-semibold text-amber-700">
              พบ TB 3 ราย
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            คัดกรองนอก 9 กลุ่มแล้ว 24 ราย (CXR ผิดปกติ 66.7%)
          </div>
        </div>
      </div>

      {/* 5 TB Division Indicators Table */}
      <section className="bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="text-base font-bold text-blue-950">
            ตัวชี้วัดกองวัณโรค 5 ข้อ: เป้าหมายและสถานะของอำเภอโพนนาแก้ว
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            เกณฑ์รายไตรมาสตามกองวัณโรคคือ 25/50/75/100% ของเป้า (54 ราย = 14/27/41/54) ส่วนร่างจังหวัดตั้งไว้สูงกว่า (17/34/50/54)
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead className="bg-sky-50/70 border-b border-sky-200/80 text-blue-950">
              <tr>
                <th className="py-3 px-4 font-semibold">ตัวชี้วัด</th>
                <th className="py-3 px-4 font-semibold">เกณฑ์ Q1·6·9·12 เดือน</th>
                <th className="py-3 px-4 font-semibold">เป้าหมายโพนนาแก้ว</th>
                <th className="py-3 px-4 font-semibold">สถานะ (ACF 6 พ.ย.)</th>
                <th className="py-3 px-4 font-semibold">การประเมิน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100">
              {indicators.map((ind) => (
                <tr key={ind.id} className="hover:bg-sky-50/45 align-top">
                  <td className="py-3 px-4 font-semibold text-blue-950">
                    {ind.code}: {ind.name}
                    <p className="text-xs font-normal text-slate-500 mt-0.5">
                      {ind.detailNote}
                    </p>
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-xs text-sky-900 whitespace-nowrap">
                    {ind.quarterlyCriteria}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-700">
                    {ind.phonNaKaeoTarget}
                  </td>
                  <td className="py-3 px-4 text-xs font-medium text-blue-950">
                    {ind.currentStatusText}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {renderStatusBadge(ind)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Risk Group CXR Coverage & Quarterly Trajectory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coverage by Risk Group */}
        <section className="lg:col-span-7 bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5 sm:p-6">
          <h2 className="text-base font-bold text-blue-950">
            ความครอบคลุมการคัดกรอง CXR รายกลุ่มเสี่ยง (อำเภอโพนนาแก้ว)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            เป้า = ประชากรกลุ่มเสี่ยงของอำเภอ ปี 2570 (เอกสารจังหวัด) · ผู้ต้องขังไม่มีเป้าในอำเภอนี้
          </p>

          <div className="space-y-3">
            {riskGroupTargets.map((item) => {
              const widthPct = Math.min(100, Math.max(1, item.coveragePct));
              const isLow = item.coveragePct < 25;
              return (
                <div key={item.riskGroupId}>
                  <div className="flex items-center justify-between text-xs mb-1 gap-2">
                    <span className="font-medium text-slate-800 truncate">
                      {item.riskGroupName}
                    </span>
                    <div className="font-mono tabular-nums shrink-0 flex items-center gap-2">
                      <span className="text-slate-500">
                        {item.screenedAcf.toLocaleString()} /{' '}
                        {item.target2570.toLocaleString()}
                      </span>
                      <span
                        className={`font-semibold w-12 text-right ${
                          isLow ? 'text-sky-800' : 'text-emerald-700'
                        }`}
                      >
                        {item.coveragePct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-sky-50 rounded-sm overflow-hidden">
                    <div
                      className={`h-full rounded-sm ${
                        isLow ? 'bg-sky-600' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Quarterly Cumulative Plan & NHSO Budget */}
        <section className="lg:col-span-5 bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5 sm:p-6 flex flex-col justify-between space-y-5">
          <div>
            <h2 className="text-base font-bold text-blue-950">
              ไตรมาสและเป้าหมายสะสม ปีงบประมาณ 2570
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              ต้องคัดกรองกลุ่มเสี่ยงเพิ่มอีก 1,714 ราย (~159 ราย/เดือน ถึง 30 ก.ย. 2570)
            </p>

            <div className="space-y-3">
              {quarterlyTargets.map((q) => {
                const targetBar = Math.round((q.targetCumulative / 2520) * 100);
                const actualBar =
                  q.actualCumulative !== null
                    ? Math.round((q.actualCumulative / 2520) * 100)
                    : 0;

                return (
                  <div
                    key={q.quarter}
                    className="p-3 bg-sky-50/55 border border-sky-200/80 rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-blue-950">
                        {q.quarter}
                      </span>
                      <span className="font-mono tabular-nums text-slate-600">
                        เป้า CXR {q.targetCumulative.toLocaleString()} · เป้า TB{' '}
                        {q.tbTargetCumulative} ราย
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-sky-100 rounded-sm overflow-hidden relative">
                      <div
                        className="h-full bg-sky-400/70"
                        style={{ width: `${targetBar}%` }}
                      />
                      {actualBar > 0 && (
                        <div
                          className="h-full bg-blue-700 absolute top-0 left-0"
                          style={{ width: `${actualBar}%` }}
                        />
                      )}
                    </div>
                    {q.actualCumulative !== null && (
                      <div className="text-xs font-mono tabular-nums text-emerald-700 font-semibold">
                        ผลงานจริงถึง 6 พ.ย.: {q.actualCumulative.toLocaleString()} ราย (เกินเป้า Q1 แล้ว +176 ราย)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-xl space-y-1.5 text-xs text-slate-800">
            <div className="font-semibold text-blue-950">
              ประมาณการงบชดเชย สปสช. และค่าตรวจ Molecular
            </div>
            <div className="font-mono tabular-nums">
              • ค่าชดเชย CXR 100 บาท/ราย (ที่เหลือ 1,714 ราย ≈{' '}
              <strong>171,400 บาท</strong>)
            </div>
            <div className="font-mono tabular-nums">
              • ค่าตรวจ Xpert 500 บาท/ราย (CXR ผิดปกติ 40 ราย ≈{' '}
              <strong>20,000 บาท</strong>)
            </div>
          </div>
        </section>
      </div>

      {/* Non-Risk Group (Age >= 40) + Action Plan + Limitations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Action Plan */}
        <section className="lg:col-span-7 bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5 sm:p-6">
          <h2 className="text-base font-bold text-blue-950 mb-1">
            แผนดำเนินการเสนอ (ตามแนวทางจังหวัดสกลนคร)
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            คลิกทำเครื่องหมายเพื่อติดตามความก้าวหน้าการดำเนินงานของคลินิกวัณโรค
          </p>

          <div className="space-y-3">
            {ACTION_PLAN_ITEMS.map((item) => {
              const checked = Boolean(checkedActions[item.id]);
              return (
                <label
                  key={item.id}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    checked
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : 'bg-sky-50/40 border-sky-200/80 hover:bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAction(item.id)}
                    className="mt-1 h-4 w-4 rounded border-sky-300 text-blue-700 focus:ring-blue-700"
                  />
                  <div className="text-xs sm:text-sm">
                    <div
                      className={`font-semibold ${
                        checked ? 'line-through text-slate-500' : 'text-blue-950'
                      }`}
                    >
                      {item.title}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      {item.detail}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        {/* Non-Risk Group & Data Comparison Limitations */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5 sm:p-6">
            <h2 className="text-base font-bold text-blue-950 mb-3">
              นอกกลุ่มเสี่ยง (อายุ ≥40 ปี)
            </h2>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-700 leading-relaxed list-disc pl-5">
              <li>
                <strong>เป้าหมายปี 2570:</strong> ผู้ป่วย TB ที่ต้องหาเพิ่มนอกกลุ่มเสี่ยง{' '}
                <span className="font-mono tabular-nums font-semibold">51</span>{' '}
                ราย (อายุ ≥35 ปี 47 ราย) ต้องพบ CXR ผิดปกติ 125 ราย ใช้ CXR 665 ราย
              </li>
              <li>
                <strong>ข้อมูลย้อนหลังปี 2569:</strong> อำเภอขึ้นทะเบียน 17 ราย อยู่ใน 7 กลุ่มเสี่ยงเพียง 3 ราย (18%) ที่เหลือ 14 ราย (82%) อยู่นอกกลุ่ม
              </li>
              <li>
                <strong>ผล ACF ปัจจุบัน:</strong> ในกลุ่มเสี่ยงพบ TB 4 ใน 806 ราย (0.5%, CI 0.2–1.3) นอกกลุ่มพบ TB 3 ใน 24 ราย (12.5%, CI 4.3–31.0) และ CXR ผิดปกติ 66.7% เทียบ 3.0% (ตัวอย่างนอกกลุ่มน้อยมากและอาจเป็นผู้ถูกส่งมาเพราะสงสัยอยู่แล้ว)
              </li>
            </ul>
          </div>

          <div className="bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5 sm:p-6">
            <h2 className="text-base font-bold text-blue-950 mb-3">
              ข้อจำกัดของการเทียบข้อมูล
            </h2>
            <ul className="space-y-2 text-xs text-slate-600 leading-relaxed list-disc pl-5">
              <li>
                เป้าหมายเป็นร่างและใช้ 146 ต่อแสน (WHO) ที่ยังไม่ประกาศปีล่าสุด เป้าอาจเปลี่ยนเมื่อกองวัณโรคกำหนด
              </li>
              <li>
                ตัวเลขกลุ่มเสี่ยงของจังหวัดมาจาก HOSxP ณ 25 มิ.ย. 2569 ส่วนผู้ถูกคัดกรองมาจาก ACF ไม่ใช่ฐานเดียวกัน อาจนับซ้ำหรือจับกลุ่มไม่ตรง
              </li>
              <li>
                การแปลผล &ldquo;ผ่านเกณฑ์&rdquo; ของตัวชี้วัดที่ 2 ใช้ผู้ถูกคัดกรองในไฟล์ ACF ณ 6 พ.ย. เท่านั้น ควรตรวจกับรายงานทางการ (NTIP) ก่อนสรุปผล
              </li>
              <li>
                Xpert/AFB ในไฟล์ ACF อาจไม่ได้บันทึกครบ จึงควรตรวจสอบกับห้องปฏิบัติการก่อนสรุปว่ายังไม่ส่งตรวจ
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};
