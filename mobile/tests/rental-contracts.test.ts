/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const ts = createRequire(import.meta.url)('typescript');

function compile(file: string, bindings: Record<string, unknown>) {
  const module = { exports: {} };
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    { module, exports: module.exports, URL, process: { env: {} }, ...bindings }
  );
  return module.exports;
}

const accommodationsStub = {
  getApiBase: () => 'https://api.hlrcs.example',
  requestJson: async () => ({ response: { ok: false, status: 500 }, result: null }),
};

const hostModels = compile('../src/services/host.ts', {
  require: (name: string) => (name === './accommodations' ? accommodationsStub : {}),
}) as typeof import('../src/services/host');

const contracts = compile('../src/services/rental-contracts.ts', {
  require: (name: string) => {
    if (name === './accommodations') return accommodationsStub;
    if (name === './host') return hostModels;
    return {};
  },
}) as typeof import('../src/services/rental-contracts');

const baseRecord: import('../src/services/rental-contracts').RentalContractRecord = {
  id: 101,
  status: 'ACTIVE',
  propertyName: 'Nhà trọ Hòa Lạc Xanh',
  propertyAddress: 'Thôn 3, Thạch Hòa, Thạch Thất, Hà Nội',
  roomNumber: 'P.102',
  startDate: '2026-11-21',
  endDate: '2027-11-21',
  createdAt: '2026-11-21T10:00:00',
  closedAt: null,
  documentHash: 'a'.repeat(64),
  ownerSignature: null,
  tenantSignature: null,
  details: {
    roomId: 12,
    template: 'BASIC',
    contractDate: '2026-11-21',
    landlordName: 'Nguyễn Văn A',
    landlordPhone: '0912345678',
    tenantName: 'Trần Thị B',
    tenantPhone: '0987654321',
    rent: 3200000,
    deposit: 3200000,
    paymentDay: 5,
    paymentMethod: 'Chuyển khoản',
    electricityPrice: 3800,
    waterPrice: 100000,
    waterUnit: 'người',
    terms:
      '1. Trách nhiệm của bên A\n- Bàn giao phòng đúng hạn.\n\n2. Trách nhiệm của bên B\n- Thanh toán đúng hạn.\n\n3. Trách nhiệm chung\n- Hai bên cam kết thực hiện.',
  },
};

test('separates ACTIVE management status from all 4 signature combinations', () => {
  assert.equal(contracts.contractManagementMeta('ACTIVE').label, 'Đang quản lý');
  assert.equal(contracts.contractManagementMeta('CLOSED').label, 'Đã kết thúc');

  // 1. Neither signed
  const s0 = contracts.evaluateSignatureProgress(baseRecord);
  assert.equal(s0.signedCount, 0);
  assert.equal(s0.summaryLabel, '0/2 bên đã ký');
  assert.equal(s0.canInviteTenant, true);
  assert.equal(s0.canOwnerSign, true);

  // 2. Owner only signed
  const sOwner = contracts.evaluateSignatureProgress({
    ...baseRecord,
    ownerSignature: { name: 'Nguyễn Văn A', signedAt: '2026-11-21T10:05:00Z', method: 'TYPED' },
  });
  assert.equal(sOwner.signedCount, 1);
  assert.equal(sOwner.summaryLabel, '1/2 bên đã ký');
  assert.equal(sOwner.ownerSigned, true);
  assert.equal(sOwner.tenantSigned, false);
  assert.equal(sOwner.canInviteTenant, true);
  assert.equal(sOwner.canOwnerSign, false);

  // 3. Tenant only signed
  const sTenant = contracts.evaluateSignatureProgress({
    ...baseRecord,
    tenantSignature: { name: 'Trần Thị B', signedAt: '2026-11-21T11:00:00Z', method: 'TYPED' },
  });
  assert.equal(sTenant.signedCount, 1);
  assert.equal(sTenant.summaryLabel, '1/2 bên đã ký');
  assert.equal(sTenant.canInviteTenant, false);
  assert.equal(sTenant.canOwnerSign, true);

  // 4. Both signed
  const sBoth = contracts.evaluateSignatureProgress({
    ...baseRecord,
    ownerSignature: { name: 'Nguyễn Văn A', signedAt: '2026-11-21T10:05:00Z', method: 'TYPED' },
    tenantSignature: { name: 'Trần Thị B', signedAt: '2026-11-21T11:00:00Z', method: 'TYPED' },
  });
  assert.equal(sBoth.signedCount, 2);
  assert.equal(sBoth.summaryLabel, '2/2 bên đã ký');
  assert.equal(sBoth.canInviteTenant, false);
  assert.equal(sBoth.canOwnerSign, false);
});

