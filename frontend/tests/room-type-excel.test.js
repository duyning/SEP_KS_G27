import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import {buildRoomTypeTemplate,parseRoomTypeWorkbook,readRoomTypeExcel,EXCEL_FIELDS,TYPE_SHEET,ROOM_SHEET} from '../src/services/room-type-excel.js';
async function workbook(){const book=new ExcelJS.Workbook();await book.xlsx.load(await buildRoomTypeTemplate());return book;}
function fill(book,values={}){
 const data={roomType:'Studio riêng',areaSqm:25.5,capacity:2,price:2400000,wifi:'Có',...values};
 EXCEL_FIELDS.forEach(([key],index)=>{if(data[key]!=null)book.getWorksheet(TYPE_SHEET).getCell(index+2,2).value=data[key];});
 book.getWorksheet(ROOM_SHEET).getCell('A2').value='001';book.getWorksheet(ROOM_SHEET).getCell('B2').value='Tầng 1';return book;
}
test('downloaded template has empty input sheets, guidance and Excel validation',async()=>{
 const book=await workbook();assert.deepEqual(book.worksheets.map(sheet=>sheet.name),[TYPE_SHEET,ROOM_SHEET,'Hướng dẫn']);
 assert.equal(book.getWorksheet(TYPE_SHEET).getCell('B2').value,null);assert.equal(book.getWorksheet(ROOM_SHEET).getCell('A2').value,null);
 assert.equal(book.getWorksheet(ROOM_SHEET).getCell('A2').numFmt,'@');assert.equal(book.getWorksheet(TYPE_SHEET).getCell('B4').dataValidation.type,'whole');
 assert.ok(parseRoomTypeWorkbook(book).issues.length>0);
});
test('filled XLSX roundtrip preserves text room numbers, decimals, null fees and supported amenities',async()=>{
 const book=fill(await workbook());const file=new File([await book.xlsx.writeBuffer()],'import.xlsx');const result=await readRoomTypeExcel(file);
 assert.deepEqual(result.issues,[]);assert.deepEqual(result.rooms,[{roomNumber:'001',floor:'Tầng 1'}]);assert.equal(result.data.areaSqm,'25.5');assert.equal(result.data.deposit,'');assert.deepEqual(result.data.amenities,['wifi']);assert.deepEqual(result.data.photos,[]);
});
test('valid prefixed SpreadsheetML from exported files imports without changing data',async()=>{
 const book=fill(await workbook());const zip=await JSZip.loadAsync(await book.xlsx.writeBuffer());
 for(const name of ['xl/workbook.xml','xl/styles.xml','xl/sharedStrings.xml','xl/worksheets/sheet1.xml','xl/worksheets/sheet2.xml']){
  const part=zip.file(name);if(!part)continue;const xml=await part.async('string');
  zip.file(name,xml.replace('xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"','xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"').replace(/(<\/?)([A-Za-z_][\w.-]*)(?=[\s/>])/g,'$1x:$2'));
 }
 const result=await readRoomTypeExcel(new File([await zip.generateAsync({type:'uint8array'})],'prefixed.xlsx'));
 assert.deepEqual(result.issues,[]);assert.equal(result.data.roomType,'Studio riêng');assert.equal(result.data.price,'2400000');assert.equal(result.data.areaSqm,'25.5');assert.deepEqual(result.data.amenities,['wifi']);assert.deepEqual(result.rooms,[{roomNumber:'001',floor:'Tầng 1'}]);
});
test('errors identify exact Excel cells for invalid values and missing room fields',async()=>{
 const book=fill(await workbook(),{price:-1,capacity:21,wifi:'yes'});book.getWorksheet(ROOM_SHEET).getCell('B2').value=null;
 const result=parseRoomTypeWorkbook(book);assert.ok(result.issues.some(message=>message.includes('B5')));assert.ok(result.issues.some(message=>message.includes('B4')));assert.ok(result.issues.some(message=>message.includes('Danh sách phòng!B2')));assert.ok(result.issues.some(message=>message.includes('Có hoặc Không')));
});
test('Excel cannot import duplicate type names or existing and duplicate room numbers',async()=>{
 const book=fill(await workbook());book.getWorksheet(ROOM_SHEET).getCell('A3').value='001';book.getWorksheet(ROOM_SHEET).getCell('B3').value='Tầng 2';
 const result=parseRoomTypeWorkbook(book,{existingRoomNumbers:['001'],existingTypeNames:['studio RIÊNG']});
 assert.ok(result.issues.some(message=>message.includes('Tên loại phòng đã có')));assert.ok(result.issues.some(message=>message.includes('Danh sách phòng!A3')));
 book.getWorksheet(ROOM_SHEET).getCell('A3').value='002';assert.ok(parseRoomTypeWorkbook(book,{existingRoomNumbers:['001']}).issues.some(message=>message.includes('Mã phòng đã có')));
});
test('formula cached values, hyperlinks and wrong template structure are never accepted as input',async()=>{
 const book=fill(await workbook());book.getWorksheet(TYPE_SHEET).getCell('B5').value={formula:'1+1',result:2};assert.ok(parseRoomTypeWorkbook(book).issues.some(message=>message.includes('không dùng công thức')));
 book.getWorksheet(ROOM_SHEET).getCell('A2').value={text:'001',hyperlink:'https://example.test'};assert.ok(parseRoomTypeWorkbook(book).issues.some(message=>message.includes('Danh sách phòng!A2')));
 book.getWorksheet(ROOM_SHEET).getCell('A1').value='Wrong';assert.throws(()=>parseRoomTypeWorkbook(book),/Tiêu đề/);
});
test('missing sheets, excess rows and duplicate type fields are rejected',async()=>{
 const book=fill(await workbook());book.getWorksheet(TYPE_SHEET).getCell('A25').value='Tên loại phòng';assert.ok(parseRoomTypeWorkbook(book).issues.some(message=>message.includes('Trùng trường')));
 book.getWorksheet(ROOM_SHEET).getCell('A202').value='201';assert.throws(()=>parseRoomTypeWorkbook(book),/quá 200/);
 assert.throws(()=>parseRoomTypeWorkbook(new ExcelJS.Workbook()),/hai sheet/);
});
test('wrong extensions, empty, oversized and corrupt files fail with useful messages',async()=>{
 for(const file of [new File(['a'],'a.csv'),new File([],'a.xlsx'),{name:'a.xlsx',size:5*1024*1024+1}])await assert.rejects(readRoomTypeExcel(file),/tối đa 5 MB/);
 await assert.rejects(readRoomTypeExcel(new File(['not zip'],'a.xlsx')),/Không đọc được file Excel/);
});
