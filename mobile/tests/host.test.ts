/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const ts=createRequire(import.meta.url)('typescript');
function compile(file:string,bindings:Record<string,unknown>){const module={exports:{}};runInNewContext(ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,AbortController,URLSearchParams,setTimeout,clearTimeout,...bindings});return module.exports;}
const models=compile('../src/services/host.ts',{require:()=>({})}) as typeof import('../src/services/host');
const edits=compile('../src/services/host-edit.ts',{require:()=>({})}) as typeof import('../src/services/host-edit');
const property=compile('../src/services/host-property.ts',{require:()=>({})}) as typeof import('../src/services/host-property');
const roomTypesHelper=compile('../src/services/host-room-types.ts',{require:(name:string)=>name==='./host'?models:{}}) as typeof import('../src/services/host-room-types');
const roomsHelper=compile('../src/services/host-rooms.ts',{require:(name:string)=>name==='./host'?models:{}}) as typeof import('../src/services/host-rooms');
const data={roomTypes:{roomTypes:[]},dashboard:{properties:[],totalRoomCount:0,availableRoomCount:0,pendingViewingCount:0,pendingRegistrationCount:0,roomTypeCount:0},properties:{records:[]},rooms:{rooms:[]},viewings:{viewings:[]},inbox:{items:[],hasNext:false,unreadCount:0}};
function fixture(enabled=true,getToken=async():Promise<string|null>=>'test-token') {const calls:string[]=[];let errorPath='',errorStatus=500,unauthorized=0;const api={...models,hostRequest:async(path:string)=>{calls.push(path);if(path===errorPath)throw new models.HostError('Fixture API failure',errorStatus);const key=(Object.keys(models.hostPaths) as (keyof typeof models.hostPaths)[]).find(key=>models.hostPaths[key]===path);return key?data[key]:null;}};const context=compile('../src/context/host-context.tsx',{require:(name:string)=>name==='react'?{createContext:()=>null}:name==='@/services/host'?api:name==='@/services/auth'?{tokenStore:{get:getToken}}:{}}) as typeof import('../src/context/host-context');return {store:new context.HostStore(enabled,()=>{unauthorized++;}),calls,fail:(path:string,status=500)=>{errorPath=path;errorStatus=status;},unauthorized:()=>unauthorized};}
test('guests and tenant roles do not dispatch host API reads or mutations',async()=>{const f=fixture(false);await f.store.refresh();await assert.rejects(f.store.mutate('/host/rooms/1',{}));assert.equal(f.calls.length,0);});
test('refresh reads complete owner resources and deduplicates simultaneous calls',async()=>{const f=fixture();await Promise.all([f.store.refresh(),f.store.refresh()]);assert.equal(f.calls.length,6);assert.equal(f.store.getSnapshot().data.dashboard?.totalRoomCount,0);assert.equal(f.store.getSnapshot().loading,false);});
test('one failed section does not erase successful sections or cached data',async()=>{const f=fixture();await f.store.refresh();f.fail('/host/viewings');await f.store.refresh();assert.ok(f.store.getSnapshot().errors.viewings);assert.ok(f.store.getSnapshot().data.rooms);assert.ok(f.store.getSnapshot().data.viewings);});
test('logout invalidates token acquisition and clears all private data',async()=>{let resolve!:(value:string)=>void;const token=new Promise<string>(yes=>{resolve=yes;});const f=fixture(true,()=>token);const running=f.store.refresh();f.store.stop();resolve('new-account-token');await running;assert.equal(f.calls.length,0);assert.deepEqual(Object.keys(f.store.getSnapshot().data),[]);assert.equal(f.store.getSnapshot().imageToken,null);});
test('mutations use shared pending guard and refresh authoritative resources',async()=>{const f=fixture();const first=f.store.mutate('/host/viewings/1/decision',{status:'APPROVED'});await assert.rejects(f.store.mutate('/host/viewings/1/decision',{}));await first;assert.equal(f.calls.filter(x=>x.includes('decision')).length,1);assert.equal(f.calls.length,7);assert.equal(f.store.getSnapshot().busy,false);});
test('mutation errors are visible and pending lock is released',async()=>{const f=fixture();f.fail('/host/rooms/1');await assert.rejects(f.store.mutate('/host/rooms/1',{},'PUT'));assert.equal(f.store.getSnapshot().busy,false);assert.ok(f.store.getSnapshot().mutationError);});
test('unknown room statuses are not counted as occupied',()=>{const rooms=[{status:'VACANT'},{status:'OCCUPIED'},{status:'MAINTENANCE'}] as import('../src/services/host').HostRoom[];const counts=models.roomCounts(rooms);assert.equal(counts.total,3);assert.equal(counts.occupied,1);assert.equal(counts.vacant,1);assert.equal(counts.other,1);});
test('invalid resource envelopes fail instead of reporting zero counts',()=>{assert.throws(()=>models.validateHostResource('dashboard',{} as never));assert.throws(()=>models.validateHostResource('rooms',{rooms:null} as never));});

