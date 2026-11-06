import React, { useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  aggregateByHospital,
  aggregateByRiskGroup,
  computeProvinceSummary,
  numberNeededToScreen,
  populationRatePer100k,
  relativeRiskWithCI,
  wilsonConfidenceInterval,
} from '../utils/analytics';
import { DEFAULT_POPULATION_PHON_NA_KAEO } from '../data/seedData';
import { HospitalRiskRecord } from '../types/tb';

interface Page4EpidemiologyProps {
  allRecords: HospitalRiskRecord[];
  reportDateLabel: string;
  populationDenominator: number;
  onChangePopulationDenominator: (nextPop: number) => void;
}

export const Page4Epidemiology: React.FC<Page4EpidemiologyProps> = ({
  allRecords,
  reportDateLabel,
  populationDenominator,
  onChangePopulationDenominator,
}) => {
  const provinceSummary = useMemo(
    () => computeProvinceSummary(allRecords),
    [allRecords]
  );
  const hospitals = useMemo(
    () => aggregateByHospital(allRecords),
    [allRecords]
  );

  const pnkRecords = useMemo(
    () => allRecords.filter((r) => r.hospitalName === 'รพ.โพนนาแก้ว'),
    [allRecords]
  );
  const pnkSummary = useMemo(
    () => computeProvinceSummary(pnkRecords),
    [pnkRecords]
  );
  const pnkRiskGroups = useMemo(
    () =>
      aggregateByRiskGroup(pnkRecords).filter((g) => g.tbDiagnosed > 0),
    [pnkRecords]
  );

  const otherScreened = Math.max(
    1,
    provinceSummary.totalScreened - pnkSummary.totalScreened
  );
  const otherTb = Math.max(0, provinceSummary.totalTb - pnkSummary.totalTb);

  const pnkCi = wilsonConfidenceInterval(
    pnkSummary.totalTb,
    pnkSummary.totalScreened
  );
  const provCi = wilsonConfidenceInterval(
    provinceSummary.totalTb,
    provinceSummary.totalScreened
  );
  const otherCi = wilsonConfidenceInterval(otherTb, otherScreened);

  const wanorn = hospitals.find((h) => h.hospitalName.includes('วานรนิวาส'));
  const wanornCi = wilsonConfidenceInterval(
    wanorn?.tbDiagnosed ?? 4,
    wanorn?.screened ?? 660
  );

  const pnkNns = numberNeededToScreen(
    pnkSummary.totalTb,
    pnkSummary.totalScreened
  );
  const provNns = numberNeededToScreen(
    provinceSummary.totalTb,
    provinceSummary.totalScreened
  );
  const otherNns = numberNeededToScreen(otherTb, otherScreened);

  const rrVsOther = relativeRiskWithCI(
    pnkSummary.totalTb,
    pnkSummary.totalScreened,
    otherTb,
    otherScreened
  );

  const popRate = populationRatePer100k(
    pnkSummary.totalTb,
    populationDenominator
  );

  // Chronic DM/CKD vs Other Risk Groups in Phon Na Kaeo
  const dmCkdRecords = pnkRecords.filter(
    (r) => r.riskCategory === 'chronic_dm_ckd'
  );
  const otherGroupRecords = pnkRecords.filter(
    (r) => r.riskCategory !== 'chronic_dm_ckd'
  );
  const dmSummary = computeProvinceSummary(dmCkdRecords);
  const otherGroupSummary = computeProvinceSummary(otherGroupRecords);
  const rrChronicVsOther = relativeRiskWithCI(
    otherGroupSummary.totalTb,
    otherGroupSummary.totalScreened,
    dmSummary.totalTb,
    dmSummary.totalScreened
  );

  const forestPlotItems = [
    {
      label: 'รพ.โพนนาแก้ว',
      sub: `${pnkSummary.totalTb} จาก ${pnkSummary.totalScreened.toLocaleString()} ราย`,
      ci: pnkCi,
      highlight: true,
    },
    {
      label: 'รพ.วานรนิวาส',
      sub: `${wanorn?.tbDiagnosed ?? 4} จาก ${(wanorn?.screened ?? 660).toLocaleString()} ราย`,
      ci: wanornCi,
      highlight: false,
    },
    {
      label: 'ภาพรวมจังหวัดสกลนคร',
      sub: `${provinceSummary.totalTb} จาก ${provinceSummary.totalScreened.toLocaleString()} ราย`,
      ci: provCi,
      highlight: false,
    },
    {
      label: 'รพ.อื่น ๆ รวม (ไม่รวมโพนนาแก้ว)',
      sub: `${otherTb} จาก ${otherScreened.toLocaleString()} ราย`,
      ci: otherCi,
      highlight: false,
    },
  ];
  const forestMaxScale = Math.max(
    20,
    ...forestPlotItems.map((item) => Math.ceil(item.ci.per1000Upper + 2))
  );

  const cascadeSteps = [
    {
      label: 'คัดกรองทั้งหมด',
      count: pnkSummary.totalScreened,
      pct: '100%',
      barPct: 100,
      color: 'bg-blue-950',
    },
    {
      label: 'ตรวจภาพรังสีทรวงอก (CXR)',
      count: pnkSummary.totalCxrDone,
      pct: `${
        pnkSummary.totalScreened > 0
          ? Math.round((pnkSummary.totalCxrDone / pnkSummary.totalScreened) * 100)
          : 0
      }%`,
      barPct:
        pnkSummary.totalScreened > 0
          ? Math.round((pnkSummary.totalCxrDone / pnkSummary.totalScreened) * 100)
          : 0,
      color: 'bg-sky-600',
    },
    {
      label: 'พบ CXR ผิดปกติ',
      count: pnkSummary.totalAbnormalCxr,
      pct: `${pnkSummary.abnormalCxrPct}%`,
      barPct: Math.max(6, Math.round(pnkSummary.abnormalCxrPct * 4)),
      color: 'bg-amber-600',
    },
    {
      label: 'มีอาการสงสัยวัณโรค',
      count: pnkSummary.totalSymptomatic,
      pct: `${pnkSummary.symptomaticPct}%`,
      barPct: Math.max(4, Math.round(pnkSummary.symptomaticPct * 4)),
      color: 'bg-emerald-600',
    },
    {
      label: 'วินิจฉัยเป็นวัณโรค (TB)',
      count: pnkSummary.totalTb,
      pct: `${pnkSummary.tbPct}%`,
      barPct: Math.max(3, Math.round(pnkSummary.tbPct * 12)),
      color: 'bg-red-700',
    },
    {
      label: 'ยืนยันผลห้องปฏิบัติการ (AFB+)',
      count: pnkSummary.totalAfbPositive,
      pct: `${
        pnkSummary.totalTb > 0
          ? Math.round((pnkSummary.totalAfbPositive / pnkSummary.totalTb) * 100)
          : 0
      }% ของ TB`,
      barPct: 2,
      color: 'bg-red-900',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-blue-950">
          การวิเคราะห์เชิงระบาดวิทยา รพ.โพนนาแก้ว
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          ข้อมูล ExportACF {reportDateLabel} · ข้อมูลเป็นระดับกลุ่มเสี่ยง ไม่มีอายุ เพศ พื้นที่ หรือวันที่รายบุคคล จึงวิเคราะห์ตามกลุ่มเสี่ยงและเวลาสะสมเท่านั้น
        </p>
      </div>

      {/* 4 Epidemiological KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-sky-200/80 border-t-2 border-t-blue-700 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            TB ต่อการคัดกรอง 1,000 ราย
          </div>
          <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-blue-800">
            {pnkCi.per1000}
          </div>
          <div className="mt-2 text-xs font-mono tabular-nums text-slate-600">
            95% CI {pnkCi.per1000Lower}–{pnkCi.per1000Upper} ({pnkSummary.totalTb}{' '}
            จาก {pnkSummary.totalScreened.toLocaleString()})
          </div>
        </div>

        <div className="bg-white border border-sky-200/80 border-t-2 border-t-sky-500 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            ค่าจังหวัด ต่อ 1,000 ราย
          </div>
          <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-sky-900">
            {provCi.per1000}
          </div>
          <div className="mt-2 text-xs font-mono tabular-nums text-slate-600">
            95% CI {provCi.per1000Lower}–{provCi.per1000Upper} (
            {provinceSummary.totalTb} จาก{' '}
            {provinceSummary.totalScreened.toLocaleString()})
          </div>
        </div>

        <div className="bg-white border border-sky-200/80 border-t-2 border-t-emerald-600 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            คัดกรองกี่รายจึงพบ TB 1 ราย (NNS)
          </div>
          <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-emerald-700">
            {pnkNns}
          </div>
          <div className="mt-2 text-xs font-mono tabular-nums text-slate-600">
            จังหวัด {provNns} · รพ.อื่น {otherNns}
          </div>
        </div>

        <div className="bg-white border border-sky-200/80 border-t-2 border-t-red-600 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            อัตราพบเทียบ รพ.อื่น (Relative Risk)
          </div>
          <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-red-700">
            {rrVsOther.rr}×
          </div>
          <div className="mt-2 text-xs font-mono tabular-nums text-slate-600">
            RR 95% CI {rrVsOther.lower95}–{rrVsOther.upper95} (p{' '}
            {rrVsOther.pValueApprox})
          </div>
        </div>
      </div>

      {/* Interactive Population Rate Calculator */}
      <section className="bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 space-y-2">
            <h2 className="text-base font-bold text-blue-950">
              อัตราการพบ TB ต่อประชากร 100,000 คน (คำนวณอัตโนมัติ)
            </h2>
            <label
              htmlFor="population-denominator-input"
              className="block text-xs font-medium text-slate-700"
            >
              ประชากรอำเภอโพนนาแก้ว (คน) — ค่าตั้งต้น 36,955 คน (ประชากร ณ 1 ม.ค. 2568)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="population-denominator-input"
                type="number"
                min={100}
                max={10000000}
                value={populationDenominator}
                onChange={(e) => {
                  const val = Math.max(100, Number(e.target.value) || 100);
                  onChangePopulationDenominator(val);
                }}
                className="w-48 h-10 px-3 text-base font-mono tabular-nums font-semibold bg-sky-50/50 border border-sky-200 rounded-lg text-blue-950 focus:bg-white focus:border-blue-700 focus:outline-none"
              />
              {populationDenominator !== DEFAULT_POPULATION_PHON_NA_KAEO && (
                <button
                  type="button"
                  onClick={() =>
                    onChangePopulationDenominator(DEFAULT_POPULATION_PHON_NA_KAEO)
                  }
                  className="h-10 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-blue-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>ค่าตั้งต้น (36,955)</span>
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-sky-50/65 border border-sky-200/80 rounded-xl">
            <div>
              <div className="text-xs text-slate-600">อัตราพบต่อ 100,000 ประชากร</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-blue-800 mt-1">
                {popRate.ratePer100k}
              </div>
              <div className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                95% CI {popRate.lower95}–{popRate.upper95}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-600">สัดส่วนประชากรที่คัดกรอง</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                {((pnkSummary.totalScreened / populationDenominator) * 100).toFixed(2)}%
              </div>
              <div className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                {pnkSummary.totalScreened.toLocaleString()} /{' '}
                {populationDenominator.toLocaleString()} คน
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-600">จำนวนผู้ป่วย TB ที่พบ</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-red-700 mt-1">
                {pnkSummary.totalTb} ราย
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                ในช่วงคัดกรองเชิงรุก 21 วัน
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-4 leading-relaxed">
          หมายเหตุเชิงระเบียบวิธี: เป็นอัตราการพบจากการคัดกรองเชิงรุกในช่วงประมาณ 21 วัน (16 ต.ค.–6 พ.ย. 2569) ไม่ใช่อัตราป่วยรายปี (incidence) และรวมผู้ที่ป่วยอยู่ก่อนคัดกรอง จึงเทียบตรง ๆ กับอัตราป่วยรายปีของประเทศไม่ได้ · ผู้ถูกคัดกรองอาจไม่ใช่ผู้อาศัยในอำเภอทั้งหมด · ช่วงความเชื่อมั่นใช้วิธี Wilson
        </p>
      </section>

      {/* Forest Plot (95% CI) + Chronic Disease vs Other Groups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forest Plot */}
        <section className="bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5 sm:p-6">
          <h2 className="text-base font-bold text-blue-950">
            อัตราพบ TB ต่อ 1,000 ราย (95% CI)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-5">
            โพนนาแก้วและวานรนิวาสมีอัตราใกล้เคียงกัน (ช่วงความเชื่อมั่นซ้อนทับ) และสูงกว่าค่ารวม รพ.อื่น ๆ แต่จำนวนผู้ป่วยน้อย ช่วงความเชื่อมั่นจึงกว้าง
          </p>

          <div className="space-y-4">
            {forestPlotItems.map((item) => {
              const leftPct = Math.min(
                100,
                (item.ci.per1000Lower / forestMaxScale) * 100
              );
              const rightPct = Math.min(
                100,
                (item.ci.per1000Upper / forestMaxScale) * 100
              );
              const pointPct = Math.min(
                100,
                (item.ci.per1000 / forestMaxScale) * 100
              );

              return (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span
                        className={`font-semibold ${
                          item.highlight ? 'text-blue-800' : 'text-blue-950'
                        }`}
                      >
                        {item.label}
                      </span>
                      <span className="text-slate-400 ml-2 font-mono tabular-nums">
                        ({item.sub})
                      </span>
                    </div>
                    <div className="font-mono tabular-nums text-xs">
                      <strong className="text-blue-950">
                        {item.ci.per1000}
                      </strong>{' '}
                      <span className="text-slate-500">
                        (CI {item.ci.per1000Lower}–{item.ci.per1000Upper})
                      </span>
                    </div>
                  </div>

                  {/* Whisker / Error Bar Track */}
                  <div className="relative h-6 bg-sky-50/55 border border-sky-100 rounded-md flex items-center px-2">
                    {/* Reference vertical hairline for provincial rate */}
                    <div
                      className="absolute top-0 bottom-0 w-px bg-emerald-600/70"
                      style={{
                        left: `${(provCi.per1000 / forestMaxScale) * 100}%`,
                      }}
                      title={`ค่าเฉลี่ยจังหวัด ${provCi.per1000}`}
                    />
                    {/* Horizontal CI whisker */}
                    <div
                      className={`absolute h-0.5 ${
                        item.highlight ? 'bg-blue-700' : 'bg-sky-700/80'
                      }`}
                      style={{
                        left: `${leftPct}%`,
                        width: `${Math.max(1, rightPct - leftPct)}%`,
                      }}
                    />
                    {/* Left cap */}
                    <div
                      className={`absolute w-0.5 h-2.5 ${
                        item.highlight ? 'bg-blue-700' : 'bg-sky-700/80'
                      }`}
                      style={{ left: `${leftPct}%` }}
                    />
                    {/* Right cap */}
                    <div
                      className={`absolute w-0.5 h-2.5 ${
                        item.highlight ? 'bg-blue-700' : 'bg-sky-700/80'
                      }`}
                      style={{ left: `${rightPct}%` }}
                    />
                    {/* Point estimate square */}
                    <div
                      className={`absolute w-2.5 h-2.5 -ml-1 rounded-xs ${
                        item.highlight ? 'bg-blue-700' : 'bg-sky-800'
                      }`}
                      style={{ left: `${pointPct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-400 pt-1">
              <span>0</span>
              <span>{Math.round(forestMaxScale * 0.25)}</span>
              <span>{Math.round(forestMaxScale * 0.5)}</span>
              <span>{Math.round(forestMaxScale * 0.75)}</span>
              <span>{forestMaxScale} ต่อ 1,000</span>
            </div>
          </div>
        </section>

        {/* Chronic Disease vs Other Groups Comparison */}
        <section className="bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-blue-950">
              กลุ่มโรคเรื้อรัง เทียบกับกลุ่มอื่น (รพ.โพนนาแก้ว)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              เปรียบเทียบ เบาหวาน/สูงอายุ+เบาหวาน/CKD ({dmSummary.totalScreened} ราย) กับกลุ่มอื่น ({otherGroupSummary.totalScreened} ราย)
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-sky-50/60 border border-sky-200/80 rounded-xl space-y-2">
                <div className="text-xs font-semibold text-blue-950">
                  เบาหวาน / สูงอายุ+เบาหวาน / CKD
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-blue-900">
                  {dmSummary.totalScreened} ราย
                </div>
                <div className="text-xs text-sky-700 font-mono tabular-nums">
                  87.6% ของการคัดกรอง
                </div>
                <div className="pt-2 border-t border-sky-200/80 space-y-1 text-xs font-mono tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-slate-500">CXR ผิดปกติ:</span>
                    <span className="font-semibold text-blue-950">
                      {dmSummary.totalAbnormalCxr} ({dmSummary.abnormalCxrPct}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">พบ TB:</span>
                    <span className="font-semibold text-blue-950">
                      {dmSummary.totalTb} ราย (29%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">TB ต่อ 1,000:</span>
                    <span className="font-semibold text-blue-950">
                      {dmSummary.tbRatePer1000}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50/55 border border-emerald-200 rounded-xl space-y-2">
                <div className="text-xs font-semibold text-emerald-950">
                  กลุ่มเสี่ยงอื่นและนอกกลุ่มเสี่ยง
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-emerald-900">
                  {otherGroupSummary.totalScreened} ราย
                </div>
                <div className="text-xs text-emerald-700 font-mono tabular-nums">
                  12.4% ของการคัดกรอง
                </div>
                <div className="pt-2 border-t border-emerald-200 space-y-1 text-xs font-mono tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-slate-600">CXR ผิดปกติ:</span>
                    <span className="font-semibold text-amber-800">
                      {otherGroupSummary.totalAbnormalCxr} (
                      {otherGroupSummary.abnormalCxrPct}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">พบ TB:</span>
                    <span className="font-semibold text-red-700">
                      {otherGroupSummary.totalTb} ราย (71%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">TB ต่อ 1,000:</span>
                    <span className="font-semibold text-red-700">
                      {otherGroupSummary.tbRatePer1000}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3.5 bg-sky-50/55 border border-sky-200/80 rounded-lg text-xs text-slate-700 font-mono tabular-nums">
            TB ต่อ 1,000: <strong>{dmSummary.tbRatePer1000}</strong> เทียบ{' '}
            <strong>{otherGroupSummary.tbRatePer1000}</strong> · CXR ผิดปกติ{' '}
            <strong>{dmSummary.abnormalCxrPct}%</strong> เทียบ{' '}
            <strong>{otherGroupSummary.abnormalCxrPct}%</strong> · RR ของ TB ={' '}
            <strong className="text-red-700">
              17.7 (95% CI {rrChronicVsOther.lower95}–{rrChronicVsOther.upper95})
            </strong>
          </div>
        </section>
      </div>

      {/* Cascade Funnel + TB Detected Groups + Cumulative Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cascade Funnel */}
        <section className="lg:col-span-5 bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5 sm:p-6">
          <h2 className="text-base font-bold text-blue-950">
            ลำดับการค้นหาผู้ป่วย (Cascade)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            ทุกรายตรวจ CXR ({pnkSummary.totalCxrDone}/{pnkSummary.totalScreened}) แต่ส่งตรวจ AFB เพียง {pnkSummary.totalAfbPositive} ราย (บวกทั้ง 2) และ Xpert {pnkSummary.totalXpertPositive}
          </p>

          <div className="space-y-3">
            {cascadeSteps.map((step) => (
              <div key={step.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-slate-800">{step.label}</span>
                  <span className="font-mono tabular-nums font-semibold text-blue-950">
                    {step.count.toLocaleString()} ({step.pct})
                  </span>
                </div>
                <div className="w-full h-2.5 bg-sky-50 rounded-sm overflow-hidden">
                  <div
                    className={`h-full rounded-sm ${step.color}`}
                    style={{ width: `${step.barPct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Groups where TB was detected & Cumulative Timeline */}
        <section className="lg:col-span-7 bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-blue-950">
              กลุ่มที่พบ TB ({pnkSummary.totalTb} ราย) และลำดับเวลาสะสม
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              กลุ่ม n ≤ 6 มีตัวอย่างน้อยมาก อัตราต่อ 1,000 ไม่เสถียร
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-sky-50/70 border-b border-sky-200/80 text-blue-950">
                  <th className="py-2 px-3 text-left font-semibold">กลุ่มเสี่ยงที่พบ TB</th>
                  <th className="py-2 px-3 text-right font-semibold">คัดกรอง (n)</th>
                  <th className="py-2 px-3 text-right font-semibold">CXR ผิดปกติ</th>
                  <th className="py-2 px-3 text-right font-semibold">พบ TB</th>
                  <th className="py-2 px-3 text-right font-semibold">อัตราต่อ 1,000</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100">
                {pnkRiskGroups.map((rg) => (
                  <tr key={rg.riskGroupId} className="hover:bg-sky-50/45">
                    <td className="py-2 px-3 font-medium text-blue-950">
                      {rg.riskGroupName}
                      {rg.screened <= 6 && (
                        <span className="text-[11px] text-amber-700 ml-1.5">
                          (n น้อย)
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-sky-900">
                      {rg.screened}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-amber-700">
                      {rg.abnormalCxr}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-red-700">
                      {rg.tbDiagnosed} ราย
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-blue-950">
                      {rg.tbRatePer1000}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cumulative Timeline Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-sky-100">
            <div className="p-3.5 bg-sky-50/55 border border-sky-200/80 rounded-lg">
              <div className="text-xs font-semibold text-blue-950">
                ช่วงก่อน 27 ต.ค. 2569 (สะสม)
              </div>
              <div className="mt-1 text-sm font-mono tabular-nums text-slate-900">
                คัดกรอง <strong>479</strong> ราย · พบ TB <strong>2</strong> ราย (
                <strong>4.2</strong> ต่อ 1,000)
              </div>
            </div>
            <div className="p-3.5 bg-sky-50/55 border border-sky-200/80 rounded-lg">
              <div className="text-xs font-semibold text-blue-950">
                ช่วงหลัง 27 ต.ค.–6 พ.ย. 2569
              </div>
              <div className="mt-1 text-sm font-mono tabular-nums text-slate-900">
                คัดกรองเพิ่ม <strong>351</strong> ราย · พบ TB เพิ่ม{' '}
                <strong className="text-red-700">5</strong> ราย (
                <strong className="text-red-700">14.2</strong> ต่อ 1,000)
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Epidemiological Interpretation & Limitations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5 sm:p-6">
          <h2 className="text-base font-bold text-blue-950 mb-3">
            การแปลผลทางระบาดวิทยา
          </h2>
          <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed list-disc pl-5">
            <li>
              <strong>ภาระโรคกระจุกตัวนอกกลุ่มเบาหวาน/CKD:</strong> กลุ่มโรคเรื้อรังนี้เป็น 88% ของการคัดกรอง แต่พบ TB เพียง 29% ของผู้ป่วย ส่วนกลุ่มอื่น (12% ของการคัดกรอง) พบถึง 71%
            </li>
            <li>
              <strong>การสอบสวนผู้สัมผัสและกลุ่มก้อน:</strong> ผู้ป่วย 2 ราย อยู่ในกลุ่ม &ldquo;ไม่มีความเสี่ยง&rdquo; และผู้ป่วยอีก 1 รายเป็นผู้สัมผัสใกล้ชิดนอกบ้าน ควรสอบสวนหาความเชื่อมโยงของผู้สัมผัส (อาจเป็นกลุ่มก้อน) ก่อนสรุปว่าเป็นการแพร่ในชุมชน
            </li>
            <li>
              <strong>อัตรา CXR ผิดปกติรวมสูงกว่า รพ.อื่น 2.1 เท่า:</strong> CXR ผิดปกติในกลุ่มเบาหวาน/CKD อยู่ที่ 2.2% ซึ่งต่ำกว่าค่าจังหวัด (2.7%) ส่วนอัตรา CXR ผิดปกติรวมของ รพ. (4.8%) สูงกว่า รพ.อื่น 2.1 เท่า (CI 1.5–3.0) เพราะกลุ่มขนาดเล็กที่ผิดปกติสูง
            </li>
          </ul>
        </section>

        <section className="bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)] rounded-xl p-5 sm:p-6">
          <h2 className="text-base font-bold text-blue-950 mb-3">
            ข้อจำกัดและข้อมูลที่ควรเพิ่ม
          </h2>
          <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed list-disc pl-5">
            <li>
              จำนวนผู้ป่วยน้อย (7 ราย) ช่วงความเชื่อมั่นกว้าง ไม่ควรสรุปแนวโน้มระยะยาว และผลอาจเปลี่ยนเมื่อมีข้อมูลเพิ่ม
            </li>
            <li>
              ยังไม่มีอายุ เพศ ตำบล/หมู่บ้าน วันที่วินิจฉัย ผลยืนยัน และความสัมพันธ์กับผู้ป่วยดัชนี จึงวิเคราะห์ บุคคล/สถานที่ ไม่ได้
            </li>
            <li>
              แนะนำให้ส่งตรวจ AFB/Xpert ในผู้ CXR ผิดปกติทุกราย และทำแผนที่ผู้ป่วยตามตำบล พร้อมสอบสวนผู้สัมผัสของผู้ป่วยทั้ง 7 ราย
            </li>
          </ul>
          <p className="text-xs text-slate-400 mt-4 pt-3 border-t border-slate-100">
            ช่วงความเชื่อมั่นใช้วิธี Wilson (สัดส่วน) และ log(RR) · &ldquo;รพ.อื่น&rdquo; = จังหวัดไม่รวมโพนนาแก้ว · เป็นการวิเคราะห์เบื้องต้นจากข้อมูลคัดกรอง ไม่ใช่การสอบสวนโรค
          </p>
        </section>
      </div>
    </div>
  );
};
