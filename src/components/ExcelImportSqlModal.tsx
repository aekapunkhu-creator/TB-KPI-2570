import React, { useMemo, useState } from 'react';
import {
  Database,
  Download,
  FileSpreadsheet,
  Play,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import { DatasetSnapshot, HospitalRiskRecord } from '../types/tb';
import {
  buildDatasetFromExcelRows,
  downloadSampleExcelWorkbook,
  ExcelColumnMapping,
  inspectExcelBuffer,
  ParsedExcelPreview,
} from '../utils/excelParser';
import { runRelationalSqlQuery } from '../utils/analytics';

interface ExcelImportSqlModalProps {
  isOpen: boolean;
  initialTab: 'import' | 'sql';
  onClose: () => void;
  currentSnapshot: DatasetSnapshot;
  filteredRecords: HospitalRiskRecord[];
  onApplyImportedSnapshot: (next: DatasetSnapshot) => void;
  onResetToBaseline: () => void;
}

const PRESET_SQL_QUERIES = [
  {
    label: 'สรุปยอดคัดกรองและ TB รายโรงพยาบาล',
    sql: 'SELECT hospital_name, SUM(screened), SUM(symptomatic), SUM(abnormal_cxr), SUM(tb_diagnosed) FROM screening_records GROUP BY hospital_name ORDER BY total_screened DESC LIMIT 18',
  },
  {
    label: 'จัดอันดับกลุ่มเสี่ยงตามอัตรา CXR ผิดปกติ',
    sql: 'SELECT risk_group_name, SUM(screened), SUM(abnormal_cxr), SUM(tb_diagnosed) FROM screening_records GROUP BY risk_group_name ORDER BY abnormal_cxr_pct DESC LIMIT 15',
  },
  {
    label: 'เจาะลึก รพ.โพนนาแก้ว แยกรายกลุ่มเสี่ยง',
    sql: "SELECT risk_group_name, screened, symptomatic, abnormal_cxr, tb_diagnosed, afb_positive FROM screening_records WHERE hospital_name = 'รพ.โพนนาแก้ว' ORDER BY screened DESC",
  },
  {
    label: 'เฉพาะรายการที่วินิจฉัยพบผู้ป่วย TB',
    sql: 'SELECT hospital_name, risk_group_name, screened, abnormal_cxr, tb_diagnosed, afb_positive FROM screening_records WHERE tb_diagnosed > 0 ORDER BY tb_diagnosed DESC',
  },
];

export const ExcelImportSqlModal: React.FC<ExcelImportSqlModalProps> = ({
  isOpen,
  initialTab,
  onClose,
  currentSnapshot,
  filteredRecords,
  onApplyImportedSnapshot,
  onResetToBaseline,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'sql'>(initialTab);
  const [preview, setPreview] = useState<ParsedExcelPreview | null>(null);
  const [mapping, setMapping] = useState<ExcelColumnMapping | null>(null);
  const [reportDateLabel, setReportDateLabel] = useState('7 พ.ย. 2569');
  const [parseError, setParseError] = useState<string | null>(null);
  const [rawBuffer, setRawBuffer] = useState<ArrayBuffer | null>(null);

  const [sqlText, setSqlText] = useState(PRESET_SQL_QUERIES[0].sql);
  const [executedSql, setExecutedSql] = useState(PRESET_SQL_QUERIES[0].sql);

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  const sqlResult = useMemo(
    () => runRelationalSqlQuery(filteredRecords, executedSql),
    [filteredRecords, executedSql]
  );

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);

    try {
      const buf = await file.arrayBuffer();
      const parsed = inspectExcelBuffer(buf, file.name);
      if (parsed.headers.length === 0 || parsed.rawRows.length === 0) {
        setParseError('ไม่พบข้อมูลตารางในไฟล์ Excel ที่เลือก กรุณาตรวจสอบไฟล์อีกครั้ง');
        return;
      }
      setRawBuffer(buf);
      setPreview(parsed);
      setMapping(parsed.suggestedMapping);
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : 'ไม่สามารถอ่านไฟล์ Excel ได้'
      );
    }
  };

  const handleSheetChange = (sheetName: string) => {
    if (!rawBuffer || !preview) return;
    const parsed = inspectExcelBuffer(rawBuffer, preview.fileName, sheetName);
    setPreview(parsed);
    setMapping(parsed.suggestedMapping);
  };

  const handleConfirmImport = () => {
    if (!preview || !mapping) return;
    const nextSnapshot = buildDatasetFromExcelRows(
      preview,
      mapping,
      reportDateLabel,
      currentSnapshot
    );
    if (nextSnapshot.records.length === 0) {
      setParseError(
        'ไม่สามารถจับคู่แถวข้อมูลได้ กรุณาตรวจสอบคอลัมน์ "หน่วยบริการ" และ "กลุ่มเสี่ยง"'
      );
      return;
    }
    onApplyImportedSnapshot(nextSnapshot);
    setPreview(null);
    onClose();
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-sql-modal-title"
    >
      <div className="w-full max-w-5xl max-h-[90vh] bg-white border border-sky-200/80 shadow-2xl rounded-xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-sky-200/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <h2
              id="import-sql-modal-title"
              className="text-base sm:text-lg font-bold text-blue-950"
            >
              จัดการข้อมูล Excel และฐานข้อมูล SQL
            </h2>
            <div className="flex items-center gap-1 p-1 bg-sky-100/75 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab('import')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeTab === 'import'
                    ? 'bg-white text-blue-800 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-blue-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
                <span>นำเข้าไฟล์ Excel</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sql')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeTab === 'sql'
                    ? 'bg-white text-blue-800 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-blue-900'
                }`}
              >
                <Database className="w-3.5 h-3.5" aria-hidden="true" />
                <span>สืบค้นข้อมูล SQL</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างจัดการข้อมูล"
            className="p-2 text-slate-500 hover:text-blue-950 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'import' ? (
            <div className="space-y-6">
              {/* Top Action Bar: Download Template & Reset */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-sky-50/55 border border-sky-200/80 rounded-xl">
                <div>
                  <h3 className="text-sm font-semibold text-blue-950">
                    นำเข้าไฟล์รายงาน ExportACF (.xlsx, .xls, .csv)
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    ระบบจะอ่านตาราง ตรวจสอบการเปลี่ยนแปลงเทียบกับข้อมูลเดิม และอัปเดตกราฟทั้ง 5 หน้าอัตโนมัติ
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => downloadSampleExcelWorkbook(currentSnapshot)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-800 bg-white border border-emerald-200 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>ดาวน์โหลดไฟล์ตัวอย่าง (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onResetToBaseline();
                      setPreview(null);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-sky-200 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>คืนค่าข้อมูล 6 พ.ย. 2569</span>
                  </button>
                </div>
              </div>

              {/* File Upload Input */}
              <div className="border-2 border-dashed border-sky-300 hover:border-blue-600 bg-sky-50/25 rounded-xl p-6 text-center transition-colors">
                <Upload
                  className="w-8 h-8 text-blue-700 mx-auto mb-2"
                  aria-hidden="true"
                />
                <label
                  htmlFor="excel-file-input"
                  className="block text-sm font-semibold text-blue-950 cursor-pointer"
                >
                  เลือกไฟล์ Excel จากเครื่องของคุณ (.xlsx, .xls, .csv)
                </label>
                <p className="text-xs text-slate-500 mt-1">
                  รองรับคอลัมน์ภาษาไทยและภาษาอังกฤษ เช่น หน่วยบริการ, กลุ่มเสี่ยง, คัดกรองทั้งหมด, มีอาการ, CXR ผิดปกติ, วินิจฉัยเป็น TB
                </p>
                <input
                  id="excel-file-input"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="mt-4 block mx-auto text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-700 file:text-white hover:file:bg-blue-800 cursor-pointer"
                />
              </div>

              {parseError && (
                <div
                  role="alert"
                  className="p-3.5 text-xs sm:text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg"
                >
                  {parseError}
                </div>
              )}

              {/* Column Mapping & Preview Table */}
              {preview && mapping && (
                <div className="space-y-4 border border-slate-200 rounded-xl p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        ตรวจสอบการจับคู่คอลัมน์: {preview.fileName}
                      </h4>
                      <p className="text-xs text-slate-500">
                        พบทั้งหมด {preview.rawRows.length.toLocaleString()} แถว · {preview.headers.length} คอลัมน์
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {preview.sheetNames.length > 1 && (
                        <div>
                          <label
                            htmlFor="sheet-select"
                            className="text-xs text-slate-600 mr-2"
                          >
                            ชีต:
                          </label>
                          <select
                            id="sheet-select"
                            value={preview.selectedSheet}
                            onChange={(e) => handleSheetChange(e.target.value)}
                            className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                          >
                            {preview.sheetNames.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
                        <label
                          htmlFor="report-date-input"
                          className="text-xs text-slate-600 mr-2"
                        >
                          วันที่รายงาน:
                        </label>
                        <input
                          id="report-date-input"
                          type="text"
                          value={reportDateLabel}
                          onChange={(e) => setReportDateLabel(e.target.value)}
                          className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg w-32"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(
                      [
                        { key: 'hospitalName', label: 'หน่วยบริการ / รพ. *' },
                        { key: 'riskGroupName', label: 'กลุ่มเสี่ยง *' },
                        { key: 'screened', label: 'คัดกรองทั้งหมด *' },
                        { key: 'symptomatic', label: 'มีอาการ' },
                        { key: 'abnormalCxr', label: 'CXR ผิดปกติ' },
                        { key: 'tbDiagnosed', label: 'วินิจฉัยเป็น TB' },
                        { key: 'afbPositive', label: 'AFB+' },
                        { key: 'xpertPositive', label: 'Xpert' },
                      ] as const
                    ).map((field) => (
                      <div key={field.key}>
                        <label className="block text-xs text-slate-600 mb-1">
                          {field.label}
                        </label>
                        <select
                          value={mapping[field.key] || ''}
                          onChange={(e) =>
                            setMapping({
                              ...mapping,
                              [field.key]: e.target.value,
                            })
                          }
                          className="w-full h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                        >
                          <option value="">-- ไม่ระบุ --</option>
                          {preview.headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setPreview(null)}
                      className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-blue-950"
                    >
                      ยกเลิกไฟล์นี้
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      className="px-5 py-2 text-xs sm:text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                    >
                      ยืนยันนำเข้าและวิเคราะห์ข้อมูล
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preset SQL Queries */}
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_SQL_QUERIES.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setSqlText(preset.sql);
                      setExecutedSql(preset.sql);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-blue-900 bg-sky-50 hover:bg-sky-100 border border-sky-200/80 rounded-lg transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* SQL Editor */}
              <div className="space-y-2">
                <label
                  htmlFor="sql-query-input"
                  className="block text-xs font-medium text-slate-600"
                >
                  คำสั่ง SQL (ตาราง <code className="font-mono">screening_records</code> — รองรับ SELECT, WHERE, GROUP BY, ORDER BY, LIMIT)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="sql-query-input"
                    type="text"
                    value={sqlText}
                    onChange={(e) => setSqlText(e.target.value)}
                    className="flex-1 h-10 px-3 text-xs sm:text-sm font-mono bg-sky-50/40 border border-sky-200 rounded-lg text-blue-950 focus:bg-white focus:border-blue-700 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setExecutedSql(sqlText)}
                    className="h-10 px-4 inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg shrink-0 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>รันคำสั่ง SQL</span>
                  </button>
                </div>
              </div>

              {sqlResult.error ? (
                <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
                  {sqlResult.error}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      ผลลัพธ์ทั้งหมด{' '}
                      <strong className="font-mono tabular-nums text-slate-900">
                        {sqlResult.rowCount}
                      </strong>{' '}
                      แถว
                    </span>
                    <span className="font-mono tabular-nums">
                      เวลาประมวลผล {sqlResult.executionTimeMs} ms
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-[45vh]">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                        <tr>
                          {sqlResult.columns.map((col) => (
                            <th
                              key={col}
                              className="py-2.5 px-3 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sqlResult.rows.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            {sqlResult.columns.map((col) => {
                              const val = row[col];
                              const isNum = typeof val === 'number';
                              return (
                                <td
                                  key={col}
                                  className={`py-2 px-3 whitespace-nowrap ${
                                    isNum
                                      ? 'font-mono tabular-nums text-right text-slate-800'
                                      : 'text-slate-900'
                                  }`}
                                >
                                  {isNum ? val.toLocaleString() : String(val)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