test('authorization loss clears all private resource caches and revalidates auth',async()=>{const f=fixture();await f.store.refresh();f.fail('/host/rooms',401);await f.store.refresh();assert.equal(f.unauthorized(),1);assert.deepEqual(Object.keys(f.store.getSnapshot().data),[]);assert.equal(f.store.getSnapshot().imageToken,null);assert.equal(f.store.getSnapshot().loading,false);});

test('missing price is not displayed as zero and custom price precision is preserved',()=>{assert.equal(models.hostPrice(null),'Chưa có giá');assert.ok(models.hostPrice(2356789).includes('2.356.789'));});


test('vacancy overview stays unknown until a complete source exists',()=>{assert.equal(models.vacancyOverview(),null);});
test('vacancy overview uses server totals and preserves real zero',()=>{assert.equal(models.vacancyOverview({...data.dashboard,totalRoomCount:14,availableRoomCount:3})?.vacant,3);assert.equal(models.vacancyOverview({...data.dashboard,totalRoomCount:0,availableRoomCount:0})?.total,0);});
test('complete rooms fallback counts actual vacant status without claiming the rest occupied',()=>{const result=models.vacancyOverview(undefined,[{status:'VACANT'},{status:'MAINTENANCE'}] as import('../src/services/host').HostRoom[]);assert.equal(result?.total,2);assert.equal(result?.vacant,1);});
test('invalid aggregate counts never render negative or impossible totals',()=>{assert.equal(models.vacancyOverview({...data.dashboard,totalRoomCount:2,availableRoomCount:3}),null);assert.equal(models.vacancyOverview({...data.dashboard,totalRoomCount:NaN,availableRoomCount:0}),null);});

test('room validation rejects foreign types, unsupported status and invalid room codes',()=>{const draft={roomTypeId:'12',roomNumber:'A/101',floor:'',status:'MAINTENANCE',customPrice:'1.5'};const errors=edits.validateRoomDraft(draft,[11]);assert.ok(errors.roomTypeId);assert.ok(errors.roomNumber);assert.ok(errors.floor);assert.ok(errors.status);assert.ok(errors.customPrice);assert.equal(Object.keys(edits.validateRoomDraft({roomTypeId:'11',roomNumber:'A101',floor:'Tầng 1',status:'VACANT',customPrice:''},[11])).length,0);});
test('room type validation follows DTO precision and ranges',()=>{assert.equal(Object.keys(edits.validateTypeDraft({roomType:'Phòng đôi',areaSqm:'25.25',capacity:'2',price:'2500000'})).length,0);const errors=edits.validateTypeDraft({roomType:'AB',areaSqm:'25.001',capacity:'21',price:'1.5'});assert.equal(Object.keys(errors).length,4);});
test('editing basic type fields retains fees, assets and amenities without changing deposit',()=>{const original={roomTypeId:11,propertyId:7,roomType:'Studio',areaSqm:25,capacity:2,price:2500000,totalRooms:2,vacantRooms:1,deposit:5000000,electricityPrice:3500,waterPrice:10000,internetPrice:50000,servicePrice:75000,description:'Existing description',imageUrl:'https://example.test/photo.jpg',amenities:['wifi'],images:[{imageId:9,fileName:'photo.jpg'}]};const body=edits.typePayload(7,{roomType:'Studio mới',areaSqm:'30',capacity:'3',price:'3000000'},original);assert.equal(body.deposit,5000000);assert.equal(body.electricityPrice,3500);assert.equal(body.description,original.description);assert.equal(body.retainedImageIds?.[0],9);assert.equal(body.amenities[0],'wifi');assert.equal(body.price,3000000);});
test('conflict responses refresh owner data and preserve mutation error',async()=>{const f=fixture();f.fail('/host/viewings/1/decision',409);await assert.rejects(f.store.mutate('/host/viewings/1/decision',{status:'APPROVED'}));assert.equal(f.calls.length,7);assert.ok(f.store.getSnapshot().mutationError);assert.ok(f.store.getSnapshot().data.viewings);assert.equal(f.store.getSnapshot().busy,false);});
test('custom multipart transport uses the session token and refreshes the same shared store',async()=>{const f=fixture();let token='';await f.store.mutate('/host/room-types/11',{},'PUT',undefined,async(value,signal)=>{token=value;assert.equal(signal.aborted,false);});assert.equal(token,'test-token');assert.equal(f.calls.length,6);assert.ok(f.store.getSnapshot().data.roomTypes);});

