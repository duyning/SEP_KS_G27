export const PROPERTY_PAGE_SIZE=6;
export const propertyRecordKey=record=>record.propertyId!=null?`property-${record.propertyId}`:`registration-${record.registrationId}`;
const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLocaleLowerCase('vi').trim();
export function filterPropertyRecords(records,{search='',status='ALL',sort='NEWEST'}={}){
 const query=normalize(search);
 return records.filter(record=>(status==='ALL'||record.displayStatus===status)&&(!query||[record.name,record.address,record.managerName,record.contactPhone,record.contactInfo].some(value=>normalize(value).includes(query))))
  .sort((a,b)=>sort==='NAME'?String(a.name).localeCompare(String(b.name),'vi'):sort==='ROOMS'?(b.totalRooms??-1)-(a.totalRooms??-1):(Date.parse(b.createdAt)||0)-(Date.parse(a.createdAt)||0)||propertyRecordKey(a).localeCompare(propertyRecordKey(b)));
}
export function propertyPage(records,page=1){
 const pages=Math.max(1,Math.ceil(records.length/PROPERTY_PAGE_SIZE));
 const selected=Math.min(pages,Math.max(1,Number.isSafeInteger(Number(page))?Number(page):1));
 return {page:selected,pages,items:records.slice((selected-1)*PROPERTY_PAGE_SIZE,selected*PROPERTY_PAGE_SIZE)};
}
