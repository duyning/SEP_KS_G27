import {emptyRoomType,ROOM_AMENITIES,validateRoomType} from './room-types.js';
import {validateRoomDrafts,MAX_BATCH_ROOMS} from './room-batch.js';

export const TYPE_SHEET='Loại phòng';
export const ROOM_SHEET='Danh sách phòng';
export const EXCEL_FIELDS=[
 ['roomType','Tên loại phòng','Bắt buộc. 3–100 ký tự.'],
 ['areaSqm','Diện tích (m²)','Bắt buộc. Số từ 1 đến 10000, tối đa 2 chữ số thập phân.'],
 ['capacity','Sức chứa (người)','Bắt buộc. Số nguyên từ 1 đến 20.'],
 ['price','Giá thuê (đ/tháng)','Bắt buộc. Số nguyên dương, tối đa 999999999. Không ghi đơn vị vào ô.'],
 ['deposit','Tiền cọc (đ)','Tùy chọn. Số nguyên không âm. Để trống: bằng một tháng tiền thuê.'],
 ['description','Mô tả','Tùy chọn. Tối đa 2000 ký tự.'],
 ['electricityPrice','Tiền điện (đ/kWh)','Tùy chọn. Số nguyên không âm, tối đa 999999999.'],
 ['waterPrice','Tiền nước (đ/m³)','Tùy chọn. Số nguyên không âm, tối đa 999999999.'],
 ['internetPrice','Internet (đ/phòng)','Tùy chọn. Số nguyên không âm, tối đa 999999999.'],
 ['servicePrice','Dịch vụ chung (đ/người)','Tùy chọn. Số nguyên không âm, tối đa 999999999.'],
 ...ROOM_AMENITIES.map(([key,label])=>[key,label,'Tiện nghi: chọn Có hoặc Không. Để trống: không chọn.']),
];
export const ROOM_HEADERS=['Số phòng','Tầng / Khu vực'];
const excel=async()=>{const module=await import('exceljs');return module.default||module;};