test('property address removes only repeated commune segments without modifying source data',()=>{const value={address:'Số 12, Tân Xã, Xã Tân Xã, Hà Nội',addressDetail:'Số 12',commune:'Tân Xã'};assert.equal(property.propertyAddress(value),'Số 12, Tân Xã, Hà Nội');assert.equal(value.address,'Số 12, Tân Xã, Xã Tân Xã, Hà Nội');assert.equal(property.propertyAddress({address:'Thôn 2',commune:'Bình Yên'}),'Thôn 2, Bình Yên');assert.equal(property.propertyAddress({address:'Đường Tân Xã 2, Tân Xã',commune:'Tân Xã'}),'Đường Tân Xã 2');});
test('directions require both real numeric coordinates with valid ranges',()=>{assert.equal(property.propertyCoordinates('',null),null);assert.equal(property.propertyCoordinates('NaN','105.5'),null);assert.equal(property.propertyCoordinates('91','105.5'),null);assert.equal(property.propertyCoordinates('21','181'),null);assert.equal(property.propertyCoordinates('https://example.test','105'),null);assert.equal(property.propertyCoordinates('21.0188','105.5215')?.[1],105.5215);assert.equal(property.propertyCoordinates('0','0')?.[0],0);});
test('public visibility never establishes verification or approval by itself',()=>{const visible={displayStatus:'VISIBLE',verified:false} as import('../src/services/host').HostProperty;assert.equal(property.baseReview(visible),'Chưa có kết quả xét duyệt riêng');assert.equal(property.baseReview({...visible,verified:true}),'Đã phê duyệt');assert.equal(property.documentStatus('REJECTED'),'Đã từ chối');assert.equal(property.documentStatus(undefined),'Đã tiếp nhận · Chưa có kết quả kiểm tra');});
test('detail counts distinguish unknown or malformed data from actual zero',()=>{for(const value of [undefined,null,-1,NaN,1.5,'3'])assert.equal(property.propertyCount(value),'—');assert.equal(property.propertyCount(0),'0');assert.equal(property.propertyCount(14),'14');});
test('pending change proposals remain pending rather than offering direct public edits',()=>{const value={registrationId:70,displayStatus:'VISIBLE',changeRequest:{registrationId:71,status:'PENDING'}} as import('../src/services/host').HostProperty;assert.equal(property.propertyChangeState(value),'Đề nghị thay đổi đang chờ xét duyệt.');assert.ok(property.propertyChangeState({...value,changeRequest:null}).includes('cổng quản lý web'));assert.equal(property.propertyRule('quietHours:22:30'),'Giữ trật tự sau 22:30');assert.equal(property.propertyRule('customRule'),'customRule');});

test('room type inventory separates maintenance rooms instead of computing occupied as total minus vacant',()=>{
  const type={roomTypeId:10,propertyId:1,roomType:'Studio',price:3000000,areaSqm:25,capacity:2,totalRooms:5,vacantRooms:2} as import('../src/services/host').HostRoomType;
  const rooms=[
    {roomId:1,propertyId:1,roomTypeId:10,status:'VACANT'},
    {roomId:2,propertyId:1,roomTypeId:10,status:'VACANT'},
    {roomId:3,propertyId:1,roomTypeId:10,status:'OCCUPIED'},
    {roomId:4,propertyId:1,roomTypeId:10,status:'OCCUPIED'},
    {roomId:5,propertyId:1,roomTypeId:10,status:'MAINTENANCE'},
  ] as import('../src/services/host').HostRoom[];
  const inv=roomTypesHelper.roomTypeInventory(type,rooms);
  assert.equal(inv.total,5);assert.equal(inv.vacant,2);assert.equal(inv.occupied,2);assert.equal(inv.other,1);
  const withoutRooms=roomTypesHelper.roomTypeInventory(type,undefined);
  assert.equal(withoutRooms.total,5);assert.equal(withoutRooms.vacant,2);assert.equal(withoutRooms.occupied,null);
});

