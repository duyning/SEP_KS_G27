export const serviceCategoryAliases={moving:'Chuyển phòng trọ',laundry:'Giặt là sinh viên',cleaning:'Dọn dẹp & Vệ sinh',repair:'Sửa chữa điện nước, khóa cổng'};
export const serviceAreas=[['all','Toàn khu Hòa Lạc'],['tan-xa','Tân Xã'],['thach-hoa','Thạch Hòa'],['binh-yen','Bình Yên'],['fpt','Khu ĐH FPT'],['cnc','Khu Công nghệ cao']];
const normalized=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase();
export function serviceCategoryKind(name){const value=normalized(name);return /chuyen|van chuyen/.test(value)?'moving':/giat|say/.test(value)?'laundry':/don dep|ve sinh/.test(value)?'cleaning':/sua|dien|nuoc|khoa/.test(value)?'repair':'other'}
export function resolveServiceCategory(value,categories){if(!value||value==='all')return 'all';const alias=serviceCategoryAliases[value];return String(categories.find(category=>alias?category.name===alias||serviceCategoryKind(category.name)===value:String(category.categoryId)===String(value))?.categoryId??value);}
export function discoverServices(rows,{category='all',q='',area='all',sort='recommended'}={}){
 const text=normalized(q.trim()),areaTerms={'tan-xa':['tan xa'],'thach-hoa':['thach hoa'],'binh-yen':['binh yen'],fpt:['fpt'],cnc:['cong nghe cao','khu cnc']};
 const filtered=rows.filter(row=>(category==='all'||String(row.categoryId)===String(category))&&(!text||normalized([row.serviceName,row.providerName,row.description,row.serviceArea].filter(Boolean).join(' ')).includes(text))&&(area==='all'||(areaTerms[area]||[]).some(term=>normalized(row.serviceArea).includes(term))));
 return filtered.sort((a,b)=>{
  if(sort==='price-asc'||sort==='price-desc'){
   const left=a.pricingType==='NEGOTIABLE'||!Number.isFinite(a.price)?null:a.price,right=b.pricingType==='NEGOTIABLE'||!Number.isFinite(b.price)?null:b.price;
   if(left==null&&right!=null)return 1;if(left!=null&&right==null)return -1;if(left!=null&&right!=null&&left!==right)return sort==='price-asc'?left-right:right-left;
  }
  if(sort==='name')return String(a.serviceName).localeCompare(String(b.serviceName),'vi');
  return b.serviceId-a.serviceId;
 });
}
export function serviceInventory(rows,categories){return {services:rows.length,providers:new Set(rows.map(row=>row.providerId)).size,categories:categories.length,byCategory:Object.fromEntries(categories.map(category=>[category.categoryId,rows.filter(row=>row.categoryId===category.categoryId).length]))};}