test('closed contract or missing tenant phone disables signing actions with clear reasons', () => {
  const closed = contracts.evaluateSignatureProgress({ ...baseRecord, status: 'CLOSED' });
  assert.equal(closed.canInviteTenant, false);
  assert.equal(closed.canOwnerSign, false);
  assert.ok(closed.inviteDisabledReason?.includes('kết thúc'));

  const noPhone = contracts.evaluateSignatureProgress({
    ...baseRecord,
    details: { ...baseRecord.details, tenantPhone: '' },
  });
  assert.equal(noPhone.canInviteTenant, false);
  assert.ok(noPhone.inviteDisabledReason?.includes('số điện thoại'));
});

test('validates signing link responses, builds web signing URL and detects expiration', () => {
  assert.throws(() => contracts.validateSigningLinkResult({ token: 'short', expiresAt: 'bad' }));
  const validToken = 'A'.repeat(43);
  const validRes = contracts.validateSigningLinkResult({
    token: validToken,
    expiresAt: '2026-11-28T10:00:00Z',
  });
  assert.equal(validRes.token, validToken);

  const url = contracts.buildSigningUrl(validToken, 'https://app.hlrcs.vn/');
  assert.equal(url, `https://app.hlrcs.vn/contracts/sign#${validToken}`);

  assert.equal(
    contracts.isInvitationExpired({ url, expiresAt: '2026-11-28T10:00:00Z' }, Date.parse('2026-11-21T10:00:00Z')),
    false
  );
  assert.equal(
    contracts.isInvitationExpired({ url, expiresAt: '2026-11-20T10:00:00Z' }, Date.parse('2026-11-21T10:00:00Z')),
    true
  );
});

test('renders verbatim official HTML across BASIC, HOUSE_RENTAL, drawn SVG signatures and long terms without altering confirmed price', () => {
  const signedWithDrawn: import('../src/services/rental-contracts').RentalContractRecord = {
    ...baseRecord,
    ownerSignature: {
      name: 'Nguyễn Văn A',
      signedAt: '2026-11-21T10:05:00Z',
      method: 'DRAWN',
      strokes: [
        [
          { x: 10, y: 20 },
          { x: 120, y: 80 },
        ],
      ],
    },
    details: {
      ...baseRecord.details,
      terms: baseRecord.details.terms + '\n' + '- Điều khoản bổ sung.\n'.repeat(120),
    },
  };

  const html = contracts.buildContractHtmlDocument(signedWithDrawn, { fontScalePercent: 115 });
  assert.doesNotMatch(html, /Mã hợp đồng|#HD-101/);
  assert.ok(html.includes('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'));
  assert.ok(html.includes('3.200.000 đ/tháng'));
  assert.ok(html.includes('<polyline points="10,20 120,80"'));
  assert.ok(html.includes('Điều khoản bổ sung.'));

  const toc = contracts.extractContractToc(signedWithDrawn);
  assert.ok(toc.some(item => item.id === 'sec-party-a'));
  assert.ok(toc.some(item => item.id === 'sec-signatures'));

  const houseRecord: import('../src/services/rental-contracts').RentalContractRecord = {
    ...baseRecord,
    details: {
      ...baseRecord.details,
      template: 'HOUSE_RENTAL',
      terms: 'ĐIỀU 1: NỘI DUNG HỢP ĐỒNG\n1.2 Mục đích thuê nhà\nĐể ở.\n\nĐIỀU 2: QUYỀN VÀ NGHĨA VỤ\nThực hiện đúng.',
    },
  };
  const houseHtml = contracts.buildContractHtmlDocument(houseRecord);
  assert.doesNotMatch(houseHtml, /Mã hợp đồng|#HD-101/);
  assert.ok(houseHtml.includes('HỢP ĐỒNG THUÊ NHÀ TRỌ'));
  assert.ok(houseHtml.includes('ĐIỀU 1: NỘI DUNG HỢP ĐỒNG'));
  assert.ok(contracts.extractContractToc(houseRecord).length >= 4);
  for (const record of [signedWithDrawn, houseRecord]) {
    assert.match(contracts.buildContractHtmlDocument(record, { forPrint: true }), /Mã hợp đồng: #HD-101/);
  }
});

test('validates contract list envelope strictly and masks phone preview cleanly', () => {
  assert.throws(() => contracts.validateRentalContractsList({ notArray: true }));
  assert.throws(() =>
    contracts.validateRentalContractsList([{ id: 1, status: 'UNKNOWN', details: { terms: '' } }])
  );
  const ok = contracts.validateRentalContractsList([baseRecord]);
  assert.equal(ok.length, 1);

  assert.equal(contracts.maskPhoneForPreview('0987654321'), '098****321');
  assert.equal(contracts.maskPhoneForPreview(''), 'Chưa có SĐT');
});
