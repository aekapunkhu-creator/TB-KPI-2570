import React, { useMemo, useState } from 'react';
import {
  Check,
  Cloud,
  Copy,
  ExternalLink,
  Link2,
  PauseCircle,
  PlayCircle,
  Radio,
  RefreshCw,
  X,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { ShareViewPreset } from '../types/tb';
import {
  buildExecutiveShareUrl,
  buildExecutiveSummaryMessage,
  resolveExecutiveShareOrigin,
} from '../utils/shareLink';

interface ShareExecutiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareId: string | null;
  isPublicLive: boolean;
  isSyncingShare: boolean;
  user: User | null;
  onSignInForLiveSync: () => void;
  onTogglePublicLive: (nextLive: boolean) => void;
  onRegenerateShareId: () => void;
  onSyncNowToCloud: () => void;
  onPreviewExecutivePreset: (preset: ShareViewPreset) => void;
  reportDateLabel: string;
  provinceScreened: number;
  provinceTb: number;
  provinceTbPct: number;
  pnkScreened: number;
  pnkRank: number;
  pnkAbnormalCxr: number;
  pnkTb: number;
}

export const ShareExecutiveModal: React.FC<ShareExecutiveModalProps> = ({
  isOpen,
  onClose,
  shareId,
  isPublicLive,
  isSyncingShare,
  user,
  onSignInForLiveSync,
  onTogglePublicLive,
  onRegenerateShareId,
  onSyncNowToCloud,
  onPreviewExecutivePreset,
  reportDateLabel,
  provinceScreened,
  provinceTb,
  provinceTbPct,
  pnkScreened,
  pnkRank,
  pnkAbnormalCxr,
  pnkTb,
}) => {
  const currentOrigin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:3000';
  const isDevHost = currentOrigin.startsWith('https://ais-dev-');

  const [preferPublicOrigin, setPreferPublicOrigin] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const targetOrigin = useMemo(
    () => resolveExecutiveShareOrigin(currentOrigin, preferPublicOrigin),
    [currentOrigin, preferPublicOrigin]
  );

  const targetsUrl = useMemo(
    () =>
      buildExecutiveShareUrl({
        origin: targetOrigin,
        preset: 'targets2570',
        shareId: user ? shareId : null,
        hospitalName: 'รพ.โพนนาแก้ว',
      }),
    [targetOrigin, user, shareId]
  );

  const phonNaKaeoUrl = useMemo(
    () =>
      buildExecutiveShareUrl({
        origin: targetOrigin,
        preset: 'phonnakaew',
        shareId: user ? shareId : null,
        hospitalName: 'รพ.โพนนาแก้ว',
      }),
    [targetOrigin, user, shareId]
  );

  const overviewPnkUrl = useMemo(
    () =>
      buildExecutiveShareUrl({
        origin: targetOrigin,
        preset: 'overview_pnk',
        shareId: user ? shareId : null,
        hospitalName: 'รพ.โพนนาแก้ว',
      }),
    [targetOrigin, user, shareId]
  );

  const summaryMessage = useMemo(
    () =>
      buildExecutiveSummaryMessage({
        reportDateLabel,
        provinceScreened,
        provinceTb,
        provinceTbPct,
        pnkScreened,
        pnkRank,
        pnkAbnormalCxr,
        pnkTb,
        targetsUrl,
        phonNaKaeoUrl,
      }),
    [
      reportDateLabel,
      provinceScreened,
      provinceTb,
      provinceTbPct,
      pnkScreened,
      pnkRank,
      pnkAbnormalCxr,
      pnkTb,
      targetsUrl,
      phonNaKaeoUrl,
    ]
  );

  if (!isOpen) return null;

  const copyText = async (text: string, key: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2500);
    } catch {
      setCopiedKey(key);
    }
  };

  const linkItems: {
    preset: ShareViewPreset;
    title: string;
    subtitle: string;
    url: string;
  }[] = [
    {
      preset: 'targets2570',
      title: '1. ลิงก์หน้าตัวชี้วัด (ปีงบประมาณ 2570) — ให้ผู้บริหารดูสด',
      subtitle:
        'เปิดตรงสู่หน้าตัวชี้วัดกองวัณโรค 5 ข้อ ความครอบคลุม 9 กลุ่มเสี่ยง และแผนไตรมาส 1–4 (อ.โพนนาแก้ว)',
      url: targetsUrl,
    },
    {
      preset: 'phonnakaew',
      title: '2. ลิงก์ข้อมูลเฉพาะ โรงพยาบาลโพนนาแก้ว — ให้ผู้บริหารดูสด',
      subtitle: `เปิดตรงสู่รายงานเจาะลึก รพ.โพนนาแก้ว (คัดกรอง ${pnkScreened.toLocaleString()} ราย อันดับ ${pnkRank} · CXR ผิดปกติ ${pnkAbnormalCxr} · TB ${pnkTb} ราย)`,
      url: phonNaKaeoUrl,
    },
    {
      preset: 'overview_pnk',
      title: '3. ลิงก์ภาพรวมและแนวโน้ม 12 เดือน (กรองเฉพาะ รพ.โพนนาแก้ว)',
      subtitle:
        'แสดงกราฟเส้นรายเดือนย้อนหลัง 12 เดือน และตัวเลขคัดกรองโดยกรองเฉพาะ รพ.โพนนาแก้ว อัตโนมัติ',
      url: overviewPnkUrl,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-[1px] flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-executive-modal-title"
    >
      <div className="bg-white border border-sky-200 shadow-xl rounded-2xl max-w-2xl w-full overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 bg-sky-50/75 border-b border-sky-200/80 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <Radio className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>ระบบแชร์ข้อมูลสดแบบเรียลไทม์ (Live Executive Link)</span>
            </div>
            <h2
              id="share-executive-modal-title"
              className="text-base sm:text-lg font-bold text-blue-950 mt-0.5"
            >
              แชร์ลิงก์หน้าตัวชี้วัด และข้อมูลเฉพาะ โรงพยาบาลโพนนาแก้ว
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างแชร์ลิงก์"
            className="p-1.5 text-slate-500 hover:text-blue-950 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Cloud Real-Time Sync Status Card */}
          <div className="p-4 bg-sky-50/55 border border-sky-200/80 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <Cloud className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
                  <span>
                    {user
                      ? isPublicLive
                        ? 'กำลังถ่ายทอดข้อมูลสดผ่านฐานข้อมูล Cloud (ซิงก์อัตโนมัติ)'
                        : 'หยุดการถ่ายทอดสดผ่านลิงก์ชั่วคราว'
                      : 'เชื่อมต่อบัญชี Google เพื่อซิงก์ข้อมูลสดข้ามเครื่องให้ผู้บริหาร'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {user
                    ? 'เมื่อนำเข้าไฟล์ Excel ใหม่หรือปรับข้อมูล หน้าจอผู้บริหารที่เปิดลิงก์จะอัปเดตสดทันทีโดยไม่ต้องรีเฟรช'
                    : 'หากยังไม่เชื่อมต่อ Google ลิงก์จะเปิดหน้าตัวชี้วัดและ รพ.โพนนาแก้ว พร้อมซิงก์สดในเบราว์เซอร์เดียวกันได้ทันที'}
                </p>
              </div>

              {user ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={isSyncingShare}
                    onClick={() => onTogglePublicLive(!isPublicLive)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                      isPublicLive
                        ? 'text-amber-800 bg-amber-50 border-amber-200 hover:bg-amber-100'
                        : 'text-emerald-800 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {isPublicLive ? (
                      <>
                        <PauseCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>พักการแชร์</span>
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>เปิดดูสด</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isSyncingShare}
                    onClick={onSyncNowToCloud}
                    title="อัปเดตข้อมูลล่าสุดไปยังลิงก์แชร์ทันที"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-800 bg-white border border-sky-200 hover:bg-sky-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isSyncingShare ? 'animate-spin' : ''}`}
                      aria-hidden="true"
                    />
                    <span>ซิงก์เดี๋ยวนี้</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSyncingShare}
                    onClick={onRegenerateShareId}
                    title="สร้างรหัสลิงก์ใหม่ (ยกเลิกลิงก์เดิม)"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-sky-200 hover:bg-sky-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>เปลี่ยนรหัส</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onSignInForLiveSync}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Cloud className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>เชื่อมต่อ Cloud สด</span>
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-sky-200/70 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 font-mono tabular-nums">
              <span>
                ชุดข้อมูลปัจจุบัน: <strong>ณ {reportDateLabel}</strong>
              </span>
              <span>
                รพ.โพนนาแก้ว: <strong>{pnkScreened.toLocaleString()}</strong> ราย (TB{' '}
                <strong>{pnkTb}</strong>) · ทั้งจังหวัด:{' '}
                <strong>{provinceScreened.toLocaleString()}</strong> ราย
              </span>
            </div>
          </div>

          {/* Domain Switcher when in AI Studio Dev Preview */}
          {isDevHost && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 bg-white border border-sky-200/80 rounded-xl text-xs">
              <span className="font-medium text-blue-950">
                เลือกโดเมนของลิงก์แชร์:
              </span>
              <div className="flex items-center gap-1 p-1 bg-sky-100/75 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPreferPublicOrigin(true)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    preferPublicOrigin
                      ? 'bg-white text-blue-800 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-blue-900'
                  }`}
                >
                  ลิงก์เผยแพร่ผู้บริหาร (ais-pre)
                </button>
                <button
                  type="button"
                  onClick={() => setPreferPublicOrigin(false)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    !preferPublicOrigin
                      ? 'bg-white text-blue-800 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-blue-900'
                  }`}
                >
                  ลิงก์สภาพแวดล้อมพัฒนา (ais-dev)
                </button>
              </div>
            </div>
          )}

          {/* 3 Shareable Link Cards */}
          <div className="space-y-3.5">
            {linkItems.map((item) => {
              const isCopied = copiedKey === item.preset;
              return (
                <div
                  key={item.preset}
                  className="p-4 bg-white border border-sky-200/90 rounded-xl space-y-2.5"
                >
                  <div>
                    <h3 className="text-sm font-bold text-blue-950">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">{item.subtitle}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      aria-label={item.title}
                      value={item.url}
                      onFocus={(e) => e.currentTarget.select()}
                      className="flex-1 h-9 px-3 text-xs font-mono bg-sky-50/60 border border-sky-200 rounded-lg text-blue-950 focus:outline-none focus:border-blue-600"
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => copyText(item.url, item.preset)}
                        className="h-9 px-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        )}
                        <span>{isCopied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onPreviewExecutivePreset(item.preset);
                        }}
                        className="h-9 px-3 inline-flex items-center justify-center gap-1 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>เปิดดูสด</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 1-Click Executive Summary Message Copy (for LINE / Email) */}
          <div className="pt-2 border-t border-sky-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              ต้องการส่งรายงานสรุปพร้อมลิงก์ทั้ง 2 หน้าเข้ากลุ่ม LINE ผู้บริหาร?
            </div>
            <button
              type="button"
              onClick={() => copyText(summaryMessage, 'summary')}
              className="h-9 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedKey === 'summary' ? (
                <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
              )}
              <span>
                {copiedKey === 'summary'
                  ? 'คัดลอกข้อความสรุป + ลิงก์แล้ว'
                  : 'คัดลอกข้อความสรุปพร้อมลิงก์ส่งผู้บริหาร'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
