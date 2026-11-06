import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExecutiveShareUrl,
  buildExecutiveSummaryMessage,
  generateLiveShareId,
  isValidLiveShareId,
  parseShareParams,
  resolveExecutiveShareOrigin,
} from './shareLink';

test('parseShareParams decodes executive KPI and Phon Na Kaeo hospital links accurately', () => {
  const kpiParsed = parseShareParams(
    '?mode=executive&page=targets2570&hospital=รพ.โพนนาแก้ว&share=live-abc12345'
  );
  assert.equal(kpiParsed.isExecutiveMode, true);
  assert.equal(kpiParsed.page, 'targets2570');
  assert.equal(kpiParsed.hospitalName, 'รพ.โพนนาแก้ว');
  assert.equal(kpiParsed.shareId, 'live-abc12345');

  const pnkParsed = parseShareParams(
    '?mode=executive&page=phonnakaew&hospital=%E0%B8%A3%E0%B8%9E.%E0%B9%82%E0%B8%9E%E0%B8%99%E0%B8%99%E0%B8%B2%E0%B9%81%E0%B8%81%E0%B9%89%E0%B8%A7'
  );
  assert.equal(pnkParsed.isExecutiveMode, true);
  assert.equal(pnkParsed.page, 'phonnakaew');
  assert.equal(pnkParsed.hospitalName, 'รพ.โพนนาแก้ว');
  assert.equal(pnkParsed.shareId, null);

  const invalidShareParsed = parseShareParams('?mode=executive&share=bad$id');
  assert.equal(invalidShareParsed.shareId, null);
});

test('resolveExecutiveShareOrigin maps ais-dev origin to ais-pre when public shared origin is preferred', () => {
  const devOrigin =
    'https://ais-dev-2kyw3fejql2iusa3j5aqok-845859339914.asia-southeast1.run.app';
  const expectedPre =
    'https://ais-pre-2kyw3fejql2iusa3j5aqok-845859339914.asia-southeast1.run.app';

  assert.equal(resolveExecutiveShareOrigin(devOrigin, true), expectedPre);
  assert.equal(resolveExecutiveShareOrigin(devOrigin, false), devOrigin);
  assert.equal(
    resolveExecutiveShareOrigin('http://localhost:3000', true),
    'http://localhost:3000'
  );
});

test('buildExecutiveShareUrl produces valid deep-link URLs for KPIs and Phon Na Kaeo Hospital', () => {
  const origin =
    'https://ais-pre-2kyw3fejql2iusa3j5aqok-845859339914.asia-southeast1.run.app';
  const shareId = generateLiveShareId();
  assert.equal(isValidLiveShareId(shareId), true);

  const targetsUrl = buildExecutiveShareUrl({
    origin,
    preset: 'targets2570',
    shareId,
  });
  const pnkUrl = buildExecutiveShareUrl({
    origin,
    preset: 'phonnakaew',
    shareId,
  });

  const parsedTargets = parseShareParams(new URL(targetsUrl).search);
  assert.equal(parsedTargets.isExecutiveMode, true);
  assert.equal(parsedTargets.page, 'targets2570');
  assert.equal(parsedTargets.shareId, shareId);

  const parsedPnk = parseShareParams(new URL(pnkUrl).search);
  assert.equal(parsedPnk.isExecutiveMode, true);
  assert.equal(parsedPnk.page, 'phonnakaew');
  assert.equal(parsedPnk.hospitalName, 'รพ.โพนนาแก้ว');
  assert.equal(parsedPnk.shareId, shareId);

  const msg = buildExecutiveSummaryMessage({
    reportDateLabel: '6 พ.ย. 2569',
    provinceScreened: 5652,
    provinceTb: 22,
    provinceTbPct: 0.39,
    pnkScreened: 830,
    pnkRank: 1,
    pnkAbnormalCxr: 40,
    pnkTb: 7,
    targetsUrl,
    phonNaKaeoUrl: pnkUrl,
  });
  assert.ok(msg.includes('รพ.โพนนาแก้ว'));
  assert.ok(msg.includes(targetsUrl));
  assert.ok(msg.includes(pnkUrl));
});
