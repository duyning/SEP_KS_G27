import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VERIFICATION_STATUS_TABS,
  classifyVerificationRecord,
  computeVerificationMetrics,
  filterAndSortVerifications,
  getVerificationDetailActions,
  getVerificationRowActions,
  getVerificationWait,
} from '../src/services/staff-verifications.js';

test('combined approval requires both identity sides and fire safety before granting host access',()=>{
  const detail={summary:{status:'PENDING',hostOnboarding:true},canReview:true,
    submission:{termsAccepted:true},photos:[{type:'PHOTO_0'}],documents:[{type:'OWNERSHIP'},{type:'ID_CARD'}]};
  assert.equal(getVerificationDetailActions(detail).mandatoryReady,false);
  detail.documents.push({type:'ID_CARD_BACK'});
  assert.equal(getVerificationDetailActions(detail).mandatoryReady,false);
  detail.documents.push({type:'FIRE_SAFETY'});
  const actions=getVerificationDetailActions(detail);
  assert.equal(actions.mandatoryReady,true);
  assert.equal(actions.decisions.find(item=>item.decision==='APPROVE').label,'Duyệt chủ trọ & Nhà trọ');
  assert.equal(actions.decisions.find(item=>item.decision==='APPROVE').disabled,false);
});

const sampleVerifications = [
  {
    registrationId: 101,
    name: 'Nhà trọ Xanh Hòa Lạc',
    address: 'Thôn 3, Thạch Hòa',
    ownerName: 'Nguyễn Văn An',
    ownerPhone: '0912345678',
    ownerEmail: 'an@example.com',
    status: 'PENDING',
    createdAt: '2026-11-01T08:00:00',
    submittedAt: null,
    reviewedAt: null,
    documentCount: 3,
    requiredDocumentCount: 2,
    photoCount: 4,
    coverId: 11,
    canReview: true,
    readyForApproval: true,
    assignmentVersion: 1,
    assignedStaffName: 'Trần Minh Staff',
  },
  {
    registrationId: 102,
    name: 'Khu trọ Sinh Viên FPT',
    address: 'Tân Xã, Thạch Thất',
    ownerName: 'Lê Thị Bình',
    ownerPhone: '0987654321',
    status: 'PENDING',
    createdAt: '2026-11-02T09:00:00',
    submittedAt: '2026-11-05T10:30:00',
    documentCount: 1,
    requiredDocumentCount: 1,
    photoCount: 2,
    coverId: 12,
    canReview: true,
    readyForApproval: false,
    assignmentVersion: 2,
  },
  {
    registrationId: 103,
    name: 'Chung cư mini Bình Yên',
    address: 'Bình Yên, Thạch Thất',
    ownerName: 'Phạm Hoàng',
    status: 'NEEDS_SUPPLEMENT',
    createdAt: '2026-11-03T10:00:00',
    reviewedAt: '2026-11-04T14:00:00',
    reviewerName: 'Trần Minh Staff',
    documentCount: 2,
    requiredDocumentCount: 2,
    targetPropertyId: 55,
    canReview: true,
    readyForApproval: true,
    assignmentVersion: 3,
    reasonNote: 'Vui lòng chụp rõ mặt sau CCCD và bổ sung ảnh hành lang.',
  },
  {
    registrationId: 104,
    name: 'Nhà trọ Hoa Phượng',
    address: 'Phú Cát, Quốc Oai',
    ownerName: 'Đỗ Mai',
    status: 'APPROVED',
    createdAt: '2026-10-25T08:00:00',
    reviewedAt: '2026-10-26T11:00:00',
    reviewerName: 'Trần Minh Staff',
    documentCount: 3,
    requiredDocumentCount: 2,
    canReview: false,
    publishedPropertyId: 88,
    assignmentVersion: 1,
    reasonNote: 'Hồ sơ đã được phê duyệt.',
  },
  {
    registrationId: 105,
    name: 'Nhà trọ Mẫu Không Đạt',
    address: 'Thạch Hòa',
    ownerName: 'Hoàng Nam',
    status: 'REJECTED',
    createdAt: '2026-10-20T08:00:00',
    reviewedAt: '2026-10-21T16:00:00',
    reviewerName: 'Trần Minh Staff',
    documentCount: 0,
    requiredDocumentCount: 0,
    canReview: false,
    assignmentVersion: 1,
    reasonNote: 'Giấy tờ không khớp với chủ sở hữu và địa chỉ thực tế.',
  },
];

