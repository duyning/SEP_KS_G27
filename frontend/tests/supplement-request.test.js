import test from 'node:test';
import assert from 'node:assert/strict';
import { supplementGroups, composeSupplementNote, parseSupplementFeedback } from '../src/services/supplement-request.js';

test('Checklist shows submitted values, custom quiet hours and updated document labels without inventing missing values', () => {
  const groups = supplementGroups({
    summary: { name: 'Nhà trọ đã nộp' },
    submission: { amenities: ['wifi'], selectedRules: ['quietHours:22:30'], contactPhone: '0912345678' },
    photos: [],
    documents: [{ type: 'ID_CARD', fileName: 'cccd.pdf' }],
  });
  assert.equal(groups.length, 5);
  assert.equal(groups[0].items[0][2], 'Nhà trọ đã nộp');
  assert.equal(groups[1].items[3][2], null);
  assert.match(groups[2].items[0][2], /Wifi/);
  assert.match(groups[2].items[1][2], /Giữ trật tự sau 22h30/);
  assert.equal(groups[4].items[0][1], 'Giấy phép kinh doanh');
  assert.equal(groups[4].items[1][1], 'Căn cước công dân (CCCD / CMND) chủ trọ');
  assert.equal(groups[4].items[1][2], 'cccd.pdf');
  assert.equal(groups[4].items[2][1], 'Chứng nhận an toàn PCCC');
  const keys = groups.flatMap(group => group.items.map(([key]) => key));
  assert.equal(new Set(keys).size, keys.length);
});

test('Only selected checklist items and trimmed notes reach the owner', () => {
  const groups = supplementGroups({});
  const note = composeSupplementNote(groups, ['coordinates', 'ID_CARD'], '  Chụp rõ hai mặt.  ', { ID_CARD: '  Mặt sau bị lóa sáng  ' });
  assert.match(note, /- Vị trí ghim trên bản đồ \(Tọa độ GPS\)/);
  assert.match(note, /- Căn cước công dân \(CCCD \/ CMND\) chủ trọ: Mặt sau bị lóa sáng/);
  assert.match(note, /Ghi chú của Staff: Chụp rõ hai mặt\.$/);
  assert.ok(!note.includes('Tên nhà trọ'));
  assert.ok(!note.includes('undefined'));
  assert.equal(composeSupplementNote(groups, [], ''), '');
  assert.ok(composeSupplementNote(groups, groups.flatMap(g => g.items.map(([key]) => key)), 'x'.repeat(1000)).length <= 2000);
});

test('parseSupplementFeedback maps per-field notes and existing checklist bullets to inline field notes', () => {
  const groups = supplementGroups({});
  const legacyChecklist = composeSupplementNote(groups, ['name', 'description', 'commune', 'parking', 'common', 'ID_CARD'], '');
  const parsedLegacy = parseSupplementFeedback({ reasonNote: legacyChecklist, requestedFields: ['name', 'description', 'commune', 'parking', 'common', 'ID_CARD'] });
  assert.equal(parsedLegacy.hasInlineNotes, true);
  assert.equal(parsedLegacy.generalNote, '');
  assert.ok(parsedLegacy.notesByKey.name);
  assert.ok(parsedLegacy.notesByKey.description);
  assert.ok(parsedLegacy.notesByKey.ID_CARD);
  assert.equal(parsedLegacy.photoItems.length, 2);

  const parsedCustom = parseSupplementFeedback({
    reasonNote: composeSupplementNote(groups, ['OWNERSHIP', 'FIRE_SAFETY'], 'Vui lòng gửi lại trước thứ 6.', { OWNERSHIP: 'Thiếu trang 2 giấy phép' }),
    requestedFields: ['OWNERSHIP', 'FIRE_SAFETY'],
    fieldNotes: { OWNERSHIP: 'Thiếu trang 2 giấy phép', FIRE_SAFETY: 'Bản scan bị mờ mộc đỏ' },
  });
  assert.equal(parsedCustom.notesByKey.OWNERSHIP, 'Thiếu trang 2 giấy phép');
  assert.equal(parsedCustom.notesByKey.FIRE_SAFETY, 'Bản scan bị mờ mộc đỏ');
  assert.equal(parsedCustom.generalNote, 'Vui lòng gửi lại trước thứ 6.');

  const parsedOldLabels = parseSupplementFeedback({
    reasonNote: 'Yêu cầu bổ sung thông tin / hồ sơ:\n\nHồ sơ xác minh & Giấy tờ pháp lý:\n- Giấy tờ quyền sở hữu hoặc hợp đồng quản lý: Chụp rõ trang đầu\n- Biên bản kiểm tra hoặc Cam kết an toàn PCCC',
  });
  assert.equal(parsedOldLabels.notesByKey.OWNERSHIP, 'Chụp rõ trang đầu');
  assert.ok(parsedOldLabels.notesByKey.FIRE_SAFETY);
});
