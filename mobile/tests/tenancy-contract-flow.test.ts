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

const hostMod = compile('../src/services/host.ts', {
  require: (name: string) => (name === './accommodations' ? accommodationsStub : {}),
}) as typeof import('../src/services/host');

const roomTypesMod = compile('../src/services/host-room-types.ts', {
  require: (name: string) => (name === './host' ? hostMod : {}),
}) as typeof import('../src/services/host-room-types');

const contractsMod = compile('../src/services/rental-contracts.ts', {
  require: (name: string) =>
    name === './accommodations' ? accommodationsStub : name === './host' ? hostMod : {},
}) as typeof import('../src/services/rental-contracts');

const tenancyMod = compile('../src/services/room-tenancy.ts', {
  require: (name: string) => (name === './host' ? hostMod : {}),
}) as typeof import('../src/services/room-tenancy');

const wizardMod = compile('../src/services/contract-wizard.ts', {
  require: (name: string) => {
    if (name === './host') return hostMod;
    if (name === './host-room-types') return roomTypesMod;
    if (name === './rental-contracts') return contractsMod;
    if (name === './room-tenancy') return tenancyMod;
    return {};
  },
}) as typeof import('../src/services/contract-wizard');

const sampleRoom: import('../src/services/host').HostRoom = {
  roomId: 12,
  propertyId: 5,
  roomTypeId: 3,
  roomType: 'Phòng khép kín',
  roomNumber: 'P.102',
  floor: 'Tầng 1',
  status: 'OCCUPIED',
  price: 2500000,
  customPrice: null,
  areaSqm: 24,
  capacity: 2,
  deposit: 2500000,
  amenities: ['airConditioner', 'wifi'],
  leaseStartDate: '2026-11-21',
  leaseEndDate: '2027-11-21',
};

const sampleRoomType: import('../src/services/host').HostRoomType = {
  roomTypeId: 3,
  propertyId: 5,
  roomType: 'Phòng khép kín',
  price: 2800000, // Newer higher room-type price — must NEVER override confirmed tenancy rent!
  areaSqm: 24,
  capacity: 2,
  totalRooms: 4,
  vacantRooms: 1,
  deposit: 2800000,
  electricityPrice: 3800,
  waterPrice: 100000,
  internetPrice: 100000,
  servicePrice: 50000,
  amenities: ['airConditioner', 'wifi'],
};

const sampleTenancy: import('../src/services/room-tenancy').RoomTenancy = {
  key: 't-88',
  startDate: '2026-11-21',
  endDate: '2027-11-21',
  closedDate: null,
  monthlyRent: 2200000,
  deposit: 2200000,
  contractId: null,
  landlordSigned: false,
  tenantSigned: false,
  occupants: [
    {
      id: 1,
      name: 'Nguyễn Minh Quân',
      phone: '0987654321',
      joinedOn: '2026-11-21',
      leftOn: null,
      primaryTenant: true,
    },
  ],
};

test('tenancy validations enforce occupant date bounds, duplicate guard and close-date constraints', () => {
  assert.equal(tenancyMod.occupantInitials('Nguyễn Minh Quân'), 'MQ');
  assert.equal(tenancyMod.tenancyContractStatusMeta(sampleTenancy).hasContract, false);
  assert.equal(
    tenancyMod.tenancyContractStatusMeta({
      contractId: 9,
      landlordSigned: true,
      tenantSigned: false,
    }).tone,
    'warning'
  );
  assert.equal(
    tenancyMod.tenancyContractStatusMeta({
      contractId: 9,
      landlordSigned: true,
      tenantSigned: true,
    }).tone,
    'success'
  );

  // Start tenancy invalid date range
  const startErrs = tenancyMod.validateStartTenancyInput({
    name: 'A',
    phone: '123',
    startDate: '2026-12-01',
    endDate: '2026-11-01',
  });
  assert.ok(startErrs.name);
  assert.ok(startErrs.phone);
  assert.ok(startErrs.endDate);

  // Add co-occupant: duplicate & outside lease dates rejected
  const dupErrs = tenancyMod.validateAddOccupantInput(
    { name: 'Nguyễn Minh Quân', phone: '0987654321', joinedOn: '2026-12-01' },
    sampleTenancy
  );
  assert.ok(dupErrs.name);

  const outOfRangeErrs = tenancyMod.validateAddOccupantInput(
    { name: 'Trần Thị Hoa', phone: '', joinedOn: '2026-10-01' },
    sampleTenancy
  );
  assert.ok(outOfRangeErrs.joinedOn);

  const validOcc = tenancyMod.validateAddOccupantInput(
    { name: 'Trần Thị Hoa', phone: '', joinedOn: '2026-11-25' },
    sampleTenancy
  );
  assert.equal(Object.keys(validOcc).length, 0);

  // Close tenancy date cannot be in future or before start/last-left
  assert.ok(tenancyMod.validateCloseTenancyDate('2026-12-10', sampleTenancy, '2026-12-01'));
  assert.ok(tenancyMod.validateCloseTenancyDate('2026-11-10', sampleTenancy, '2026-12-01'));
  assert.equal(tenancyMod.validateCloseTenancyDate('2026-12-01', sampleTenancy, '2026-12-01'), null);
});

