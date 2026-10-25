import test from 'node:test';
import assert from 'node:assert/strict';
import {supplementGroups,composeSupplementNote} from '../src/services/supplement-request.js';

test('Checklist shows submitted values and never invents missing values',()=>{
 const groups=supplementGroups({summary:{name:'Nhà trọ đã nộp'},submission:{amenities:['wifi'],contactPhone:'0912345678'},photos:[],documents:[{type:'ID_CARD',fileName:'cccd.pdf'}]});
 assert.equal(groups.length,5);
 assert.equal(groups[0].items[0][2],'Nhà trọ đã nộp');
 assert.equal(groups[1].items[3][2],null);
 assert.match(groups[2].items[0][2],/Wifi/);
 assert.equal(groups[4].items[1][2],'cccd.pdf');
 const keys=groups.flatMap(group=>group.items.map(([key])=>key));
 assert.equal(new Set(keys).size,keys.length);
});
test('Only selected checklist items and trimmed notes reach the owner',()=>{
 const groups=supplementGroups({});
 const note=composeSupplementNote(groups,['coordinates','ID_CARD'],'  Chụp rõ hai mặt.  ');
 assert.match(note,/Tọa độ GPS/);assert.match(note,/CCCD/);assert.match(note,/Ghi chú của Staff: Chụp rõ hai mặt\.$/);
 assert.ok(!note.includes('Tên nhà trọ'));assert.ok(!note.includes('undefined'));
 assert.equal(composeSupplementNote(groups,[],''),'');
 assert.ok(composeSupplementNote(groups,groups.flatMap(g=>g.items.map(([key])=>key)),'x'.repeat(1000)).length<=2000);
});
