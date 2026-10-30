import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveServiceCategory,discoverServices,serviceInventory,serviceCategoryKind} from '../src/services/service-discovery.js';
const categories=[{categoryId:4,name:'Chuyển phòng trọ'},{categoryId:8,name:'Giặt là sinh viên'},{categoryId:12,name:'Dọn dẹp & Vệ sinh'},{categoryId:15,name:'Sửa chữa điện nước, khóa cổng'}];
const rows=[{serviceId:1,categoryId:4,providerId:9,serviceName:'Chuyển trọ',providerName:'Nguyễn An',description:'Có hỗ trợ đóng gói',serviceArea:'Tân Xã, Thạch Hòa',price:200000,pricingType:'FIXED'},{serviceId:2,categoryId:8,providerId:9,serviceName:'Giặt sấy',serviceArea:'Bình Yên',price:15000,pricingType:'FROM'},{serviceId:3,categoryId:15,providerId:10,serviceName:'Sửa điện',serviceArea:'Khu CNC Hòa Lạc',price:null,pricingType:'NEGOTIABLE'}];
test('legacy category aliases resolve to actual database IDs; unknown IDs never select all services',()=>{
 assert.equal(resolveServiceCategory('moving',categories),'4');assert.equal(resolveServiceCategory('8',categories),'8');assert.equal(resolveServiceCategory('unknown',categories),'unknown');assert.deepEqual(discoverServices(rows,{category:'unknown'}),[]);assert.equal(serviceCategoryKind('Sửa chữa điện nước'),'repair');
});
test('services search combines actual category, coverage and accent-insensitive text',()=>{
 assert.deepEqual(discoverServices(rows,{q:'nguyen',category:'4',area:'tan-xa'}).map(row=>row.serviceId),[1]);assert.deepEqual(discoverServices(rows,{q:'dong goi'}).map(row=>row.serviceId),[1]);assert.deepEqual(discoverServices(rows,{area:'cnc'}).map(row=>row.serviceId),[3]);assert.deepEqual(discoverServices(rows,{area:'fpt'}),[]);
});
test('service counts distinguish providers from services and leave zero-service categories at zero',()=>{
 assert.deepEqual(serviceInventory(rows,categories),{services:3,providers:2,categories:4,byCategory:{4:1,8:1,12:0,15:1}});assert.equal(serviceInventory([],categories).services,0);
});
test('price sorting keeps unknown quotes last, honors explicit zero prices and never changes source order',()=>{
 assert.deepEqual(discoverServices(rows,{sort:'price-asc'}).map(row=>row.serviceId),[2,1,3]);assert.deepEqual(discoverServices(rows,{sort:'price-desc'}).map(row=>row.serviceId),[1,2,3]);assert.deepEqual(rows.map(row=>row.serviceId),[1,2,3]);assert.equal(discoverServices([...rows,{...rows[0],serviceId:4,price:0}],{sort:'price-asc'})[0].price,0);
});
