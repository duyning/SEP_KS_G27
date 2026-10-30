import test from 'node:test';
import assert from 'node:assert/strict';
import {filterServiceApplications, serviceApplicationCounts, serviceApplicationPrice} from '../src/services/service-applications-view.js';
const rows = [
  {registrationId:1, serviceName:'Chuyển trọ An Tâm', applicantName:'Nguyễn Văn An', status:'PENDING', categoryName:'Chuyển trọ', createdAt:'2026-10-01T10:00:00', contactPhone:'0912345678', serviceArea:'Tân Xã'},
  {registrationId:2, serviceName:'Dọn dẹp', applicantName:'Thảo', status:'APPROVED', categoryName:'Vệ sinh', createdAt:'2026-10-02T10:00:00'},
  {registrationId:3, serviceName:'Chuyển phòng', applicantName:'Bảo', status:'NEEDS_SUPPLEMENT', categoryName:'Chuyển trọ', createdAt:'2026-10-03T10:00:00'},
];
test('staff filters combine status, category and accent-insensitive applicant or ID search', () => {
  assert.deepEqual(filterServiceApplications(rows,{q:'nguyen van',category:'Chuyển trọ',status:'PENDING'}).map(r=>r.registrationId),[1]);
  assert.equal(filterServiceApplications(rows,{q:'DV-3'})[0].registrationId,3);
  assert.equal(filterServiceApplications(rows,{q:'091234'}).length,1);
  assert.equal(filterServiceApplications(rows,{q:'tan xa'}).length,1);
  assert.equal(filterServiceApplications(rows,{status:'REJECTED'}).length,0);
  assert.equal(filterServiceApplications(rows,{category:'Unknown'}).length,0);
});
test('staff queue sorting leaves source intact and counts all statuses independently', () => {
  assert.deepEqual(filterServiceApplications(rows,{sort:'NEWEST'}).map(r=>r.registrationId),[3,2,1]);
  assert.deepEqual(rows.map(r=>r.registrationId),[1,2,3]);
  assert.deepEqual(serviceApplicationCounts(rows),{ALL:3,PENDING:1,NEEDS_SUPPLEMENT:1,APPROVED:1,REJECTED:0});
  assert.equal(serviceApplicationCounts([]).ALL,0);
});
test('missing price stays unknown and negotiated quotes are explicit', () => {
  assert.equal(serviceApplicationPrice({pricingType:'FIXED',price:null}),'Chưa có giá');
  assert.equal(serviceApplicationPrice({pricingType:'NEGOTIABLE'}),'Thỏa thuận');
  assert.equal(serviceApplicationPrice({pricingType:'FROM',price:150000}),'Từ 150.000 VNĐ');
});
