export type RiskCategory = 'chronic_dm_ckd' | 'high_risk_other' | 'non_risk';

export type ReportPageId =
  | 'overview'
  | 'hospitals'
  | 'phonnakaew'
  | 'epidemiology'
  | 'targets2570';

export interface HospitalRiskRecord {
  id: string;
  hospitalId: string;
  hospitalName: string;
  district: string;
  riskGroupId: string;
  riskGroupName: string;
  riskCategory: RiskCategory;
  isNineRiskGroup: boolean;
  screened: number;
  cxrDone: number;
  symptomatic: number;
  abnormalCxr: number;
  tbDiagnosed: number;
  afbPositive: number;
  xpertPositive: number;
  ltbiPositive: number;
  prevScreened5Nov: number;
  prevAbnormalCxr5Nov: number;
  prevTb5Nov: number;
}

export interface DailyTrendPoint {
  dateLabel: string;
  isoDate: string;
  cumulativeScreened: number;
  dailyScreened: number;
  cumulativeAbnormalCxr: number;
  cumulativeTb: number;
  milestoneNote?: string;
}

export interface MonthlyTrendPoint {
  monthLabel: string;
  fullMonthName: string;
  isoMonth: string;
  screened: number;
  targetMonthly: number;
  cxrDone: number;
  abnormalCxr: number;
  tbDiagnosed: number;
  workloadNote?: string;
}

export type EvaluationStatus =
  | 'passed'
  | 'action_required'
  | 'pending_verify'
  | 'awaiting_eval';

export interface Fy2570Indicator {
  id: string;
  code: string;
  name: string;
  quarterlyCriteria: string;
  phonNaKaeoTarget: string;
  currentStatusText: string;
  currentPct: number;
  targetPct: number;
  evaluationStatus: EvaluationStatus;
  evaluationLabel: string;
  detailNote: string;
}

export interface RiskGroupTarget2570 {
  riskGroupId: string;
  riskGroupName: string;
  target2570: number;
  screenedAcf: number;
  coveragePct: number;
  priorityLevel: 'critical_low' | 'moderate' | 'on_track';
}

export interface QuarterlyTargetPoint {
  quarter: string;
  label: string;
  targetCumulative: number;
  tbTargetCumulative: number;
  actualCumulative: number | null;
}

export type AlertSeverity = 'critical' | 'warning' | 'info';

export type AlertCategory =
  | 'volume_surge'
  | 'tb_cluster'
  | 'lab_gap'
  | 'data_quality'
  | 'target_milestone';

export interface ChangeAlert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  description: string;
  metricDelta: string;
  hospitalName: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface AlertThresholdConfig {
  minScreeningDeltaAlert: number;
  minTbRatePer1000Alert: number;
  minAbnormalCxrPctAlert: number;
  maxUnconfirmedCxrAlert: number;
  minSymptomRecordPctAlert: number;
}

export interface FilterState {
  hospitalName: string;
  riskCategory: 'all' | RiskCategory;
  findingFilter: 'all' | 'symptomatic' | 'abnormal_cxr' | 'tb_diagnosed';
  searchQuery: string;
}

export interface DatasetSnapshot {
  id: string;
  name: string;
  reportDateLabel: string;
  comparisonDateLabel: string;
  uploadedAt: string;
  fileName: string;
  records: HospitalRiskRecord[];
  dailyTrends: DailyTrendPoint[];
  monthlyTrends: MonthlyTrendPoint[];
  fy2570Indicators: Fy2570Indicator[];
  riskGroupTargets: RiskGroupTarget2570[];
  quarterlyTargets: QuarterlyTargetPoint[];
}

export type ShareViewPreset = 'targets2570' | 'phonnakaew' | 'overview_pnk';

export interface SharedDashboardLiveState {
  shareId: string;
  ownerId: string;
  title: string;
  defaultPage: ReportPageId;
  focusHospitalName: string;
  isPublicLive: boolean;
  populationDenominator: number;
  checkedActions: Record<string, boolean>;
  snapshot: DatasetSnapshot;
  updatedAtIso: string;
}

