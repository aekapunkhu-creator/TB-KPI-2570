import React, { useState } from 'react';
import { Check, Copy, Download, Radio, SlidersHorizontal } from 'lucide-react';
import { ReportPageId } from '../types/tb';

interface ExecutiveLiveHeaderProps {
  activePage: ReportPageId;
  onSelectPage: (page: ReportPageId) => void;
  focusHospitalName: string;
  reportDateLabel: string;
  fileName: string;
  provinceScreened: number;
  provinceTb: number;
  pnkScreened: number;
  pnkTb: number;
  pnkRank: number;
  isProvinceFilteredToPnk: boolean;
  onToggleOverviewScope: (onlyPnk: boolean) => void;
  activeShareId: string | null;
  lastSyncedLabel: string | null;
  isSharePaused?: boolean;
  onCopyCurrentLink: () => void;
  onExportCurrentPdf: () => void;
  isExportingPdf: boolean;
  onExitExecutiveMode: () => void;
}

const EXEC_NAV_ITEMS: { id: ReportPageId; label: string }[] = [
  { id: 'targets2570', label: 'ตัวชี้วัด 2570' },
  { id: 'phonnakaew', label: 'ข้อมูลเฉพาะ รพ.โพนนาแก้ว' },
  { id: 'epidemiology', label: 'ระบาดวิทยา รพ.โพนนาแก้ว' },
  { id: 'overview', label: 'แนวโน้ม 12 เดือน' },
];

export const ExecutiveLiveHeader: React.FC<ExecutiveLiveHeaderProps> = ({
  activePage,
  onSelectPage,
  focusHospitalName,
  reportDateLabel,
  fileName,
  provinceScreened,
  provinceTb,
  pnkScreened,
  pnkTb,
  pnkRank,
  isProvinceFilteredToPnk,
  onToggleOverviewScope,
  activeShareId,
  lastSyncedLabel,
  isSharePaused = false,
  onCopyCurrentLink,
  onExportCurrentPdf,
  isExportingPdf,
  onExitExecutiveMode,
}) => {
  const [copiedJustNow, setCopiedJustNow] = useState(false);

  const handleCopy = () => {
    onCopyCurrentLink();
    setCopiedJustNow(true);
    window.setTimeout(() => setCopiedJustNow(false), 2500);
  };

  return (
    <div className="no-print">
      {/* Sticky Single-Row Top Bar */}
      <header className="bg-white border-t-[3px] border-t-blue-700 border-b border-sky-200/80 sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-8">
          {/* Zone 1: Brand & Executive Live Title */}
          <div className="flex items-baseline gap-2.5 min-w-0">
            <span
              className="text-sm sm:text-lg font-bold tracking-tight text-blue-950 truncate"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              สกลนคร TB Surveillance
            </span>
            <span className="hidden sm:inline text-xs font-semibold text-emerald-700 whitespace-nowrap shrink-0">
              · ผู้บริหารดูสด
            </span>
          </div>

          {/* Zone 2: Executive Focal View Tabs */}
          <nav
            aria-label="มุมมองหลักสำหรับผู้บริหาร"
            className="hidden lg:flex items-center gap-5 overflow-x-auto"
          >
            {EXEC_NAV_ITEMS.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectPage(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`py-5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ${
                    isActive
                      ? 'border-blue-700 text-blue-800 font-semibold'
                      : 'border-transparent text-slate-600 hover:text-blue-700 hover:border-sky-300'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Quick Share Copy, PDF & Analyst Mode Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium text-blue-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedJustNow ? (
                <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-blue-700 shrink-0" aria-hidden="true" />
              )}
              <span className="sm:hidden">{copiedJustNow ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}</span>
              <span className="hidden sm:inline">
                {copiedJustNow ? 'คัดลอกลิงก์แล้ว' : 'คัดลอกลิงก์สด'}
              </span>
            </button>

            <button
              type="button"
              disabled={isExportingPdf}
              onClick={onExportCurrentPdf}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50/90 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
              <span>{isExportingPdf ? 'กำลังสร้าง...' : 'PDF'}</span>
            </button>

            <button
              type="button"
              onClick={onExitExecutiveMode}
              title="สลับกลับสู่มุมมองวิเคราะห์ข้อมูลสำหรับเจ้าหน้าที่"
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>โหมดเจ้าหน้าที่</span>
            </button>
          </div>
        </div>

        {/* Mobile/Tablet Horizontal Nav Strip */}
        <nav
          aria-label="เมนูผู้บริหารสำหรับมือถือ"
          className="lg:hidden w-full flex items-center gap-4 px-3 border-t border-sky-100 overflow-x-auto"
        >
          {EXEC_NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectPage(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'border-blue-700 text-blue-800 font-semibold'
                    : 'border-transparent text-slate-600'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Executive Live Briefing Context & Scope Ribbon */}
      <section
        aria-label="สรุปสถานะการถ่ายทอดข้อมูลสดสำหรับผู้บริหาร"
        className="max-w-[1440px] mx-auto px-4 sm:px-8 pt-4 pb-1"
      >
        <div className="bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.04)] rounded-xl px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
              <Radio className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
              <span>
                {isSharePaused
                  ? 'เจ้าของลิงก์หยุดการอัปเดตชั่วคราว (แสดงข้อมูลล่าสุด)'
                  : activeShareId
                  ? `ซิงก์ข้อมูลสด Cloud แบบเรียลไทม์${
                      lastSyncedLabel ? ` (${lastSyncedLabel})` : ''
                    }`
                  : 'มุมมองผู้บริหารดูสด (อัปเดตอัตโนมัติ)'}
              </span>
            </span>
            <span aria-hidden="true" className="text-sky-300">
              ·
            </span>
            <span className="font-semibold text-blue-950">
              ข้อมูล ณ {reportDateLabel}
            </span>
            <span aria-hidden="true" className="text-sky-300">
              ·
            </span>
            <span className="truncate max-w-[200px]" title={fileName}>
              {fileName}
            </span>
            <span aria-hidden="true" className="text-sky-300">
              ·
            </span>
            <span className="font-mono tabular-nums text-blue-900">
              {focusHospitalName}: คัดกรอง{' '}
              <strong>{pnkScreened.toLocaleString()}</strong> ราย (อันดับ{' '}
              {pnkRank || 1}) · TB <strong>{pnkTb}</strong> ราย
            </span>
            <span aria-hidden="true" className="text-sky-300">
              ·
            </span>
            <span className="font-mono tabular-nums text-slate-600">
              ทั้งจังหวัด: {provinceScreened.toLocaleString()} ราย (TB{' '}
              {provinceTb} ราย)
            </span>
          </div>

          {activePage === 'overview' && (
            <div className="flex items-center gap-1 p-1 bg-sky-100/75 rounded-lg shrink-0 self-start lg:self-auto">
              <button
                type="button"
                onClick={() => onToggleOverviewScope(true)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  isProvinceFilteredToPnk
                    ? 'bg-white text-blue-800 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-blue-900'
                }`}
              >
                เฉพาะ รพ.โพนนาแก้ว
              </button>
              <button
                type="button"
                onClick={() => onToggleOverviewScope(false)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  !isProvinceFilteredToPnk
                    ? 'bg-white text-blue-800 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-blue-900'
                }`}
              >
                ภาพรวม 18 รพ.
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