test('status tabs separate APPROVED and REJECTED and compute exact live metrics', () => {
  assert.deepEqual(
    VERIFICATION_STATUS_TABS.map(tab => tab.value),
    ['ALL', 'PENDING', 'NEEDS_SUPPLEMENT', 'APPROVED', 'REJECTED']
  );

  const metrics = computeVerificationMetrics(sampleVerifications);
  assert.deepEqual(metrics.counts, {
    ALL: 5,
    PENDING: 2,
    NEEDS_SUPPLEMENT: 1,
    APPROVED: 1,
    REJECTED: 1,
  });
  assert.equal(metrics.kinds.ACTIONABLE, 2);
  assert.equal(metrics.kinds.UPDATE_PROPOSAL, 1);
  assert.equal(metrics.kinds.NEW_PROPERTY, 4);
  assert.equal(metrics.kinds.RESUBMITTED, 1);
  assert.equal(metrics.readyPendingCount, 1);
});

test('filtering supports status tags, classification chips, Vietnamese folding, and SLA priority sort', () => {
  assert.deepEqual(
    filterAndSortVerifications(sampleVerifications, { status: 'APPROVED' }).map(item => item.registrationId),
    [104]
  );
  assert.deepEqual(
    filterAndSortVerifications(sampleVerifications, { status: 'REJECTED' }).map(item => item.registrationId),
    [105]
  );
  assert.deepEqual(
    filterAndSortVerifications(sampleVerifications, { kind: 'UPDATE_PROPOSAL' }).map(item => item.registrationId),
    [103]
  );
  assert.deepEqual(
    filterAndSortVerifications(sampleVerifications, { kind: 'RESUBMITTED' }).map(item => item.registrationId),
    [102]
  );
  // Unaccented Vietnamese search + record code search
  assert.deepEqual(
    filterAndSortVerifications(sampleVerifications, { search: 'xanh hoa lac' }).map(item => item.registrationId),
    [101]
  );
  assert.deepEqual(
    filterAndSortVerifications(sampleVerifications, { search: 'HS-103' }).map(item => item.registrationId),
    [103]
  );
  // PRIORITY sort puts oldest waiting PENDING first, then newer PENDING, then NEEDS_SUPPLEMENT, then finalized
  assert.deepEqual(
    filterAndSortVerifications(sampleVerifications, { sort: 'PRIORITY' }).map(item => item.registrationId),
    [101, 102, 103, 104, 105]
  );
});

test('queue offers only a detail link for every status and permission', () => {
  for (const row of sampleVerifications) {
    for (const canReview of [true, false]) {
      const actions = getVerificationRowActions({...row, canReview});
      assert.equal(actions.primary.label, 'Thẩm định ngay');
      assert.equal(actions.primary.to, '/staff/verifications/detail?id=' + row.registrationId);
      assert.equal(actions.primary.kind, 'link');
      assert.deepEqual(actions.secondary, []);
    }
  }
});

test('waiting reminder uses latest submission, only after 48 hours and only pending review', () => {
  const now=Date.parse('2026-11-16T12:00:00');
  const old={status:'PENDING',createdAt:'2026-11-10T12:00:00'};
  assert.equal(getVerificationWait(old,now).overdue,true);
  assert.equal(getVerificationWait(old,now).label,'6 ngày');
  assert.equal(getVerificationWait({...old,submittedAt:'2026-11-14T12:00:00'},now).overdue,false);
  assert.equal(getVerificationWait({...old,submittedAt:'2026-11-14T11:59:59'},now).overdue,true);
  assert.equal(getVerificationWait({...old,submittedAt:'2026-11-16T10:00:00'},now).overdue,false);
  for(const status of ['NEEDS_SUPPLEMENT','APPROVED','REJECTED']) {
    assert.equal(getVerificationWait({...old,status},now).overdue,false);
  }
  for(const createdAt of [null,'invalid','2026-11-20T12:00:00']) {
    assert.equal(getVerificationWait({status:'PENDING',createdAt},now).overdue,false);
  }
});

