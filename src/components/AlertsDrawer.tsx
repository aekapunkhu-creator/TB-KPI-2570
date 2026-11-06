import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { AlertThresholdConfig, ChangeAlert } from '../types/tb';

interface AlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: ChangeAlert[];
  onToggleAcknowledge: (alertId: string) => void;
  thresholds: AlertThresholdConfig;
  onSaveThresholds: (next: AlertThresholdConfig) => void;
}

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  onToggleAcknowledge,
  thresholds,
  onSaveThresholds,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [draft, setDraft] = useState<AlertThresholdConfig>(thresholds);

  if (!isOpen) return null;

  const handleApplyThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveThresholds(draft);
    setShowSettings(false);
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex justify-end bg-slate-900/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alerts-drawer-title"
    >
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-sky-200/80 flex items-center justify-between gap-4">
          <div>
            <h2
              id="alerts-drawer-title"
              className="text-base sm:text-lg font-bold text-blue-950"
            >
              ระบบแจ้งเตือนการเปลี่ยนแปลงที่สำคัญ
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ตรวจจับความผิดปกติทางระบาดวิทยา ยอดคัดกรองก้าวกระโดด และช่องว่างผลแล็บอัตโนมัติ
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setDraft(thresholds);
                setShowSettings((prev) => !prev);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              <span>ตั้งค่าเกณฑ์</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิดหน้าต่างแจ้งเตือน"
              className="p-2 text-slate-500 hover:text-blue-950 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Threshold Settings Form */}
        {showSettings && (
          <form
            onSubmit={handleApplyThresholds}
            className="p-5 bg-slate-50 border-b border-slate-200 space-y-3"
          >
            <div className="text-xs font-semibold text-slate-800">
              กำหนดเกณฑ์ตรวจจับการเปลี่ยนแปลงอัตโนมัติ
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="th-delta"
                  className="block text-xs text-slate-600 mb-1"
                >
                  แจ้งเตือนเมื่อคัดกรองเพิ่ม (ราย/วัน)
                </label>
                <input
                  id="th-delta"
                  type="number"
                  min={1}
                  value={draft.minScreeningDeltaAlert}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      minScreeningDeltaAlert: Math.max(1, Number(e.target.value)),
                    })
                  }
                  className="w-full h-9 px-3 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label
                  htmlFor="th-tbrate"
                  className="block text-xs text-slate-600 mb-1"
                >
                  แจ้งเตือนอัตราพบ TB (ต่อ 1,000 ราย)
                </label>
                <input
                  id="th-tbrate"
                  type="number"
                  step="0.5"
                  min={0.5}
                  value={draft.minTbRatePer1000Alert}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      minTbRatePer1000Alert: Math.max(0.1, Number(e.target.value)),
                    })
                  }
                  className="w-full h-9 px-3 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label
                  htmlFor="th-cxrpct"
                  className="block text-xs text-slate-600 mb-1"
                >
                  แจ้งเตือนอัตรา CXR ผิดปกติ (%)
                </label>
                <input
                  id="th-cxrpct"
                  type="number"
                  step="1"
                  min={1}
                  value={draft.minAbnormalCxrPctAlert}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      minAbnormalCxrPctAlert: Math.max(1, Number(e.target.value)),
                    })
                  }
                  className="w-full h-9 px-3 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label
                  htmlFor="th-unconfirmed"
                  className="block text-xs text-slate-600 mb-1"
                >
                  แจ้งเตือน CXR ผิดปกติรอผลแล็บ (ราย)
                </label>
                <input
                  id="th-unconfirmed"
                  type="number"
                  min={1}
                  value={draft.maxUnconfirmedCxrAlert}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      maxUnconfirmedCxrAlert: Math.max(1, Number(e.target.value)),
                    })
                  }
                  className="w-full h-9 px-3 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-950"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
              >
                บันทึกเกณฑ์และประเมินใหม่
              </button>
            </div>
          </form>
        )}

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {alerts.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              ไม่พบรายการแจ้งเตือนที่เกินเกณฑ์กำหนดในชุดข้อมูลปัจจุบัน
            </div>
          ) : (
            alerts.map((alert) => {
              const isCritical = alert.severity === 'critical';
              const isWarning = alert.severity === 'warning';
              const severityLabel = isCritical
                ? 'วิกฤต / เร่งด่วน'
                : isWarning
                ? 'เฝ้าระวัง'
                : 'ความเคลื่อนไหว';

              return (
                <article
                  key={alert.id}
                  className={`p-4 rounded-xl border transition-opacity ${
                    alert.acknowledged
                      ? 'bg-sky-50/40 border-sky-200/80 opacity-70'
                      : 'bg-white border-sky-200/80 shadow-[0_1px_3px_rgba(14,116,144,0.05)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      {isCritical ? (
                        <AlertTriangle
                          className="w-4 h-4 text-red-600 shrink-0"
                          aria-hidden="true"
                        />
                      ) : isWarning ? (
                        <AlertTriangle
                          className="w-4 h-4 text-amber-600 shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <Info
                          className="w-4 h-4 text-blue-700 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={
                          isCritical
                            ? 'text-red-700'
                            : isWarning
                            ? 'text-amber-700'
                            : 'text-blue-800'
                        }
                      >
                        {severityLabel}
                      </span>
                      <span aria-hidden="true" className="text-sky-300">
                        ·
                      </span>
                      <span className="text-slate-600 font-normal">
                        {alert.hospitalName}
                      </span>
                    </div>

                    <span className="text-xs font-mono tabular-nums font-medium text-blue-950 shrink-0">
                      {alert.metricDelta}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900 mt-2">
                    {alert.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                    {alert.description}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400 font-mono tabular-nums">
                      อัปเดต: {new Date(alert.timestamp).toLocaleDateString('th-TH')}
                    </span>

                    <button
                      type="button"
                      onClick={() => onToggleAcknowledge(alert.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                        alert.acknowledged
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>
                        {alert.acknowledged ? 'รับทราบแล้ว' : 'ยืนยันรับทราบ'}
                      </span>
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