test('outstanding debt summary counts only unpaid/partial bills for the target room and ignores DRAFT/PAID', () => {
  const ledger = {
    month: '2026-11',
    bills: [
      { id: 1, roomId: 12, status: 'UNPAID', outstanding: '1500000', overdue: true },
      { id: 2, roomId: 12, status: 'DRAFT', outstanding: '2200000', overdue: false },
      { id: 3, roomId: 12, status: 'PAID', outstanding: '0', overdue: false },
      { id: 4, roomId: 99, status: 'UNPAID', outstanding: '3000000', overdue: true },
    ],
    earlierDebt: [
      { id: 5, roomId: 12, status: 'PARTIAL', outstanding: '400000', overdue: true },
      { id: 1, roomId: 12, status: 'UNPAID', outstanding: '1500000', overdue: true }, // duplicate id ignored
    ],
  } as unknown as import('../src/services/room-billing').BillingLedger;

  const summary = tenancyMod.summarizeRoomOutstandingDebt(ledger, 12);
  assert.ok(summary);
  assert.equal(summary.unpaidBillCount, 2);
  assert.equal(summary.totalOutstandingVnd, 1900000);
  assert.equal(summary.hasOverdue, true);
});

test('contract wizard preserves tenancy confirmed rent/deposit over newer room type price and inherits utility fees', () => {
  const draft = wizardMod.createContractWizardDraft({
    room: sampleRoom,
    roomType: sampleRoomType,
    user: { fullName: 'Lê Chủ Trọ', phoneNumber: '0912345678' },
    currentTenancy: sampleTenancy,
    defaultTemplate: {
      id: 'BASIC',
      name: 'Mẫu 1',
      description: 'Cơ bản',
      terms: '1. Trách nhiệm của bên A\n- Giao phòng.\n\n2. Trách nhiệm của bên B\n- Trả tiền.\n\n3. Trách nhiệm chung\n- Cam kết.',
    },
    today: '2026-11-22',
  });

  // Confirmed tenancy rent/deposit (2.200.000) takes precedence over roomType (2.800.000)
  assert.equal(draft.rent, '2200000');
  assert.equal(draft.deposit, '2200000');
  assert.equal(draft.tenantName, 'Nguyễn Minh Quân');
  assert.equal(draft.tenantPhone, '0987654321');
  assert.equal(draft.electricityPrice, '3800');
  assert.equal(draft.waterPrice, '100000');
  assert.equal(draft.internetPrice, '100000');
  assert.equal(draft.servicePrice, '50000');
  assert.equal(draft.reviewed, false);
});

test('contract wizard step validation catches tenant mismatch, date overlap, invalid amounts and review confirmation', () => {
  const base = wizardMod.createContractWizardDraft({
    room: sampleRoom,
    roomType: sampleRoomType,
    user: { fullName: 'Lê Chủ Trọ', phoneNumber: '0912345678' },
    currentTenancy: sampleTenancy,
    defaultTemplate: {
      id: 'HOUSE_RENTAL',
      name: 'Mẫu 2',
      description: '4 điều',
      terms: 'ĐIỀU 1: NỘI DUNG HỢP ĐỒNG\nNội dung.\n\nĐIỀU 2: QUYỀN VÀ NGHĨA VỤ CÁC BÊN\nQuyền.\n\nĐIỀU 3: CHẤM DỨT HỢP ĐỒNG\nChấm dứt.\n\nĐIỀU 4: CAM KẾT CỦA CÁC BÊN\nCam kết.',
    },
    today: '2026-11-22',
  });

  // Step 2: mismatch with primary tenant of current tenancy
  const step2Errs = wizardMod.validateContractWizardStep(
    2,
    { ...base, tenantName: 'Người Khác' },
    { currentTenancy: sampleTenancy }
  );
  assert.ok(step2Errs.tenantName);

  // Step 3: overlap with closed historical tenancy when creating new tenancy
  const history: import('../src/services/room-tenancy').RoomTenancy[] = [
    {
      ...sampleTenancy,
      key: 't-10',
      startDate: '2025-01-01',
      endDate: '2026-01-01',
      closedDate: '2025-12-31',
    },
  ];
  const overlapErrs = wizardMod.validateContractWizardStep(
    3,
    { ...base, leaseStartDate: '2025-11-01', leaseEndDate: '2026-06-01' },
    { currentTenancy: null, history }
  );
  assert.ok(overlapErrs.leaseStartDate);

  // Step 4: reviewed must be true
  const step4Errs = wizardMod.validateContractWizardStep(4, base);
  assert.ok(step4Errs.reviewed);
  assert.equal(wizardMod.firstContractErrorStep(step4Errs), 4);

  // Valid submission builds exact HOUSE_RENTAL payload & preview
  const ready = { ...base, reviewed: true, occupantCount: '2', paymentCycle: '1 tháng/lần' };
  const allErrs = wizardMod.validateContractWizardDraft(ready, { currentTenancy: sampleTenancy });
  assert.equal(Object.keys(allErrs).length, 0);

  const payload = wizardMod.buildContractCreatePayload(ready);
  assert.equal(payload.template, 'HOUSE_RENTAL');
  assert.equal(payload.rent, 2200000);
  assert.equal(payload.occupantCount, 2);
  assert.equal(payload.reviewed, true);

  const preview = wizardMod.buildContractPreviewRecord(ready, {
    roomNumber: 'P.102',
    propertyName: 'Nhà trọ Hòa Lạc',
    propertyAddress: 'Thạch Hòa, Hà Nội',
  });
  assert.equal(preview.id, 0);
  assert.equal(preview.ownerSignature, null);
  assert.equal(preview.tenantSignature, null);

  // Clauses split/join round-trip preserves full text
  const clauses = wizardMod.splitSystemTermsClauses(ready.terms);
  assert.equal(clauses?.length, 4);
  assert.equal(wizardMod.joinSystemTermsClauses(clauses!), ready.terms);
});

