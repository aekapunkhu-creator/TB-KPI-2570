import React from 'react';
import {
  Bell,
  Cloud,
  Database,
  Download,
  LogOut,
  RotateCcw,
  Search,
  Share2,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { FilterState } from '../types/tb';

interface WorkspaceFilterRibbonProps {
  reportDateLabel: string;
  comparisonDateLabel: string;
  fileName: string;
  hospitalCount: number;
  riskGroupCount: number;
  hospitalNames: string[];
  filters: FilterState;
  onChangeFilters: (next: FilterState) => void;
  onResetFilters: () => void;
  unacknowledgedAlertsCount: number;
  onOpenAlerts: () => void;
  onOpenSqlExplorer: () => void;
  onOpenShareModal: () => void;
  onExportCurrentPdf: () => void;
  onExportFullPdf: () => void;
  isExportingPdf: boolean;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

export const WorkspaceFilterRibbon: React.FC<WorkspaceFilterRibbonProps> = ({
  reportDateLabel,
  comparisonDateLabel,
  fileName,
  hospitalCount,
  riskGroupCount,
  hospitalNames,
  filters,
  onChangeFilters,
  onResetFilters,
  unacknowledgedAlertsCount,
  onOpenAlerts,
  onOpenSqlExplorer,
  onOpenShareModal,
  onExportCurrentPdf,
  onExportFullPdf,
  isExportingPdf,
  user,
  onSignIn,
  onSignOut,
}) => {
  const hasActiveFilter =
    filters.hospitalName !== 'all' ||
    filters.riskCategory !== 'all' ||
    filters.findingFilter !== 'all' ||
    filters.searchQuery.trim() !== '';

  return (
    <section
      aria-label="แถบควบคุมและตัวกรองข้อมูลแบบเรียลไทม์"
      className="no-print max-w-[1440px] mx-auto px-4 sm:px-8 pt-5 pb-2 space-y-4"
    >
      {/* Top Context Metadata & Utility Actions Row */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
        <div className="flex flex-wrap xl:flex-nowrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 min-w-0">
          <span className="font-semibold text-blue-950 whitespace-nowrap">
            ข้อมูล ณ {reportDateLabel}
          </span>
          <span aria-hidden="true" className="text-sky-300">
            ·
          </span>
          <span className="truncate max-w-[175px]" title={fileName}>
            {fileName}
          </span>
          <span aria-hidden="true" className="text-sky-300">
            ·
          </span>
          <span className="tabular-nums whitespace-nowrap">{hospitalCount} หน่วยบริการ</span>
          <span aria-hidden="true" className="text-sky-300">
            ·
          </span>
          <span className="tabular-nums whitespace-nowrap">{riskGroupCount} กลุ่มเสี่ยง</span>
          <span aria-hidden="true" className="text-sky-300">
            ·
          </span>
          <span className="whitespace-nowrap">เทียบ {comparisonDateLabel}</span>
        </div>

        <div className="flex flex-wrap xl:flex-nowrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenAlerts}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-sky-200/90 hover:bg-sky-50/70 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
            <span>แจ้งเตือนสำคัญ</span>
            <span className="font-mono tabular-nums font-semibold text-red-700">
              ({unacknowledgedAlertsCount})
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenSqlExplorer}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-sky-200/90 hover:bg-sky-50/70 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-blue-700 shrink-0" aria-hidden="true" />
            <span>ตาราง & คิวรี SQL</span>
          </button>

          <button
            type="button"
            disabled={isExportingPdf}
            onClick={onExportCurrentPdf}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-sky-200/90 hover:bg-sky-50/70 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-sky-700 shrink-0" aria-hidden="true" />
            <span>{isExportingPdf ? 'กำลังสร้าง PDF...' : 'PDF หน้านี้'}</span>
          </button>

          <button
            type="button"
            disabled={isExportingPdf}
            onClick={onExportFullPdf}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50/90 border border-emerald-200 hover:bg-emerald-100/90 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
            <span>PDF ครบ 5 หน้า</span>
          </button>

          <button
            type="button"
            onClick={onOpenShareModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-900 bg-sky-50 border border-sky-300 hover:bg-sky-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-blue-700 shrink-0" aria-hidden="true" />
            <span>แชร์ลิงก์ผู้บริหาร</span>
          </button>

          {user ? (
            <button
              type="button"
              onClick={onSignOut}
              title={`บัญชีที่เชื่อมต่อ: ${user.email || user.displayName}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-900 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
              <span className="max-w-[110px] truncate">
                {user.displayName || user.email}
              </span>
              <LogOut className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-sky-200/90 hover:bg-sky-50/70 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5 text-sky-600 shrink-0" aria-hidden="true" />
              <span>บันทึก Cloud</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-Time Multi-Dimensional Filter Bar */}
      <div className="bg-white border border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.04)] rounded-xl p-3 sm:p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3 items-end">
          {/* Hospital Dropdown */}
          <div className="xl:col-span-3">
            <label
              htmlFor="filter-hospital"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              กรองตามหน่วยบริการ (18 รพ.)
            </label>
            <select
              id="filter-hospital"
              value={filters.hospitalName}
              onChange={(e) =>
                onChangeFilters({ ...filters, hospitalName: e.target.value })
              }
              className="w-full h-9 px-3 text-xs sm:text-sm bg-sky-50/40 border border-sky-200/90 rounded-lg text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
            >
              <option value="all">ทุกหน่วยบริการ (18 แห่ง)</option>
              {hospitalNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Risk Category Segmented Filter */}
          <div className="xl:col-span-4">
            <span className="block text-xs font-medium text-slate-600 mb-1">
              ประเภทกลุ่มเสี่ยง
            </span>
            <div className="grid grid-cols-4 gap-1 p-1 bg-sky-100/70 rounded-lg">
              {(
                [
                  { id: 'all', label: 'ทั้งหมด' },
                  { id: 'chronic_dm_ckd', label: 'เบาหวาน/CKD' },
                  { id: 'high_risk_other', label: 'เสี่ยงอื่น' },
                  { id: 'non_risk', label: 'นอกกลุ่ม' },
                ] as const
              ).map((tab) => {
                const active = filters.riskCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      onChangeFilters({ ...filters, riskCategory: tab.id })
                    }
                    className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap truncate cursor-pointer ${
                      active
                        ? 'bg-white text-blue-800 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-blue-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clinical Finding Filter */}
          <div className="xl:col-span-2">
            <label
              htmlFor="filter-finding"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              ผลการตรวจคัดกรอง
            </label>
            <select
              id="filter-finding"
              value={filters.findingFilter}
              onChange={(e) =>
                onChangeFilters({
                  ...filters,
                  findingFilter: e.target.value as FilterState['findingFilter'],
                })
              }
              className="w-full h-9 px-3 text-xs sm:text-sm bg-sky-50/40 border border-sky-200/90 rounded-lg text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
            >
              <option value="all">ทุกรายการคัดกรอง</option>
              <option value="symptomatic">เฉพาะที่มีอาการ</option>
              <option value="abnormal_cxr">เฉพาะ CXR ผิดปกติ</option>
              <option value="tb_diagnosed">เฉพาะที่พบ TB</option>
            </select>
          </div>

          {/* Real-Time Search Input + Reset */}
          <div className="xl:col-span-3 flex items-end gap-2">
            <div className="flex-1">
              <label
                htmlFor="filter-search"
                className="block text-xs font-medium text-slate-600 mb-1"
              >
                ค้นหาด่วน
              </label>
              <div className="relative">
                <Search
                  className="w-3.5 h-3.5 text-sky-600/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="filter-search"
                  type="text"
                  value={filters.searchQuery}
                  onChange={(e) =>
                    onChangeFilters({ ...filters, searchQuery: e.target.value })
                  }
                  placeholder="ชื่อ รพ., อำเภอ, กลุ่มเสี่ยง..."
                  className="w-full h-9 pl-8 pr-3 text-xs sm:text-sm bg-sky-50/40 border border-sky-200/90 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={onResetFilters}
                title="ล้างตัวกรองทั้งหมด"
                className="h-9 px-3 inline-flex items-center gap-1 text-xs font-medium text-blue-800 bg-sky-100 hover:bg-sky-200/80 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>ล้าง</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
