import test from 'node:test';
import assert from 'node:assert/strict';
import { computePropertyCardStats } from '../src/services/host-management.js';
import { getVerificationRowActions } from '../src/services/staff-verifications.js';
import { reviewActionLabels } from '../src/services/verification-detail.js';

test('host sees hidden reverification separately from physical room counts', () => {
  const stats=computePropertyCardStats({propertyId:1,displayStatus:'INACTIVE',reverificationRequired:true,totalRooms:5,vacantRooms:2});
  assert.equal(stats.statusMeta.label,'Chờ tái xác minh');
  assert.equal(stats.totalRooms,5);assert.equal(stats.vacantRooms,2);
});
test('critical changes require opening staff detail rather than quick approval', () => {
  const row={registrationId:12,targetPropertyId:1,status:'PENDING',canReview:true,assignmentVersion:0,readyForApproval:true,reverificationRequired:true};
  const actions=getVerificationRowActions(row);
  assert.equal(actions.primary.to,'/staff/verifications/detail?id=12');
  assert.equal(actions.secondary.some(action=>action.id==='quick-approve'),false);
  assert.match(actions.statusHint,/tạm ẩn/);
  assert.equal(getVerificationRowActions({...row,reverificationRequired:false}).secondary.some(action=>action.id==='quick-approve'),true);
  assert.match(reviewActionLabels.REVERIFICATION_SUBMITTED,/tái xác minh/);
});