test('detail decision panel actions adapt per workflow state without dead disabled buttons on finalized records', () => {
  const fullEvidence = {
    photos: [{ documentId: 1, type: 'PHOTO_0' }],
    documents: [
      { documentId: 2, type: 'OWNERSHIP' },
      { documentId: 3, type: 'ID_CARD' },
      { documentId: 4, type: 'FIRE_SAFETY' },
    ],
    submission: { termsAccepted: true },
  };

  // PENDING + ready + canReview
  const activeReady = getVerificationDetailActions({
    ...fullEvidence,
    summary: sampleVerifications[0],
    canReview: true,
  });
  assert.equal(activeReady.mode, 'ACTIVE_REVIEW');
  assert.equal(activeReady.mandatoryReady, true);
  assert.deepEqual(
    activeReady.decisions.map(d => [d.decision, d.disabled]),
    [
      ['APPROVE', false],
      ['REQUEST_SUPPLEMENT', false],
      ['REJECT', false],
    ]
  );

  // PENDING + missing ID_CARD + canReview => APPROVE disabled with reason, REQUEST_SUPPLEMENT recommended
  const activeIncomplete = getVerificationDetailActions({
    photos: [{ documentId: 1, type: 'PHOTO_0' }],
    documents: [{ documentId: 2, type: 'OWNERSHIP' }],
    submission: { termsAccepted: true },
    summary: sampleVerifications[1],
    canReview: true,
  });
  assert.equal(activeIncomplete.mandatoryReady, false);
  assert.equal(activeIncomplete.decisions[0].disabled, true);
  assert.ok(activeIncomplete.decisions[0].disabledReason.length > 10);
  assert.equal(activeIncomplete.decisions[1].recommended, true);

  // NEEDS_SUPPLEMENT + canReview => WAITING_SUPPLEMENT, never offers duplicate REQUEST_SUPPLEMENT
  const waitingSupplement = getVerificationDetailActions({
    ...fullEvidence,
    summary: sampleVerifications[2],
    canReview: true,
    reasonNote: sampleVerifications[2].reasonNote,
  });
  assert.equal(waitingSupplement.mode, 'WAITING_SUPPLEMENT');
  assert.equal(
    waitingSupplement.decisions.some(d => d.decision === 'REQUEST_SUPPLEMENT'),
    false
  );

  // APPROVED => FINAL_APPROVED, zero decision buttons, has publicPropertyUrl
  const finalizedApproved = getVerificationDetailActions({
    ...fullEvidence,
    summary: sampleVerifications[3],
    canReview: false,
  });
  assert.equal(finalizedApproved.mode, 'FINAL_APPROVED');
  assert.deepEqual(finalizedApproved.decisions, []);
  assert.equal(finalizedApproved.publicPropertyUrl, '/properties/detail?propertyId=88');

  // REJECTED => FINAL_REJECTED, zero decision buttons
  const finalizedRejected = getVerificationDetailActions({
    ...fullEvidence,
    summary: sampleVerifications[4],
    canReview: false,
    reasonNote: sampleVerifications[4].reasonNote,
  });
  assert.equal(finalizedRejected.mode, 'FINAL_REJECTED');
  assert.deepEqual(finalizedRejected.decisions, []);

  // Admin / Read-only on PENDING => READ_ONLY_SUPERVISION, zero decision buttons
  const supervision = getVerificationDetailActions({
    ...fullEvidence,
    summary: sampleVerifications[0],
    assignedStaffName: 'Trần Minh Staff',
    canReview: false,
  });
  assert.equal(supervision.mode, 'READ_ONLY_SUPERVISION');
  assert.deepEqual(supervision.decisions, []);
  assert.equal(classifyVerificationRecord(sampleVerifications[2]).submissionLabel, 'Cập nhật');
});

test('verification queue defaults to latest submission first, including resubmissions and undated records last',()=>{const rows=[{registrationId:1,createdAt:'2026-11-01T10:00:00'},{registrationId:3,createdAt:'2026-11-03T10:00:00'},{registrationId:2,createdAt:'2026-11-02T10:00:00',submittedAt:'2026-11-04T10:00:00'},{registrationId:4,createdAt:null}];assert.deepEqual(filterAndSortVerifications(rows).map(row=>row.registrationId),[2,3,1,4]);assert.deepEqual(rows.map(row=>row.registrationId),[1,3,2,4]);});


test('submission badges distinguish initial submission, updates, and later supplements', () => {
  const original={status:'PENDING',createdAt:'2026-11-16T10:00:00',submittedAt:'2026-11-16T10:00:00'};
  assert.equal(classifyVerificationRecord(original).submissionLabel,'Đăng ký mới');
  assert.equal(classifyVerificationRecord({...original,targetPropertyId:4}).submissionLabel,'Cập nhật');
  assert.equal(classifyVerificationRecord({...original,submittedAt:'2026-11-17T10:00:00'}).submissionLabel,'Đã bổ sung');
});