test('local draft serialization round-trips safely, resets reviewed flag and isolates by roomId', () => {
  const base = wizardMod.createContractWizardDraft({
    room: sampleRoom,
    roomType: sampleRoomType,
    user: { fullName: 'Lê Chủ Trọ', phoneNumber: '0912345678' },
    today: '2026-11-22',
  });
  const edited = { ...base, tenantName: 'Trần Văn B', reviewed: true };
  const raw = wizardMod.serializeContractWizardDraft(3, edited);

  const restored = wizardMod.parseContractWizardDraft(raw, 12, base);
  assert.ok(restored);
  assert.equal(restored.step, 3);
  assert.equal(restored.draft.tenantName, 'Trần Văn B');
  assert.equal(restored.draft.reviewed, false);

  // Wrong roomId returns null (never leaks draft across rooms)
  assert.equal(wizardMod.parseContractWizardDraft(raw, 99, base), null);
});

test('signature and scan file validators enforce exact backend constraints', () => {
  const validHash = 'a'.repeat(64);
  // TYPED valid
  assert.equal(
    wizardMod.validateSignatureSubmission({
      method: 'TYPED',
      confirmed: true,
      documentHash: validHash,
      strokes: [],
    }),
    null
  );
  // TYPED with strokes rejected
  assert.ok(
    wizardMod.validateSignatureSubmission({
      method: 'TYPED',
      confirmed: true,
      documentHash: validHash,
      strokes: [[{ x: 10, y: 10 }, { x: 40, y: 40 }]],
    })
  );
  // DRAWN empty rejected
  assert.ok(
    wizardMod.validateSignatureSubmission({
      method: 'DRAWN',
      confirmed: true,
      documentHash: validHash,
      strokes: [],
    })
  );
  // DRAWN out-of-bounds rejected
  assert.ok(
    wizardMod.validateSignatureSubmission({
      method: 'DRAWN',
      confirmed: true,
      documentHash: validHash,
      strokes: [[{ x: 10, y: 10 }, { x: 650, y: 20 }]],
    })
  );
  // DRAWN valid
  assert.equal(
    wizardMod.validateSignatureSubmission({
      method: 'DRAWN',
      confirmed: true,
      documentHash: validHash,
      strokes: [[{ x: 20, y: 50 }, { x: 140, y: 120 }, { x: 260, y: 80 }]],
    }),
    null
  );

  // Scan files limits: >5 files, >5MB single, >10MB total, unsupported MIME
  assert.ok(wizardMod.validateScanUploadFiles([]));
  assert.ok(
    wizardMod.validateScanUploadFiles([
      { fileName: 'a.webp', mimeType: 'image/webp', fileSize: 1000 },
    ])
  );
  assert.ok(
    wizardMod.validateScanUploadFiles([
      { fileName: 'big.pdf', mimeType: 'application/pdf', fileSize: 6 * 1024 * 1024 },
    ])
  );
  assert.equal(
    wizardMod.validateScanUploadFiles([
      { fileName: 'page1.jpg', mimeType: 'image/jpeg', fileSize: 1024 * 1024 },
      { fileName: 'contract.pdf', mimeType: 'application/pdf', fileSize: 2 * 1024 * 1024 },
    ]),
    null
  );
});