// This is application template generation, not exported database data.
export async function buildRoomTypeTemplate(){
 const ExcelJS=await excel();const book=new ExcelJS.Workbook();book.creator='HL_RCS';
 const type=book.addWorksheet(TYPE_SHEET);type.columns=[{width:32},{width:32},{width:84}];
 type.addRow(['Trường thông tin','Giá trị','Hướng dẫn']);
 for(const [index,[key,label,hint]] of EXCEL_FIELDS.entries()){
  const row=type.addRow([label,null,hint]);row.height=34;row.getCell(2).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF0FDFA'}};
  const cell=row.getCell(2);
  if(index<10){
   if(key==='roomType'||key==='description')cell.numFmt='@';
   else {cell.numFmt=key==='areaSqm'?'0.##':'#,##0';cell.dataValidation={type:key==='areaSqm'?'decimal':'whole',operator:'between',allowBlank:true,formulae:[key==='areaSqm'||key==='capacity'||key==='price'?1:0,key==='areaSqm'?10000:key==='capacity'?20:999999999],showErrorMessage:true,errorTitle:'Dữ liệu chưa hợp lệ',error:'Nhập số trong giới hạn ở cột Hướng dẫn.'};}
  }else cell.dataValidation={type:'list',allowBlank:true,formulae:['"Có,Không"'],showErrorMessage:true,error:'Chọn Có hoặc Không.'};
 }
 const rooms=book.addWorksheet(ROOM_SHEET);rooms.columns=[{width:30},{width:35}];rooms.addRow(ROOM_HEADERS);
 for(let i=2;i<=MAX_BATCH_ROOMS+1;i++){const row=rooms.getRow(i);row.height=24;for(let j=1;j<=2;j++){row.getCell(j).numFmt='@';row.getCell(j).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF0FDFA'}};}}
 const guide=book.addWorksheet('Hướng dẫn');guide.columns=[{width:28},{width:110}];guide.addRows([
  ['Mục','Cách điền'],['Phạm vi','Mỗi file nhập một loại phòng và từ 1 đến 200 phòng liên kết trong nhà trọ hiện tại.'],
  ['Loại phòng','Chỉ điền cột Giá trị trong sheet Loại phòng. Giữ nguyên tên sheet và các nhãn trường.'],
  ['Danh sách phòng','Điền Số phòng và Tầng / Khu vực từ dòng 2. Không trùng số phòng trong file hoặc số phòng đã có trong nhà trọ.'],
  ['Định dạng số','Nhập giá tiền dưới dạng số nguyên, không thêm đ, VND hay dấu phân cách dạng văn bản. Diện tích có thể là số thập phân.'],
  ['Mã phòng','Giữ định dạng văn bản để bảo toàn số 0 đầu mã. Số phòng tối đa 30 ký tự; tầng/khu vực tối đa 50 ký tự.'],
  ['Tiện nghi','Chọn Có hoặc Không cho từng tiện nghi. Ô trống được hiểu là Không.'],
  ['Hình ảnh','Sau khi nhập Excel, chọn ảnh từ máy trong form loại phòng. Không chèn ảnh hoặc đường dẫn ảnh vào file.'],
  ['Xem trước và lưu','Nhập file chỉ đưa dữ liệu vào form xem trước. Kiểm tra hai bước và bấm Tạo loại phòng để lưu vào hệ thống.'],
  ['Trạng thái phòng','Phòng mới được tạo ở trạng thái Trống và kế thừa giá, diện tích, tiện nghi từ loại phòng.'],
  ['Loại file','Chỉ nhận .xlsx, tối đa 5 MB. Nhập giá trị trực tiếp; không sử dụng công thức.'],
 ]);
 for(const sheet of book.worksheets){sheet.views=[{state:'frozen',ySplit:1}];sheet.getRow(1).height=30;sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0F766E'}};sheet.eachRow(row=>{row.alignment={vertical:'middle',wrapText:true};if(sheet===guide&&row.number>1)row.height=42;});}
 return book.xlsx.writeBuffer();
}
export async function downloadRoomTypeTemplate(){
 const buffer=await buildRoomTypeTemplate();const url=URL.createObjectURL(new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
 const anchor=document.createElement('a');anchor.href=url;anchor.download='HL-RCS_Mau-loai-phong-va-danh-sach-phong.xlsx';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function parseRoomTypeWorkbook(book,{existingRoomNumbers=[],existingTypeNames=[]}={}){
 const issues=[];const data=emptyRoomType();data.capacity='';const rooms=[],sourceRows=[];
 const type=book.getWorksheet(TYPE_SHEET),sheet=book.getWorksheet(ROOM_SHEET);
 if(!type||!sheet)throw new Error('File cần có hai sheet Loại phòng và Danh sách phòng. Hãy tải file mẫu của hệ thống.');
 if(type.rowCount>100||type.columnCount>3||sheet.rowCount>MAX_BATCH_ROOMS+1||sheet.columnCount>2)throw new Error('File vượt cấu trúc mẫu hoặc có quá 200 dòng phòng. Xóa các dòng/cột thừa rồi nhập lại.');
 const read=(sheet,row,col)=>{
  const cell=sheet.getCell(row,col),value=cell.value;
  if(value==null)return '';
  if(typeof value==='string'||typeof value==='number')return String(value).trim();
  issues.push(`${sheet.name}!${cell.address}: Chỉ nhập văn bản hoặc số trực tiếp, không dùng công thức, liên kết hoặc ngày tháng.`);return '';
 };
 if(read(type,1,1)!=='Trường thông tin'||read(type,1,2)!=='Giá trị'||ROOM_HEADERS.some((label,i)=>read(sheet,1,i+1)!==label))throw new Error('Tiêu đề file không đúng mẫu. Hãy giữ nguyên dòng tiêu đề và tên các sheet.');
 const fields=new Map(EXCEL_FIELDS.map(([key,label])=>[label,key])),positions=new Map();
 for(let row=2;row<=type.rowCount;row++){
  const label=read(type,row,1),value=read(type,row,2);if(!label&&!value)continue;
  const key=fields.get(label);if(!key){issues.push(`${TYPE_SHEET}!A${row}: Trường thông tin không thuộc mẫu.`);continue;}
  if(positions.has(key)){issues.push(`${TYPE_SHEET}!A${row}: Trùng trường ${label}.`);continue;}positions.set(key,row);
  if(ROOM_AMENITIES.some(([amenity])=>amenity===key)){
   if(value.toLocaleLowerCase('vi')==='có')data.amenities.push(key);
   else if(value&&value.toLocaleLowerCase('vi')!=='không')issues.push(`${TYPE_SHEET}!B${row}: Chọn Có hoặc Không cho ${label}.`);
  }else data[key]=value;
 }
 for(const [key,label] of EXCEL_FIELDS)if(!positions.has(key))issues.push(`${TYPE_SHEET}: Thiếu dòng ${label}.`);
 for(const [key,message] of Object.entries(validateRoomType(data)))issues.push(`${TYPE_SHEET}!B${positions.get(key)||'?'}: ${message}`);
 if(existingTypeNames.some(name=>name.trim().toLocaleLowerCase('vi')===data.roomType.toLocaleLowerCase('vi')))issues.push(`${TYPE_SHEET}: Tên loại phòng đã có trong nhà trọ.`);
 for(let row=2;row<=sheet.rowCount;row++){const roomNumber=read(sheet,row,1),floor=read(sheet,row,2);if(!roomNumber&&!floor)continue;rooms.push({roomNumber:roomNumber.toUpperCase(),floor});sourceRows.push(row);}
 const invalid=validateRoomDrafts(rooms,existingRoomNumbers);if(invalid.list)issues.push(`${ROOM_SHEET}: ${invalid.list}`);
 for(const [index,fields] of Object.entries(invalid.rows))for(const [key,message] of Object.entries(fields))issues.push(`${ROOM_SHEET}!${key==='roomNumber'?'A':'B'}${sourceRows[index]}: ${message}`);
 return {data,rooms,issues};
}
async function normalizeSpreadsheetNamespaces(buffer){
 const {default:JSZip}=await import('jszip');const zip=await JSZip.loadAsync(buffer);
 const entries=Object.values(zip.files);if(entries.length>512)throw new Error('Workbook contains too many parts.');
 let changed=false,expandedBytes=0;
 for(const entry of entries){
  if(entry.dir||!/^xl\/(?:workbook|styles|sharedStrings|worksheets\/[^/]+)\.xml$/.test(entry.name))continue;
  const bytes=await entry.async('uint8array');expandedBytes+=bytes.byteLength;if(expandedBytes>25*1024*1024)throw new Error('Workbook XML is too large.');
  let xml=new TextDecoder().decode(bytes);
  const root=xml.match(/<(?![!?/])[^>]+>/)?.[0]||'';
  const declaration=root.match(/xmlns:([A-Za-z_][\w.-]*)=(['"])http:\/\/schemas\.openxmlformats\.org\/spreadsheetml\/2006\/main\2/);
  if(!declaration)continue;
  const defaultNamespace=root.match(/\sxmlns=(['"])(.*?)\1/);
  if(defaultNamespace&&defaultNamespace[2]!=='http://schemas.openxmlformats.org/spreadsheetml/2006/main')continue;
  // Keep the original prefix binding for qualified attributes. Only element
  // notation changes; cell values, formulas, styles and validation stay intact.
  if(!defaultNamespace)xml=xml.replace(declaration[0],`xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ${declaration[0]}`);
  const prefix=declaration[1].replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  xml=xml.replace(new RegExp(`(<\\/?)${prefix}:`,'g'),'$1');zip.file(entry.name,xml);changed=true;
 }
 if(!changed)throw new Error('No compatible namespace normalization found.');
 return zip.generateAsync({type:'arraybuffer',compression:'DEFLATE'});
}
export async function readRoomTypeExcel(file,options){
 if(!/\.xlsx$/i.test(file.name)||!file.size||file.size>5*1024*1024)throw new Error('Chọn file Excel .xlsx không rỗng, tối đa 5 MB.');
 const ExcelJS=await excel();let book=new ExcelJS.Workbook();const buffer=await file.arrayBuffer();const loadOptions={ignoreNodes:['drawing','picture','extLst']};
 try{await book.xlsx.load(buffer,loadOptions);}catch{
  try{const normalized=await normalizeSpreadsheetNamespaces(buffer);book=new ExcelJS.Workbook();await book.xlsx.load(normalized,loadOptions);}
  catch(cause){throw new Error('Không đọc được file Excel. File có thể bị hỏng hoặc được đặt mật khẩu. Hãy lưu lại dưới dạng .xlsx.',{cause});}
 }
 return parseRoomTypeWorkbook(book,options);
}