test('property room types overview keeps unknown counts null and ignores filtered subsets',()=>{
  const emptyOverview=roomTypesHelper.propertyRoomTypesOverview(undefined,undefined);
  assert.equal(emptyOverview.roomTypeCount,null);assert.equal(emptyOverview.totalRooms,null);assert.equal(emptyOverview.vacantRooms,null);assert.equal(emptyOverview.occupiedRooms,null);
  const types=[{roomTypeId:1,propertyId:1,totalRooms:3,vacantRooms:1},{roomTypeId:2,propertyId:1,totalRooms:0,vacantRooms:0}] as import('../src/services/host').HostRoomType[];
  const rooms=[{roomTypeId:1,propertyId:1,status:'VACANT'},{roomTypeId:1,propertyId:1,status:'OCCUPIED'},{roomTypeId:1,propertyId:1,status:'MAINTENANCE'}] as import('../src/services/host').HostRoom[];
  const fullOverview=roomTypesHelper.propertyRoomTypesOverview(types,rooms);
  assert.equal(fullOverview.roomTypeCount,2);assert.equal(fullOverview.totalRooms,3);assert.equal(fullOverview.vacantRooms,1);assert.equal(fullOverview.occupiedRooms,1);
});

test('room type filtering supports accent-insensitive Vietnamese search, unconfirmed filter and price sorting',()=>{
  const types=[
    {roomTypeId:1,propertyId:1,roomType:'Phòng khép kín ban công',price:3500000,totalRooms:3,vacantRooms:1,availabilityConfirmationStatus:'CURRENT',availabilityConfirmedAt:'2026-11-20T05:00:00Z',createdAt:'2026-11-10T00:00:00Z'},
    {roomTypeId:2,propertyId:1,roomType:'Phòng đôi sinh viên',price:2200000,totalRooms:2,vacantRooms:2,availabilityConfirmationStatus:'UNCONFIRMED',availabilityConfirmedAt:null,createdAt:'2026-11-15T00:00:00Z'},
    {roomTypeId:3,propertyId:1,roomType:'Studio cao cấp',price:null,totalRooms:0,vacantRooms:0,availabilityConfirmationStatus:'UNCONFIRMED',availabilityConfirmedAt:null,createdAt:'2026-11-18T00:00:00Z'},
  ] as import('../src/services/host').HostRoomType[];
  assert.equal(roomTypesHelper.filterAndSortHostRoomTypes(types,undefined,{search:'khep kin'}).map(t=>t.roomTypeId).join(','),'1');
  assert.equal(roomTypesHelper.filterAndSortHostRoomTypes(types,undefined,{filter:'UNCONFIRMED'}).map(t=>t.roomTypeId).join(','),'2');
  assert.equal(roomTypesHelper.filterAndSortHostRoomTypes(types,undefined,{filter:'EMPTY'}).map(t=>t.roomTypeId).join(','),'3');
  assert.equal(roomTypesHelper.filterAndSortHostRoomTypes(types,undefined,{sort:'PRICE_ASC'}).map(t=>t.roomTypeId).join(','),'2,1,3');
  assert.equal(roomTypesHelper.filterAndSortHostRoomTypes(types,undefined,{sort:'PRICE_DESC'}).map(t=>t.roomTypeId).join(','),'1,2,3');
  assert.equal(roomTypesHelper.filterAndSortHostRoomTypes(types,undefined,{sort:'NEWEST'}).map(t=>t.roomTypeId).join(','),'3,2,1');
});

test('availability confirmation validator accepts valid CURRENT payload and rejects malformed or stale responses',()=>{
  const valid={roomTypeId:12,propertyId:1,roomType:'Studio',price:3000000,areaSqm:24,capacity:2,totalRooms:4,vacantRooms:1,availabilityConfirmationStatus:'CURRENT',availabilityConfirmedAt:'2026-11-20T10:00:00Z',availabilityStale:false};
  assert.equal(roomTypesHelper.validateAvailabilityConfirmationResponse(12,valid).roomTypeId,12);
  assert.throws(()=>roomTypesHelper.validateAvailabilityConfirmationResponse(12,{...valid,availabilityConfirmationStatus:'STALE'}));
  assert.throws(()=>roomTypesHelper.validateAvailabilityConfirmationResponse(12,{...valid,availabilityStale:true}));
  assert.throws(()=>roomTypesHelper.validateAvailabilityConfirmationResponse(12,{...valid,totalRooms:0,vacantRooms:0}));
  assert.throws(()=>roomTypesHelper.validateAvailabilityConfirmationResponse(99,valid));
  assert.equal(roomTypesHelper.canConfirmRoomTypeAvailability({total:0,vacant:0,occupied:0,other:0}),false);
  assert.equal(roomTypesHelper.canConfirmRoomTypeAvailability({total:2,vacant:1,occupied:1,other:0}),true);
});

