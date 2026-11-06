import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  DEFAULT_ALERT_THRESHOLDS,
  DEFAULT_POPULATION_PHON_NA_KAEO,
  INITIAL_DATASET_SNAPSHOT,
} from './data/seedData';
import {
  AlertThresholdConfig,
  ChangeAlert,
  DatasetSnapshot,
  FilterState,
  ReportPageId,
  ShareViewPreset,
} from './types/tb';
import {
  aggregateByHospital,
  computeProvinceSummary,
  filterScreeningRecords,
} from './utils/analytics';
import { detectSignificantChanges } from './utils/changeDetector';
import { exportElementToPdf } from './utils/pdfExporter';
import {
  buildExecutiveShareUrl,
  DEFAULT_SHARED_HOSPITAL,
  generateLiveShareId,
  parseShareParams,
  resolveExecutiveShareOrigin,
} from './utils/shareLink';
import {
  auth,
  googleProvider,
  testFirestoreConnection,
} from './lib/firebase';
import {
  acknowledgeAlertInCloud,
  ensureUserProfileDoc,
  publishSharedDashboardToCloud,
  saveAlertsToCloud,
  saveAlertThresholdsToCloud,
  saveDatasetSnapshotToCloud,
  saveUserLiveShareId,
  subscribeSharedDashboard,
  subscribeUserDatasets,
  toggleSharedDashboardPublicStatus,
  updatePopulationDenominatorInCloud,
} from './services/firestoreSync';
import { TopBar } from './components/TopBar';
import { ExecutiveLiveHeader } from './components/ExecutiveLiveHeader';
import { WorkspaceFilterRibbon } from './components/WorkspaceFilterRibbon';
import { Page1ProvinceOverview } from './components/Page1ProvinceOverview';
import { Page2HospitalDeepDive } from './components/Page2HospitalDeepDive';
import { Page3HospitalReport } from './components/Page3HospitalReport';
import { Page4Epidemiology } from './components/Page4Epidemiology';
import { Page5Targets2570 } from './components/Page5Targets2570';
import { AlertsDrawer } from './components/AlertsDrawer';
import { ExcelImportSqlModal } from './components/ExcelImportSqlModal';
import { ShareExecutiveModal } from './components/ShareExecutiveModal';
import { FullReportPrintView } from './components/FullReportPrintView';

const LIVE_BROADCAST_CHANNEL = 'sakon_tb_live_sync';
const LIVE_SHARE_ID_STORAGE_KEY = 'sakon_tb_live_share_id';

class DashboardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      errorMessage: error.message || 'เกิดข้อผิดพลาดในการแสดงผลข้อมูล',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f4f8fb] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-sky-200/80 rounded-xl p-6 space-y-4">
            <h1 className="text-lg font-bold text-blue-950">
              ไม่สามารถดำเนินการคำขอล่าสุดได้
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 break-words">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() =>
                this.setState({ hasError: false, errorMessage: '' })
              }
              className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
            >
              กลับสู่หน้าแดชบอร์ด
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function formatThaiClockNow(): string {
  try {
    return new Date().toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '';
  }
}

