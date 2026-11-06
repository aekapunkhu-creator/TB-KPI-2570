import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { ReportPageId } from '../types/tb';

interface TopBarProps {
  activePage: ReportPageId;
  onSelectPage: (page: ReportPageId) => void;
  onOpenImportModal: () => void;
}

const NAV_ITEMS: { id: ReportPageId; label: string }[] = [
  { id: 'overview', label: 'ภาพรวมจังหวัด' },
  { id: 'hospitals', label: 'รายโรงพยาบาล' },
  { id: 'phonnakaew', label: 'รพ.โพนนาแก้ว' },
  { id: 'epidemiology', label: 'ระบาดวิทยา' },
  { id: 'targets2570', label: 'ตัวชี้วัด 2570' },
];

export const TopBar: React.FC<TopBarProps> = ({
  activePage,
  onSelectPage,
  onOpenImportModal,
}) => {
  return (
    <header className="no-print bg-white border-t-[3px] border-t-blue-700 border-b border-sky-200/80 sticky top-0 z-30">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-14 sm:h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onSelectPage('overview');
          }}
          className="text-base sm:text-lg font-bold tracking-tight text-blue-950 whitespace-nowrap shrink-0"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          สกลนคร TB Surveillance
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="หน้าหลักของรายงาน"
          className="hidden md:flex items-center gap-6 overflow-x-auto"
        >
          {NAV_ITEMS.map((item) => {
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

        {/* Zone 3: Single Primary Action */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onOpenImportModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>นำเข้า Excel</span>
          </button>
        </div>
      </div>

      {/* Mobile horizontal tab strip */}
      <nav
        aria-label="เมนูรายงานสำหรับมือถือ"
        className="md:hidden flex items-center gap-4 px-4 border-t border-sky-100 overflow-x-auto"
      >
        {NAV_ITEMS.map((item) => {
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
  );
};
