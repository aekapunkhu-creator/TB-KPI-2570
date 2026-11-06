import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  AlertThresholdConfig,
  ChangeAlert,
  DatasetSnapshot,
  ReportPageId,
  SharedDashboardLiveState,
} from '../types/tb';
import { MONTHLY_TRENDS_12M_SEED } from '../data/seedData';
import { computeProvinceSummary } from '../utils/analytics';
import { isValidLiveShareId } from '../utils/shareLink';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export async function ensureUserProfileDoc(
  user: User,
  populationDenominator: number
): Promise<{ populationDenominator: number; liveShareId: string | null }> {
  const path = `users/${user.uid}`;
  try {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email: user.email || 'user@example.com',
        displayName: user.displayName || user.email || 'นักระบาดวิทยา',
        populationDenominator: Math.round(populationDenominator),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { populationDenominator, liveShareId: null };
    }
    const data = snap.data();
    return {
      populationDenominator:
        typeof data.populationDenominator === 'number'
          ? data.populationDenominator
          : populationDenominator,
      liveShareId: isValidLiveShareId(data.liveShareId) ? data.liveShareId : null,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveUserLiveShareId(
  user: User,
  liveShareId: string
): Promise<void> {
  if (!isValidLiveShareId(liveShareId)) return;
  const path = `users/${user.uid}`;
  try {
    const ref = doc(db, 'users', user.uid);
    await updateDoc(ref, {
      liveShareId,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updatePopulationDenominatorInCloud(
  user: User,
  populationDenominator: number
): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    const ref = doc(db, 'users', user.uid);
    await updateDoc(ref, {
      displayName: user.displayName || user.email || 'นักระบาดวิทยา',
      populationDenominator: Math.round(populationDenominator),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveDatasetSnapshotToCloud(
  user: User,
  snapshot: DatasetSnapshot
): Promise<void> {
  const safeId = snapshot.id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100);
  const path = `users/${user.uid}/datasets/${safeId}`;
  const summary = computeProvinceSummary(snapshot.records);

  const payloadJson = JSON.stringify({
    records: snapshot.records,
    dailyTrends: snapshot.dailyTrends,
    monthlyTrends: snapshot.monthlyTrends,
    fy2570Indicators: snapshot.fy2570Indicators,
    riskGroupTargets: snapshot.riskGroupTargets,
    quarterlyTargets: snapshot.quarterlyTargets,
  });

  try {
    await setDoc(doc(db, 'users', user.uid, 'datasets', safeId), {
      ownerId: user.uid,
      name: snapshot.name.slice(0, 160),
      reportDateLabel: snapshot.reportDateLabel.slice(0, 80),
      comparisonDateLabel: snapshot.comparisonDateLabel.slice(0, 80),
      fileName: snapshot.fileName.slice(0, 200),
      totalScreened: Math.round(summary.totalScreened),
      totalSymptomatic: Math.round(summary.totalSymptomatic),
      totalAbnormalCxr: Math.round(summary.totalAbnormalCxr),
      totalTb: Math.round(summary.totalTb),
      hospitalCount: Math.max(1, Math.round(summary.hospitalCount)),
      payloadJson,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function saveAlertsToCloud(
  user: User,
  datasetId: string,
  alerts: ChangeAlert[]
): Promise<void> {
  const safeDatasetId = datasetId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100);
  for (const alert of alerts.slice(0, 20)) {
    const safeAlertId = alert.id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100);
    const path = `users/${user.uid}/alerts/${safeAlertId}`;
    try {
      await setDoc(doc(db, 'users', user.uid, 'alerts', safeAlertId), {
        ownerId: user.uid,
        datasetId: safeDatasetId,
        severity: alert.severity,
        category: alert.category,
        title: alert.title.slice(0, 200),
        description: alert.description.slice(0, 600),
        hospitalName: alert.hospitalName.slice(0, 120),
        acknowledged: Boolean(alert.acknowledged),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
}

export async function acknowledgeAlertInCloud(
  user: User,
  alertId: string,
  acknowledged: boolean
): Promise<void> {
  const safeAlertId = alertId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100);
  const path = `users/${user.uid}/alerts/${safeAlertId}`;
  try {
    await updateDoc(doc(db, 'users', user.uid, 'alerts', safeAlertId), {
      acknowledged,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveAlertThresholdsToCloud(
  user: User,
  thresholds: AlertThresholdConfig
): Promise<void> {
  const path = `users/${user.uid}/alertSettings/default`;
  try {
    const ref = doc(db, 'users', user.uid, 'alertSettings', 'default');
    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      await setDoc(ref, {
        ownerId: user.uid,
        minScreeningDeltaAlert: Math.round(thresholds.minScreeningDeltaAlert),
        minTbRatePer1000Alert: Number(thresholds.minTbRatePer1000Alert),
        minAbnormalCxrPctAlert: Number(thresholds.minAbnormalCxrPctAlert),
        maxUnconfirmedCxrAlert: Math.round(thresholds.maxUnconfirmedCxrAlert),
        minSymptomRecordPctAlert: Number(thresholds.minSymptomRecordPctAlert),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        minScreeningDeltaAlert: Math.round(thresholds.minScreeningDeltaAlert),
        minTbRatePer1000Alert: Number(thresholds.minTbRatePer1000Alert),
        minAbnormalCxrPctAlert: Number(thresholds.minAbnormalCxrPctAlert),
        maxUnconfirmedCxrAlert: Math.round(thresholds.maxUnconfirmedCxrAlert),
        minSymptomRecordPctAlert: Number(thresholds.minSymptomRecordPctAlert),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeUserDatasets(
  user: User,
  onData: (snapshots: DatasetSnapshot[]) => void
): () => void {
  const path = `users/${user.uid}/datasets`;
  const q = query(
    collection(db, 'users', user.uid, 'datasets'),
    where('ownerId', '==', user.uid),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snap) => {
      const results: DatasetSnapshot[] = [];
      for (const d of snap.docs) {
        const data = d.data();
        try {
          const parsed = JSON.parse(data.payloadJson);
          results.push({
            id: d.id,
            name: data.name,
            reportDateLabel: data.reportDateLabel,
            comparisonDateLabel: data.comparisonDateLabel,
            uploadedAt: new Date().toISOString(),
            fileName: data.fileName,
            records: parsed.records || [],
            dailyTrends: parsed.dailyTrends || [],
            monthlyTrends: parsed.monthlyTrends || MONTHLY_TRENDS_12M_SEED,
            fy2570Indicators: parsed.fy2570Indicators || [],
            riskGroupTargets: parsed.riskGroupTargets || [],
            quarterlyTargets: parsed.quarterlyTargets || [],
          });
        } catch {
          // Skip malformed payload
        }
      }
      onData(results);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function publishSharedDashboardToCloud(params: {
  user: User;
  shareId: string;
  snapshot: DatasetSnapshot;
  populationDenominator: number;
  checkedActions: Record<string, boolean>;
  defaultPage?: ReportPageId;
  focusHospitalName?: string;
  isPublicLive?: boolean;
}): Promise<void> {
  const {
    user,
    shareId,
    snapshot,
    populationDenominator,
    checkedActions,
    defaultPage = 'targets2570',
    focusHospitalName = 'รพ.โพนนาแก้ว',
    isPublicLive = true,
  } = params;

  if (!isValidLiveShareId(shareId)) {
    throw new Error('รหัสลิงก์แชร์ไม่ถูกต้องตามรูปแบบที่กำหนด');
  }

  const path = `sharedDashboards/${shareId}`;
  const summary = computeProvinceSummary(snapshot.records);

  const payloadJson = JSON.stringify({
    records: snapshot.records,
    dailyTrends: snapshot.dailyTrends,
    monthlyTrends: snapshot.monthlyTrends,
    fy2570Indicators: snapshot.fy2570Indicators,
    riskGroupTargets: snapshot.riskGroupTargets,
    quarterlyTargets: snapshot.quarterlyTargets,
  }).slice(0, 800000);

  const checkedActionsJson = JSON.stringify(checkedActions || {}).slice(0, 10000);

  const mutableFields = {
    title: `รายงานตัวชี้วัดและข้อมูลเฉพาะ ${focusHospitalName}`.slice(0, 160),
    defaultPage,
    focusHospitalName: focusHospitalName.slice(0, 120) || 'รพ.โพนนาแก้ว',
    isPublicLive: Boolean(isPublicLive),
    reportDateLabel: snapshot.reportDateLabel.slice(0, 80),
    comparisonDateLabel: snapshot.comparisonDateLabel.slice(0, 80),
    fileName: snapshot.fileName.slice(0, 200),
    populationDenominator: Math.min(
      10000000,
      Math.max(100, Math.round(populationDenominator))
    ),
    totalScreened: Math.min(
      10000000,
      Math.max(0, Math.round(summary.totalScreened))
    ),
    totalSymptomatic: Math.min(
      10000000,
      Math.max(0, Math.round(summary.totalSymptomatic))
    ),
    totalAbnormalCxr: Math.min(
      10000000,
      Math.max(0, Math.round(summary.totalAbnormalCxr))
    ),
    totalTb: Math.min(1000000, Math.max(0, Math.round(summary.totalTb))),
    hospitalCount: Math.min(
      1000,
      Math.max(1, Math.round(summary.hospitalCount))
    ),
    checkedActionsJson,
    payloadJson,
  };

  try {
    const ref = doc(db, 'sharedDashboards', shareId);
    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      await setDoc(ref, {
        shareId,
        ownerId: user.uid,
        ...mutableFields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        ...mutableFields,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function toggleSharedDashboardPublicStatus(
  shareId: string,
  isPublicLive: boolean
): Promise<void> {
  if (!isValidLiveShareId(shareId)) return;
  const path = `sharedDashboards/${shareId}`;
  try {
    await updateDoc(doc(db, 'sharedDashboards', shareId), {
      isPublicLive: Boolean(isPublicLive),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeSharedDashboard(
  shareId: string,
  onData: (state: SharedDashboardLiveState | null) => void
): () => void {
  if (!isValidLiveShareId(shareId)) {
    onData(null);
    return () => {};
  }

  const path = `sharedDashboards/${shareId}`;
  const ref = doc(db, 'sharedDashboards', shareId);

  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const data = snap.data();
      try {
        const parsed = JSON.parse(data.payloadJson);
        const parsedActions = data.checkedActionsJson
          ? JSON.parse(data.checkedActionsJson)
          : {};
        const updatedAtIso =
          data.updatedAt && typeof data.updatedAt.toDate === 'function'
            ? data.updatedAt.toDate().toISOString()
            : new Date().toISOString();

        onData({
          shareId: data.shareId || snap.id,
          ownerId: data.ownerId,
          title: data.title || 'รายงานผู้บริหารดูสด',
          defaultPage: data.defaultPage || 'targets2570',
          focusHospitalName: data.focusHospitalName || 'รพ.โพนนาแก้ว',
          isPublicLive: Boolean(data.isPublicLive),
          populationDenominator:
            typeof data.populationDenominator === 'number'
              ? data.populationDenominator
              : 36955,
          checkedActions:
            parsedActions && typeof parsedActions === 'object'
              ? parsedActions
              : {},
          updatedAtIso,
          snapshot: {
            id: `shared-${snap.id}`,
            name: data.title || 'รายงานผู้บริหารดูสด',
            reportDateLabel: data.reportDateLabel || '6 พ.ย. 2569',
            comparisonDateLabel: data.comparisonDateLabel || '5 พ.ย. 2569',
            uploadedAt: updatedAtIso,
            fileName: data.fileName || 'ExportACF',
            records: parsed.records || [],
            dailyTrends: parsed.dailyTrends || [],
            monthlyTrends: parsed.monthlyTrends || MONTHLY_TRENDS_12M_SEED,
            fy2570Indicators: parsed.fy2570Indicators || [],
            riskGroupTargets: parsed.riskGroupTargets || [],
            quarterlyTargets: parsed.quarterlyTargets || [],
          },
        });
      } catch {
        onData(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

