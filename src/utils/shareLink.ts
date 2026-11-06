import { ReportPageId, ShareViewPreset } from '../types/tb';

export const DEFAULT_SHARED_HOSPITAL = 'รพ.โพนนาแก้ว';

export interface ParsedShareParams {
  isExecutiveMode: boolean;
  page: ReportPageId;
  hospitalName: string | null;
  shareId: string | null;
}

const VALID_SHARE_ID_REGEX = /^[a-zA-Z0-9_-]{8,128}$/;

export function isValidLiveShareId(id: string | null | undefined): id is string {
  return typeof id === 'string' && VALID_SHARE_ID_REGEX.test(id);
}

export function generateLiveShareId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    for (let i = 0; i < buf.length; i++) {
      suffix += chars[buf[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 16; i++) {
      suffix += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return `live-${suffix}`;
}

export function normalizePageParam(rawPage: string | null): ReportPageId {
  if (!rawPage) return 'overview';
  const cleaned = rawPage.trim().toLowerCase();
  if (
    cleaned === 'targets2570' ||
    cleaned === 'targets' ||
    cleaned === 'kpi' ||
    cleaned === 'indicators' ||
    cleaned === 'ตัวชี้วัด' ||
    cleaned === 'ตัวชี้วัด2570'
  ) {
    return 'targets2570';
  }
  if (
    cleaned === 'phonnakaew' ||
    cleaned === 'pnk' ||
    cleaned === 'hospital' ||
    cleaned === 'โพนนาแก้ว' ||
    cleaned === 'รพ.โพนนาแก้ว'
  ) {
    return 'phonnakaew';
  }
  if (cleaned === 'epidemiology' || cleaned === 'epi' || cleaned === 'ระบาดวิทยา') {
    return 'epidemiology';
  }
  if (cleaned === 'hospitals' || cleaned === 'รายโรงพยาบาล') {
    return 'hospitals';
  }
  return 'overview';
}

export function parseShareParams(search: string): ParsedShareParams {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  const modeParam = (params.get('mode') || '').trim().toLowerCase();
  const isExecutiveMode =
    modeParam === 'executive' || modeParam === 'exec' || modeParam === 'live';

  const rawPage = params.get('page') || params.get('view');
  const page = normalizePageParam(rawPage);

  const rawHospital = params.get('hospital');
  const hospitalName =
    rawHospital && rawHospital.trim().length > 0 ? rawHospital.trim() : null;

  const rawShare = params.get('share');
  const shareId = isValidLiveShareId(rawShare) ? rawShare : null;

  return {
    isExecutiveMode,
    page,
    hospitalName,
    shareId,
  };
}

export function resolveExecutiveShareOrigin(
  currentOrigin: string,
  preferPublicSharedOrigin = true
): string {
  const cleanOrigin = currentOrigin.replace(/\/+$/, '');
  if (preferPublicSharedOrigin && cleanOrigin.startsWith('https://ais-dev-')) {
    return cleanOrigin.replace('https://ais-dev-', 'https://ais-pre-');
  }
  return cleanOrigin;
}

export function buildExecutiveShareUrl(options: {
  origin: string;
  preset: ShareViewPreset;
  shareId?: string | null;
  hospitalName?: string;
}): string {
  const baseOrigin = options.origin.replace(/\/+$/, '');
  const params = new URLSearchParams();
  params.set('mode', 'executive');

  const targetHospital = options.hospitalName || DEFAULT_SHARED_HOSPITAL;

  if (options.preset === 'targets2570') {
    params.set('page', 'targets2570');
    params.set('hospital', targetHospital);
  } else if (options.preset === 'phonnakaew') {
    params.set('page', 'phonnakaew');
    params.set('hospital', targetHospital);
  } else {
    params.set('page', 'overview');
    params.set('hospital', targetHospital);
  }

  if (isValidLiveShareId(options.shareId)) {
    params.set('share', options.shareId);
  }

  return `${baseOrigin}/?${params.toString()}`;
}

export function buildExecutiveSummaryMessage(params: {
  reportDateLabel: string;
  provinceScreened: number;
  provinceTb: number;
  provinceTbPct: number;
  pnkScreened: number;
  pnkRank: number;
  pnkAbnormalCxr: number;
  pnkTb: number;
  targetsUrl: string;
  phonNaKaeoUrl: string;
}): string {
  return [
    `รายงานสถานการณ์คัดกรองวัณโรคเชิงรุก (ExportACF) จ.สกลนคร — ข้อมูล ณ ${params.reportDateLabel}`,
    `• ภาพรวมจังหวัด: คัดกรอง ${params.provinceScreened.toLocaleString()} ราย · พบผู้ป่วย TB ${params.provinceTb.toLocaleString()} ราย (${params.provinceTbPct}%)`,
    `• ข้อมูลเฉพาะ รพ.โพนนาแก้ว (อันดับ ${params.pnkRank}): คัดกรอง ${params.pnkScreened.toLocaleString()} ราย · CXR ผิดปกติ ${params.pnkAbnormalCxr} ราย · พบ TB ${params.pnkTb} ราย`,
    `• ตัวชี้วัดปีงบประมาณ 2570 (อ.โพนนาแก้ว): คัดกรอง 9 กลุ่มเสี่ยง Q1 ได้ 32.0% (806/2,520 ราย — ผ่านเกณฑ์ Q1 ที่ 25%)`,
    '',
    `ลิงก์ดูข้อมูลสดสำหรับผู้บริหาร:`,
    `1) หน้าตัวชี้วัด 2570 (ดูสด): ${params.targetsUrl}`,
    `2) ข้อมูลเฉพาะ รพ.โพนนาแก้ว (ดูสด): ${params.phonNaKaeoUrl}`,
  ].join('\n');
}
