import React from 'react';
import { DatasetSnapshot, HospitalRiskRecord } from '../types/tb';
import { Page1ProvinceOverview } from './Page1ProvinceOverview';
import { Page2HospitalDeepDive } from './Page2HospitalDeepDive';
import { Page3HospitalReport } from './Page3HospitalReport';
import { Page4Epidemiology } from './Page4Epidemiology';
import { Page5Targets2570 } from './Page5Targets2570';

interface FullReportPrintViewProps {
  snapshot: DatasetSnapshot;
  filteredRecords: HospitalRiskRecord[];
  focusHospitalName: string;
  populationDenominator: number;
}

export const FullReportPrintView: React.FC<FullReportPrintViewProps> = ({
  snapshot,
  filteredRecords,
  focusHospitalName,
  populationDenominator,
}) => {
  return (
    <div className="bg-white p-8 space-y-12 max-w-[1200px] mx-auto">
      <div className="border-b-2 border-blue-700 pb-4">
        <div className="text-xs font-mono text-blue-800 font-semibold">
          รายงานสถานการณ์และระบาดวิทยาวัณโรคเชิงรุก (ExportACF) · สำนักงานสาธารณสุขจังหวัดสกลนคร เขตสุขภาพที่ 8
        </div>
        <h1 className="text-2xl font-bold text-blue-950 mt-1">
          {snapshot.name} — ข้อมูล ณ {snapshot.reportDateLabel}
        </h1>
      </div>

      <Page1ProvinceOverview
        records={filteredRecords}
        allRecords={snapshot.records}
        monthlyTrends={snapshot.monthlyTrends}
        reportDateLabel={snapshot.reportDateLabel}
        comparisonDateLabel={snapshot.comparisonDateLabel}
        fileName={snapshot.fileName}
        onSelectHospitalFilter={() => {}}
        onNavigateToHospitalReport={() => {}}
      />

      <div className="print-break-before pt-6 border-t border-sky-200">
        <Page2HospitalDeepDive
          records={filteredRecords}
          onNavigateToHospitalReport={() => {}}
        />
      </div>

      <div className="print-break-before pt-6 border-t border-sky-200">
        <Page3HospitalReport
          allRecords={snapshot.records}
          dailyTrends={snapshot.dailyTrends}
          reportDateLabel={snapshot.reportDateLabel}
          focusHospitalName={focusHospitalName}
          onChangeFocusHospital={() => {}}
        />
      </div>

      <div className="print-break-before pt-6 border-t border-sky-200">
        <Page4Epidemiology
          allRecords={snapshot.records}
          reportDateLabel={snapshot.reportDateLabel}
          populationDenominator={populationDenominator}
          onChangePopulationDenominator={() => {}}
        />
      </div>

      <div className="print-break-before pt-6 border-t border-sky-200">
        <Page5Targets2570
          indicators={snapshot.fy2570Indicators}
          riskGroupTargets={snapshot.riskGroupTargets}
          quarterlyTargets={snapshot.quarterlyTargets}
          populationDenominator={populationDenominator}
        />
      </div>
    </div>
  );
};