export function App() {
  const initialUrlParams = useMemo(
    () =>
      parseShareParams(
        typeof window !== 'undefined' ? window.location.search : ''
      ),
    []
  );

  const [isExecutiveMode, setIsExecutiveMode] = useState<boolean>(
    initialUrlParams.isExecutiveMode
  );
  const [activePage, setActivePage] = useState<ReportPageId>(
    initialUrlParams.page
  );
  const [incomingShareId] = useState<string | null>(initialUrlParams.shareId);

  const [snapshot, setSnapshot] = useState<DatasetSnapshot>(
    INITIAL_DATASET_SNAPSHOT
  );
  const [previousSnapshot, setPreviousSnapshot] = useState<
    DatasetSnapshot | undefined
  >(undefined);

  const [filters, setFilters] = useState<FilterState>(() => ({
    hospitalName:
      initialUrlParams.page === 'overview' && initialUrlParams.hospitalName
        ? initialUrlParams.hospitalName
        : 'all',
    riskCategory: 'all',
    findingFilter: 'all',
    searchQuery: '',
  }));

  const [focusHospitalName, setFocusHospitalName] = useState<string>(
    initialUrlParams.hospitalName || DEFAULT_SHARED_HOSPITAL
  );
  const [populationDenominator, setPopulationDenominator] = useState<number>(
    DEFAULT_POPULATION_PHON_NA_KAEO
  );
  const [checkedActions, setCheckedActions] = useState<Record<string, boolean>>(
    {}
  );
  const [thresholds, setThresholds] = useState<AlertThresholdConfig>(
    DEFAULT_ALERT_THRESHOLDS
  );
  const [acknowledgedIds, setAcknowledgedIds] = useState<
    Record<string, boolean>
  >({});

  const [liveShareId, setLiveShareId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(LIVE_SHARE_ID_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [isPublicLive, setIsPublicLive] = useState<boolean>(true);
  const [isSyncingShare, setIsSyncingShare] = useState<boolean>(false);
  const [isSharePaused, setIsSharePaused] = useState<boolean>(false);
  const [lastSyncedLabel, setLastSyncedLabel] = useState<string | null>(null);

  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [importModalState, setImportModalState] = useState<{
    isOpen: boolean;
    tab: 'import' | 'sql';
  }>({ isOpen: false, tab: 'import' });

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [renderFullReportForPdf, setRenderFullReportForPdf] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const currentPageRef = useRef<HTMLDivElement | null>(null);
  const fullReportRef = useRef<HTMLDivElement | null>(null);

  const showTemporaryNotice = useCallback((msg: string) => {
    setStatusNotice(msg);
    window.setTimeout(() => {
      setStatusNotice((prev) => (prev === msg ? null : prev));
    }, 5000);
  }, []);

  // Test Firestore connection on boot and listen to Firebase Auth state
  useEffect(() => {
    testFirestoreConnection();
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (firebaseUser) {
        try {
          const profile = await ensureUserProfileDoc(
            firebaseUser,
            populationDenominator
          );
          setPopulationDenominator(profile.populationDenominator);
          if (profile.liveShareId) {
            setLiveShareId(profile.liveShareId);
            try {
              window.localStorage.setItem(
                LIVE_SHARE_ID_STORAGE_KEY,
                profile.liveShareId
              );
            } catch {
              // Ignore storage restrictions
            }
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to incoming shared executive live link (?share=<shareId>) via Firestore onSnapshot
  useEffect(() => {
    if (!incomingShareId) return;
    const unsub = subscribeSharedDashboard(incomingShareId, (liveState) => {
      if (!liveState) return;
      if (liveState.snapshot.records.length > 0) {
        setSnapshot(liveState.snapshot);
      }
      setPopulationDenominator(liveState.populationDenominator);
      setCheckedActions(liveState.checkedActions || {});
      setIsSharePaused(!liveState.isPublicLive);
      setLastSyncedLabel(formatThaiClockNow());
    });
    return () => unsub();
  }, [incomingShareId]);

  // Same-browser live broadcast listener for instant live updates across open tabs
  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
      return;
    }
    const channel = new BroadcastChannel(LIVE_BROADCAST_CHANNEL);
    channel.onmessage = (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'LIVE_STATE_UPDATE' && isExecutiveMode && !incomingShareId) {
        if (msg.snapshot) setSnapshot(msg.snapshot);
        if (typeof msg.populationDenominator === 'number') {
          setPopulationDenominator(msg.populationDenominator);
        }
        if (msg.checkedActions) setCheckedActions(msg.checkedActions);
        setLastSyncedLabel(formatThaiClockNow());
      }
    };
    return () => channel.close();
  }, [isExecutiveMode, incomingShareId]);

  // Attach Firestore real-time snapshot listener for signed-in analyst
  useEffect(() => {
    if (!authReady || !user || incomingShareId) return;
    const unsub = subscribeUserDatasets(user, (cloudDatasets) => {
      if (cloudDatasets.length > 0 && cloudDatasets[0].records.length > 0) {
        setSnapshot(cloudDatasets[0]);
      }
    });
    return () => unsub();
  }, [authReady, user, incomingShareId]);

  // Broadcast state changes to same-browser tabs & auto-sync to Firestore sharedDashboards when active
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined' && !isExecutiveMode) {
      try {
        const channel = new BroadcastChannel(LIVE_BROADCAST_CHANNEL);
        channel.postMessage({
          type: 'LIVE_STATE_UPDATE',
          snapshot,
          populationDenominator,
          checkedActions,
        });
        channel.close();
      } catch {
        // Ignore broadcast error
      }
    }
  }, [snapshot, populationDenominator, checkedActions, isExecutiveMode]);

  useEffect(() => {
    if (!user || !liveShareId || !isPublicLive || incomingShareId) return;
    const timer = window.setTimeout(() => {
      publishSharedDashboardToCloud({
        user,
        shareId: liveShareId,
        snapshot,
        populationDenominator,
        checkedActions,
        defaultPage: activePage === 'phonnakaew' ? 'phonnakaew' : 'targets2570',
        focusHospitalName: DEFAULT_SHARED_HOSPITAL,
        isPublicLive,
      }).catch((err) => console.error(err));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [
    user,
    liveShareId,
    isPublicLive,
    incomingShareId,
    snapshot,
    populationDenominator,
    checkedActions,
    activePage,
  ]);

  // Keep browser URL synchronized in Executive Live Mode
  useEffect(() => {
    if (typeof window === 'undefined' || !isExecutiveMode) return;
    const params = new URLSearchParams(window.location.search);
    params.set('mode', 'executive');
    params.set('page', activePage);
    if (
      activePage === 'phonnakaew' ||
      activePage === 'targets2570' ||
      activePage === 'epidemiology'
    ) {
      params.set('hospital', focusHospitalName || DEFAULT_SHARED_HOSPITAL);
    } else if (filters.hospitalName !== 'all') {
      params.set('hospital', filters.hospitalName);
    } else {
      params.delete('hospital');
    }
    const activeShare = incomingShareId || (user ? liveShareId : null);
    if (activeShare) {
      params.set('share', activeShare);
    }
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', nextUrl);
  }, [
    isExecutiveMode,
    activePage,
    focusHospitalName,
    filters.hospitalName,
    incomingShareId,
    user,
    liveShareId,
  ]);

  // Filtered records (SQL-equivalent WHERE pipeline)
  const filteredRecords = useMemo(
    () => filterScreeningRecords(snapshot.records, filters),
    [snapshot.records, filters]
  );

  // Province summary & hospital list
  const fullSummary = useMemo(
    () => computeProvinceSummary(snapshot.records),
    [snapshot.records]
  );
  const allHospitals = useMemo(
    () => aggregateByHospital(snapshot.records),
    [snapshot.records]
  );
  const hospitalNames = useMemo(
    () => allHospitals.map((h) => h.hospitalName),
    [allHospitals]
  );

  // Phon Na Kaeo Hospital live summary & rank
  const pnkRow = useMemo(
    () =>
      allHospitals.find((h) => h.hospitalName === DEFAULT_SHARED_HOSPITAL) ||
      allHospitals[0],
    [allHospitals]
  );
  const pnkRank = useMemo(() => {
    const idx = allHospitals.findIndex(
      (h) => h.hospitalName === DEFAULT_SHARED_HOSPITAL
    );
    return idx >= 0 ? idx + 1 : 1;
  }, [allHospitals]);

  // Automated significant-change alerts
  const alerts: ChangeAlert[] = useMemo(() => {
    const rawAlerts = detectSignificantChanges(
      snapshot,
      thresholds,
      previousSnapshot
    );
    return rawAlerts.map((a) => ({
      ...a,
      acknowledged: Boolean(acknowledgedIds[a.id]),
    }));
  }, [snapshot, thresholds, previousSnapshot, acknowledgedIds]);

  const unacknowledgedCount = useMemo(
    () => alerts.filter((a) => !a.acknowledged).length,
    [alerts]
  );

  const ensureAndPublishShareId = async (targetUser: User): Promise<string> => {
    const nextId = liveShareId || generateLiveShareId();
    if (!liveShareId) {
      setLiveShareId(nextId);
      try {
        window.localStorage.setItem(LIVE_SHARE_ID_STORAGE_KEY, nextId);
      } catch {
        // Ignore storage errors
      }
      await saveUserLiveShareId(targetUser, nextId);
    }
    setIsSyncingShare(true);
    try {
      await publishSharedDashboardToCloud({
        user: targetUser,
        shareId: nextId,
        snapshot,
        populationDenominator,
        checkedActions,
        defaultPage: activePage === 'phonnakaew' ? 'phonnakaew' : 'targets2570',
        focusHospitalName: DEFAULT_SHARED_HOSPITAL,
        isPublicLive,
      });
    } finally {
      setIsSyncingShare(false);
    }
    return nextId;
  };

  const handleOpenShareModal = async () => {
    setIsShareModalOpen(true);
    if (user) {
      try {
        await ensureAndPublishShareId(user);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleTogglePublicLive = async (nextLive: boolean) => {
    setIsPublicLive(nextLive);
    if (user && liveShareId) {
      setIsSyncingShare(true);
      try {
        await toggleSharedDashboardPublicStatus(liveShareId, nextLive);
        showTemporaryNotice(
          nextLive
            ? 'เปิดการถ่ายทอดข้อมูลสดไปยังลิงก์ผู้บริหารแล้ว'
            : 'หยุดการอัปเดตผ่านลิงก์แชร์ชั่วคราวแล้ว'
        );
      } catch (err) {
        console.error(err);
      } finally {
        setIsSyncingShare(false);
      }
    }
  };

  const handleRegenerateShareId = async () => {
    const freshId = generateLiveShareId();
    setLiveShareId(freshId);
    setIsPublicLive(true);
    try {
      window.localStorage.setItem(LIVE_SHARE_ID_STORAGE_KEY, freshId);
    } catch {
      // Ignore storage errors
    }
    if (user) {
      setIsSyncingShare(true);
      try {
        await saveUserLiveShareId(user, freshId);
        await publishSharedDashboardToCloud({
          user,
          shareId: freshId,
          snapshot,
          populationDenominator,
          checkedActions,
          defaultPage: activePage === 'phonnakaew' ? 'phonnakaew' : 'targets2570',
          focusHospitalName: DEFAULT_SHARED_HOSPITAL,
          isPublicLive: true,
        });
        showTemporaryNotice('สร้างรหัสลิงก์แชร์ใหม่และซิงก์ข้อมูลล่าสุดเรียบร้อยแล้ว');
      } catch (err) {
        console.error(err);
      } finally {
        setIsSyncingShare(false);
      }
    }
  };

  const handleSyncNowToCloud = async () => {
    if (!user) return;
    try {
      await ensureAndPublishShareId(user);
      showTemporaryNotice('ซิงก์ข้อมูลล่าสุดไปยังลิงก์ผู้บริหารเรียบร้อยแล้ว');
    } catch (err) {
      console.error(err);
    }
  };

  const handlePreviewExecutivePreset = (preset: ShareViewPreset) => {
    setFocusHospitalName(DEFAULT_SHARED_HOSPITAL);
    if (preset === 'targets2570') {
      setActivePage('targets2570');
      setFilters((prev) => ({ ...prev, hospitalName: 'all' }));
    } else if (preset === 'phonnakaew') {
      setActivePage('phonnakaew');
      setFilters((prev) => ({ ...prev, hospitalName: 'all' }));
    } else {
      setActivePage('overview');
      setFilters((prev) => ({
        ...prev,
        hospitalName: DEFAULT_SHARED_HOSPITAL,
      }));
    }
    setIsExecutiveMode(true);
    setLastSyncedLabel(formatThaiClockNow());
  };

  const handleExitExecutiveMode = () => {
    setIsExecutiveMode(false);
    setFilters((prev) => ({ ...prev, hospitalName: 'all' }));
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const handleCopyCurrentExecutiveLink = async () => {
    const origin =
      typeof window !== 'undefined'
        ? resolveExecutiveShareOrigin(window.location.origin, true)
        : 'http://localhost:3000';
    const preset: ShareViewPreset =
      activePage === 'phonnakaew'
        ? 'phonnakaew'
        : activePage === 'overview' && filters.hospitalName === DEFAULT_SHARED_HOSPITAL
        ? 'overview_pnk'
        : 'targets2570';
    const url = buildExecutiveShareUrl({
      origin,
      preset,
      shareId: incomingShareId || (user ? liveShareId : null),
      hospitalName: focusHospitalName || DEFAULT_SHARED_HOSPITAL,
    });
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      }
      showTemporaryNotice('คัดลอกลิงก์ดูสดสำหรับผู้บริหารเรียบร้อยแล้ว');
    } catch {
      showTemporaryNotice(`ลิงก์ดูสด: ${url}`);
    }
  };

  const handleApplyImportedSnapshot = async (next: DatasetSnapshot) => {
    setPreviousSnapshot(snapshot);
    setSnapshot(next);
    setFilters({
      hospitalName: 'all',
      riskCategory: 'all',
      findingFilter: 'all',
      searchQuery: '',
    });

    const nextHospitals = aggregateByHospital(next.records);
    if (
      nextHospitals.length > 0 &&
      !nextHospitals.some((h) => h.hospitalName === focusHospitalName)
    ) {
      setFocusHospitalName(nextHospitals[0].hospitalName);
    }

    const generatedAlerts = detectSignificantChanges(next, thresholds, snapshot);
    showTemporaryNotice(
      `นำเข้าไฟล์ "${next.fileName}" สำเร็จ (${next.records.length} รายการ) · ตรวจพบการเปลี่ยนแปลง ${generatedAlerts.length} รายการ`
    );

    if (user) {
      try {
        await saveDatasetSnapshotToCloud(user, next);
        await saveAlertsToCloud(user, next.id, generatedAlerts);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleResetToBaseline = () => {
    setPreviousSnapshot(undefined);
    setSnapshot(INITIAL_DATASET_SNAPSHOT);
    setFocusHospitalName(DEFAULT_SHARED_HOSPITAL);
    setFilters({
      hospitalName: 'all',
      riskCategory: 'all',
      findingFilter: 'all',
      searchQuery: '',
    });
    showTemporaryNotice('คืนค่าชุดข้อมูลมาตรฐาน ExportACF ณ 6 พ.ย. 2569 เรียบร้อยแล้ว');
  };

  const handleToggleAcknowledgeAlert = async (alertId: string) => {
    const nextVal = !acknowledgedIds[alertId];
    setAcknowledgedIds((prev) => ({ ...prev, [alertId]: nextVal }));
    if (user) {
      try {
        await acknowledgeAlertInCloud(user, alertId, nextVal);
      } catch {
        // Alert might not yet exist in cloud if generated from initial seed
      }
    }
  };

  const handleSaveThresholds = async (next: AlertThresholdConfig) => {
    setThresholds(next);
    showTemporaryNotice('อัปเดตเกณฑ์การแจ้งเตือนและประเมินข้อมูลใหม่แล้ว');
    if (user) {
      try {
        await saveAlertThresholdsToCloud(user, next);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleChangePopulation = async (nextPop: number) => {
    setPopulationDenominator(nextPop);
    if (user) {
      try {
        await updatePopulationDenominatorInCloud(user, nextPop);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleToggleActionItem = (actionId: string) => {
    setCheckedActions((prev) => ({ ...prev, [actionId]: !prev[actionId] }));
  };

  const handleExportCurrentPdf = async () => {
    if (!currentPageRef.current || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await exportElementToPdf({
        element: currentPageRef.current,
        fileName: `SakonNakhon_TB_${activePage}_${snapshot.reportDateLabel}.pdf`,
      });
      showTemporaryNotice('ส่งออกไฟล์ PDF หน้าปัจจุบันเรียบร้อยแล้ว');
    } catch (err) {
      showTemporaryNotice(
        err instanceof Error
          ? `ไม่สามารถส่งออก PDF ได้: ${err.message}`
          : 'ไม่สามารถส่งออก PDF ได้'
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportFullPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    setRenderFullReportForPdf(true);

    window.setTimeout(async () => {
      try {
        if (fullReportRef.current) {
          await exportElementToPdf({
            element: fullReportRef.current,
            fileName: `SakonNakhon_TB_FullReport_5Pages_${snapshot.reportDateLabel}.pdf`,
          });
          showTemporaryNotice('ส่งออกรายงาน PDF ฉบับสมบูรณ์ 5 หน้าเรียบร้อยแล้ว');
        }
      } catch (err) {
        showTemporaryNotice(
          err instanceof Error
            ? `ไม่สามารถส่งออก PDF ได้: ${err.message}`
            : 'ไม่สามารถส่งออก PDF ได้'
        );
      } finally {
        setRenderFullReportForPdf(false);
        setIsExportingPdf(false);
      }
    }, 150);
  };

  const handleSignIn = async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred.user) {
        await saveDatasetSnapshotToCloud(cred.user, snapshot);
        await ensureAndPublishShareId(cred.user);
        showTemporaryNotice(
          'เชื่อมต่อบัญชี Google และเปิดการซิงก์ข้อมูลสดไปยังลิงก์ผู้บริหารเรียบร้อยแล้ว'
        );
      }
    } catch (err) {
      showTemporaryNotice(
        err instanceof Error ? err.message : 'ไม่สามารถเข้าสู่ระบบได้'
      );
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    showTemporaryNotice('ออกจากระบบ Cloud แล้ว');
  };

  return (
    <DashboardErrorBoundary>
      <div id="top" className="min-h-screen flex flex-col bg-[#f4f8fb] text-slate-900">
        {isExecutiveMode ? (
          <ExecutiveLiveHeader
            activePage={activePage}
            onSelectPage={(page) => {
              setActivePage(page);
              if (page === 'phonnakaew') {
                setFocusHospitalName(DEFAULT_SHARED_HOSPITAL);
              }
            }}
            focusHospitalName={focusHospitalName}
            reportDateLabel={snapshot.reportDateLabel}
            fileName={snapshot.fileName}
            provinceScreened={fullSummary.totalScreened}
            provinceTb={fullSummary.totalTb}
            pnkScreened={pnkRow?.screened ?? 0}
            pnkTb={pnkRow?.tbDiagnosed ?? 0}
            pnkRank={pnkRank}
            isProvinceFilteredToPnk={
              filters.hospitalName === DEFAULT_SHARED_HOSPITAL
            }
            onToggleOverviewScope={(onlyPnk) =>
              setFilters((prev) => ({
                ...prev,
                hospitalName: onlyPnk ? DEFAULT_SHARED_HOSPITAL : 'all',
              }))
            }
            activeShareId={incomingShareId || (user ? liveShareId : null)}
            lastSyncedLabel={lastSyncedLabel}
            isSharePaused={isSharePaused}
            onCopyCurrentLink={handleCopyCurrentExecutiveLink}
            onExportCurrentPdf={handleExportCurrentPdf}
            isExportingPdf={isExportingPdf}
            onExitExecutiveMode={handleExitExecutiveMode}
          />
        ) : (
          <>
            {/* Top 3-Zone Navigation Bar */}
            <TopBar
              activePage={activePage}
              onSelectPage={setActivePage}
              onOpenImportModal={() =>
                setImportModalState({ isOpen: true, tab: 'import' })
              }
            />

            {/* Workspace Context, Utility Actions & Real-Time Multi-Dimensional Filter Bar */}
            <WorkspaceFilterRibbon
              reportDateLabel={snapshot.reportDateLabel}
              comparisonDateLabel={snapshot.comparisonDateLabel}
              fileName={snapshot.fileName}
              hospitalCount={fullSummary.hospitalCount}
              riskGroupCount={fullSummary.riskGroupCount}
              hospitalNames={hospitalNames}
              filters={filters}
              onChangeFilters={setFilters}
              onResetFilters={() =>
                setFilters({
                  hospitalName: 'all',
                  riskCategory: 'all',
                  findingFilter: 'all',
                  searchQuery: '',
                })
              }
              unacknowledgedAlertsCount={unacknowledgedCount}
              onOpenAlerts={() => setIsAlertsOpen(true)}
              onOpenSqlExplorer={() =>
                setImportModalState({ isOpen: true, tab: 'sql' })
              }
              onOpenShareModal={handleOpenShareModal}
              onExportCurrentPdf={handleExportCurrentPdf}
              onExportFullPdf={handleExportFullPdf}
              isExportingPdf={isExportingPdf}
              user={user}
              onSignIn={handleSignIn}
              onSignOut={handleSignOut}
            />
          </>
        )}

        {/* Transient Action Feedback Banner */}
        {statusNotice && (
          <div className="no-print max-w-[1440px] w-full mx-auto px-4 sm:px-8 pt-2">
            <div
              role="status"
              className="px-4 py-2.5 text-xs sm:text-sm font-medium text-blue-900 bg-sky-50 border border-sky-200 rounded-lg flex items-center justify-between gap-4"
            >
              <span>{statusNotice}</span>
              <button
                type="button"
                onClick={() => setStatusNotice(null)}
                className="text-xs text-blue-700 hover:text-blue-900 underline cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        )}

        {/* Active Report Page Viewport */}
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-6">
          <div ref={currentPageRef} className="bg-[#f4f8fb]">
            {activePage === 'overview' && (
              <Page1ProvinceOverview
                records={filteredRecords}
                allRecords={snapshot.records}
                monthlyTrends={snapshot.monthlyTrends}
                reportDateLabel={snapshot.reportDateLabel}
                comparisonDateLabel={snapshot.comparisonDateLabel}
                fileName={snapshot.fileName}
                onSelectHospitalFilter={(name) =>
                  setFilters((prev) => ({
                    ...prev,
                    hospitalName:
                      prev.hospitalName === name ? 'all' : name,
                  }))
                }
                onNavigateToHospitalReport={(name) => {
                  setFocusHospitalName(name);
                  setActivePage('phonnakaew');
                }}
              />
            )}

            {activePage === 'hospitals' && (
              <Page2HospitalDeepDive
                records={filteredRecords}
                onNavigateToHospitalReport={(name) => {
                  setFocusHospitalName(name);
                  setActivePage('phonnakaew');
                }}
              />
            )}

            {activePage === 'phonnakaew' && (
              <Page3HospitalReport
                allRecords={snapshot.records}
                dailyTrends={snapshot.dailyTrends}
                reportDateLabel={snapshot.reportDateLabel}
                focusHospitalName={focusHospitalName}
                onChangeFocusHospital={setFocusHospitalName}
                onOpenShareModal={handleOpenShareModal}
                onNavigateToTargets2570={() => setActivePage('targets2570')}
                isExecutiveMode={isExecutiveMode}
              />
            )}

            {activePage === 'epidemiology' && (
              <Page4Epidemiology
                allRecords={snapshot.records}
                reportDateLabel={snapshot.reportDateLabel}
                populationDenominator={populationDenominator}
                onChangePopulationDenominator={handleChangePopulation}
              />
            )}

            {activePage === 'targets2570' && (
              <Page5Targets2570
                indicators={snapshot.fy2570Indicators}
                riskGroupTargets={snapshot.riskGroupTargets}
                quarterlyTargets={snapshot.quarterlyTargets}
                populationDenominator={populationDenominator}
                checkedActions={checkedActions}
                onToggleAction={handleToggleActionItem}
                onOpenShareModal={handleOpenShareModal}
                onNavigateToHospitalReport={() => {
                  setFocusHospitalName(DEFAULT_SHARED_HOSPITAL);
                  setActivePage('phonnakaew');
                }}
                isExecutiveMode={isExecutiveMode}
              />
            )}
          </div>
        </main>

        {/* Offscreen Consolidated 5-Page Container for Full PDF Export */}
        {renderFullReportForPdf && (
          <div
            aria-hidden="true"
            className="fixed left-[-9999px] top-0 w-[1200px] bg-white z-[-1]"
          >
            <div ref={fullReportRef}>
              <FullReportPrintView
                snapshot={snapshot}
                filteredRecords={filteredRecords}
                focusHospitalName={focusHospitalName}
                populationDenominator={populationDenominator}
              />
            </div>
          </div>
        )}

        {/* Quiet Editorial Footer */}
        <footer className="no-print border-t border-sky-200/80 bg-white mt-12">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <div>
              ระบบรายงานผลการคัดกรองวัณโรคเชิงรุก (ExportACF) · จังหวัดสกลนคร เขตสุขภาพที่ 8
            </div>
            <div className="font-mono tabular-nums">
              ช่วงความเชื่อมั่น 95% CI ใช้วิธี Wilson และ log(RR) · ปีงบประมาณ 2570
            </div>
          </div>
        </footer>

        {/* Significant-Change Alerts Drawer */}
        <AlertsDrawer
          isOpen={isAlertsOpen}
          onClose={() => setIsAlertsOpen(false)}
          alerts={alerts}
          onToggleAcknowledge={handleToggleAcknowledgeAlert}
          thresholds={thresholds}
          onSaveThresholds={handleSaveThresholds}
        />

        {/* Excel Import & Relational SQL Query Explorer Modal */}
        <ExcelImportSqlModal
          isOpen={importModalState.isOpen}
          initialTab={importModalState.tab}
          onClose={() =>
            setImportModalState((prev) => ({ ...prev, isOpen: false }))
          }
          currentSnapshot={snapshot}
          filteredRecords={filteredRecords}
          onApplyImportedSnapshot={handleApplyImportedSnapshot}
          onResetToBaseline={handleResetToBaseline}
        />

        {/* Share Live Executive Link Modal */}
        <ShareExecutiveModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          shareId={liveShareId}
          isPublicLive={isPublicLive}
          isSyncingShare={isSyncingShare}
          user={user}
          onSignInForLiveSync={handleSignIn}
          onTogglePublicLive={handleTogglePublicLive}
          onRegenerateShareId={handleRegenerateShareId}
          onSyncNowToCloud={handleSyncNowToCloud}
          onPreviewExecutivePreset={handlePreviewExecutivePreset}
          reportDateLabel={snapshot.reportDateLabel}
          provinceScreened={fullSummary.totalScreened}
          provinceTb={fullSummary.totalTb}
          provinceTbPct={fullSummary.tbPct}
          pnkScreened={pnkRow?.screened ?? 0}
          pnkRank={pnkRank}
          pnkAbnormalCxr={pnkRow?.abnormalCxr ?? 0}
          pnkTb={pnkRow?.tbDiagnosed ?? 0}
        />
      </div>
    </DashboardErrorBoundary>
  );
}

export default App;