test('room type detail formatters preserve backend fee units, never turn null into 0 and distinguish custom room prices',()=>{
  assert.equal(roomTypesHelper.formatMoneyVnd(null),'Chưa cấu hình');
  assert.equal(roomTypesHelper.formatMoneyVnd(0),'0 đ');
  assert.ok(roomTypesHelper.formatFeeWithUnit(3500,'kWh').includes('3.500 đ/kWh'));
  assert.ok(roomTypesHelper.formatFeeWithUnit(20000,'m³').includes('20.000 đ/m³'));
  assert.ok(roomTypesHelper.formatFeeWithUnit(100000,'phòng').includes('100.000 đ/phòng'));
  assert.ok(roomTypesHelper.formatFeeWithUnit(150000,'người').includes('150.000 đ/người'));
  assert.equal(roomTypesHelper.formatFeeWithUnit(undefined,'kWh'),'Chưa cấu hình');
  assert.equal(roomTypesHelper.formatFloorLabel('2'),'Tầng 2');
  assert.equal(roomTypesHelper.formatFloorLabel('Tầng 3'),'Tầng 3');
  assert.equal(roomTypesHelper.roomAmenityLabel('airConditioner'),'Điều hòa Inverter');
  assert.equal(roomTypesHelper.roomAmenityLabel('customKey'),'customKey');
  const custom=roomTypesHelper.resolveRoomEffectivePrice({price:3000000,customPrice:3200000},3000000);
  assert.equal(custom.amount,3200000);assert.equal(custom.isCustom,true);
  const inherited=roomTypesHelper.resolveRoomEffectivePrice({price:3000000,customPrice:null},3000000);
  assert.equal(inherited.amount,3000000);assert.equal(inherited.isCustom,false);
});

test('floor grouping preserves distinct stored floor labels like Tang 1 and Tang 01 without merging',()=>{
  const rooms=[
    {roomId:1,propertyId:1,roomTypeId:10,roomType:'Studio',roomNumber:'101',floor:'Tầng 1',status:'VACANT',publicVisible:true},
    {roomId:2,propertyId:1,roomTypeId:10,roomType:'Studio',roomNumber:'0102',floor:'Tầng 01',status:'OCCUPIED',publicVisible:false},
    {roomId:3,propertyId:1,roomTypeId:11,roomType:'Đôi',roomNumber:'201',floor:'2',status:'MAINTENANCE',publicVisible:false},
  ] as import('../src/services/host').HostRoom[];
  const groups=roomsHelper.groupRoomsByFloor(rooms);
  assert.equal(groups.length,3);
  assert.equal(groups[0].floor,'Tầng 1');
  assert.equal(groups[1].floor,'Tầng 01');
  assert.equal(groups[2].floor,'Tầng 2');
  const ov=roomsHelper.propertyRoomsOverview(rooms);
  assert.equal(ov.totalRooms,3);assert.equal(ov.vacantRooms,1);assert.equal(ov.occupiedRooms,1);
});

test('room filtering supports search by roomNumber or roomType plus visibility and floor filters',()=>{
  const rooms=[
    {roomId:1,propertyId:1,roomTypeId:10,roomType:'Phòng khép kín',roomNumber:'P101',floor:'Tầng 1',status:'VACANT',publicVisible:true},
    {roomId:2,propertyId:1,roomTypeId:11,roomType:'Studio gác xép',roomNumber:'P201',floor:'Tầng 2',status:'OCCUPIED',publicVisible:false},
  ] as import('../src/services/host').HostRoom[];
  assert.equal(roomsHelper.filterHostRooms(rooms,{search:'gac xep'}).map(r=>r.roomId).join(','),'2');
  assert.equal(roomsHelper.filterHostRooms(rooms,{search:'p101'}).map(r=>r.roomId).join(','),'1');
  assert.equal(roomsHelper.filterHostRooms(rooms,{visibility:'PUBLIC'}).map(r=>r.roomId).join(','),'1');
  assert.equal(roomsHelper.filterHostRooms(rooms,{visibility:'PRIVATE'}).map(r=>r.roomId).join(','),'2');
  assert.equal(roomsHelper.filterHostRooms(rooms,{typeId:'11'}).map(r=>r.roomId).join(','),'2');
});

test('bulk status lease date validation and response validators enforce exact backend contracts',()=>{
  assert.equal(Object.keys(roomsHelper.validateBulkLeaseDates('VACANT',null,null)).length,0);
  assert.ok(roomsHelper.validateBulkLeaseDates('OCCUPIED','','2026-12-01').leaseStartDate);
  assert.ok(roomsHelper.validateBulkLeaseDates('OCCUPIED','2026-12-10','2026-12-01').leaseEndDate);
  assert.equal(Object.keys(roomsHelper.validateBulkLeaseDates('OCCUPIED','2026-12-01','2027-06-01')).length,0);
  const statusPayload={propertyId:1,roomIds:[1,2],status:'VACANT' as const,leaseStartDate:null,leaseEndDate:null};
  assert.equal(roomsHelper.validateBulkStatusResponse(statusPayload,[{roomId:1,propertyId:1,status:'VACANT'},{roomId:2,propertyId:1,status:'VACANT'}]).length,2);
  assert.throws(()=>roomsHelper.validateBulkStatusResponse(statusPayload,[{roomId:1,propertyId:1,status:'VACANT'}]));
  const pubPayload={propertyId:1,roomIds:[1]};
  assert.equal(roomsHelper.validatePublicationResponse(pubPayload,[{roomId:1,propertyId:1,publicVisible:true},{roomId:2,propertyId:1,publicVisible:false}]).length,2);
  assert.throws(()=>roomsHelper.validatePublicationResponse(pubPayload,[{roomId:1,propertyId:1,publicVisible:false}]));
});

test('room detail contract selection, date-only formatting, deposit resolution and delete guards follow backend rules',()=>{
  const contracts=[
    {id:20,status:'CLOSED' as const,startDate:'2026-06-01',endDate:'2026-11-30',details:{terms:'HĐ cũ',tenantName:'An'}},
    {id:15,status:'ACTIVE' as const,startDate:'2026-01-01',endDate:'2026-12-31',details:{terms:'HĐ đang hiệu lực',tenantName:'Bình'}},
  ];
  assert.equal(roomsHelper.selectDisplayContract(contracts)?.id,15);
  assert.equal(roomsHelper.selectDisplayContract([contracts[0]])?.id,20);
  assert.equal(roomsHelper.selectDisplayContract([]),null);
  assert.equal(roomsHelper.formatIsoDateVi('2026-11-20'),'20/11/2026');
  assert.equal(roomsHelper.formatIsoDateVi(null),'Chưa cập nhật');
  // Deposit never defaults to monthly rent
  assert.equal(roomsHelper.resolveRoomDeposit({deposit:null},{deposit:null}),null);
  assert.equal(roomsHelper.resolveRoomDeposit({deposit:null},{deposit:3500000}),3500000);
  assert.equal(roomsHelper.resolveRoomDeposit({deposit:4000000},{deposit:3500000}),4000000);
  // Price mechanism
  assert.equal(roomsHelper.roomPriceMechanism({price:3200000,customPrice:3200000},{price:3000000}).isCustom,true);
  assert.equal(roomsHelper.roomPriceMechanism({price:3000000,customPrice:null},{price:3000000}).isCustom,false);
  // Delete room guard
  assert.equal(roomsHelper.canDeleteRoom({status:'OCCUPIED'},true).allowed,false);
  assert.ok(roomsHelper.canDeleteRoom({status:'OCCUPIED'},true).reason?.includes('Còn trống'));
  assert.equal(roomsHelper.canDeleteRoom({status:'VACANT'},true).allowed,true);
  assert.equal(roomsHelper.canDeleteRoom({status:'VACANT'},false).allowed,false);
  // Room confirmation freshness
  const now=Date.parse('2026-11-20T12:00:00+07:00');
  assert.equal(roomsHelper.roomConfirmationPresentation({confirmedAt:'2026-11-19T10:00:00',confirmationStatus:null},now).state,'CURRENT');
  assert.equal(roomsHelper.roomConfirmationPresentation({confirmedAt:'2026-11-01T10:00:00',confirmationStatus:null},now).state,'STALE');
  assert.equal(roomsHelper.roomConfirmationPresentation({confirmedAt:null,confirmationStatus:null},now).state,'UNCONFIRMED');
});
