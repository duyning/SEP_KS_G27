import { getApiBase, requestJson } from './accommodations';
export interface HostAttachment {documentId:number;type?:string;fileName?:string;verificationStatus?:string|null}
export interface HostProperty {
 propertyId:number|null;registrationId?:number;name:string;address:string;displayStatus:string;roomTypeCount:number;totalRooms:number|null;vacantRooms:number|null;pendingViewingCount:number;
 verified?:boolean;propertyType?:string|null;addressDetail?:string|null;commune?:string|null;nearby?:string|null;
 managerName?:string|null;contactPhone?:string|null;zaloPhone?:string|null;contactInfo?:string|null;description?:string|null;
 amenities?:string[];selectedRules?:string[];rules?:string|null;photos:HostAttachment[];documents?:HostAttachment[];
 createdAt?:string|null;updatedAt?:string|null;reasonNote?:string|null;requestedFields?:string[];fieldNotes?:Record<string,string>;
 changeRequest?:{registrationId:number;status:string;reasonNote?:string|null;requestedFields?:string[];fieldNotes?:Record<string,string>}|null;
 latitude?:string|null;longitude?:string|null;reverificationRequired?:boolean;reverificationReasons?:string[];
}
export interface HostRoom { roomId: number; propertyId: number; roomTypeId: number; roomType: string; roomNumber: string; floor: string; status: string; price: number | null; customPrice: number | null; areaSqm: number | null }
export interface HostViewing { bookingId: number; propertyId: number; propertyName: string; roomTypeId: number; roomType: string; renterName: string; renterPhone: string; scheduledDate: string; status: string; note?: string; decisionReason?: string; createdAt: string }
export interface HostInbox { items: { notificationId: number; bookingId: number; content: string; read: boolean; createdAt: string }[]; hasNext: boolean; unreadCount: number }
export interface HostDashboard { properties: {propertyId: number; name: string}[]; totalRoomCount: number; availableRoomCount: number; pendingViewingCount: number; pendingRegistrationCount: number; roomTypeCount: number }
export interface HostRoomType { roomTypeId:number;propertyId:number;roomType:string;price:number|null;areaSqm:number|null;capacity:number;totalRooms:number;vacantRooms:number;deposit?:number|null;description?:string;imageUrl?:string|null;amenities?:string[];electricityPrice?:number|null;waterPrice?:number|null;internetPrice?:number|null;servicePrice?:number|null;images?:{imageId:number;fileName:string}[]; }
export interface HostManagedProperty {propertyId:number;name:string;address?:string;status:string}
export interface HostData { roomTypes:{roomTypes:HostRoomType[];properties?:HostManagedProperty[]}; dashboard: HostDashboard; properties: { records: HostProperty[] }; rooms: { rooms: HostRoom[] }; viewings: { viewings: HostViewing[] }; inbox: HostInbox }
export type HostResource = keyof HostData;
export const hostPaths: Record<HostResource,string> = { roomTypes:'/host/room-types', dashboard: '/host/dashboard', properties: '/host/property', rooms: '/host/rooms', viewings: '/host/viewings', inbox: '/viewings/notifications?page=0' };
export class HostError extends Error { constructor(message: string, readonly status = 0) { super(message); } }
export async function hostRequest<T>(path: string, token: string, signal: AbortSignal, body?: unknown, method = 'GET'): Promise<T> {
  if (!token) throw new HostError('Phiên đăng nhập đã hết hạn.',401);
  const {response,result} = await requestJson(`${getApiBase()}/api${path}`, {method,signal,credentials:'omit',headers:{Authorization:`Bearer ${token}`,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  if (!response.ok || result?.success !== true) throw new HostError(result?.message || 'Không thể tải dữ liệu quản lý.',response.status);
  return result.data as T;
}
export function validateHostResource<K extends HostResource>(key: K, data: HostData[K]): HostData[K] {
  const valid = key === 'dashboard' ? ['totalRoomCount','availableRoomCount','pendingViewingCount','roomTypeCount'].every(k=>typeof (data as unknown as Record<string,unknown>)?.[k] === 'number') && Array.isArray((data as HostDashboard)?.properties) : key === 'roomTypes' ? Array.isArray((data as HostData['roomTypes'])?.roomTypes) : key === 'properties' ? Array.isArray((data as HostData['properties'])?.records) : key === 'rooms' ? Array.isArray((data as HostData['rooms'])?.rooms) : key === 'viewings' ? Array.isArray((data as HostData['viewings'])?.viewings) : Array.isArray((data as HostInbox)?.items) && typeof (data as HostInbox)?.unreadCount === 'number';
  if (!valid) throw new HostError('Dữ liệu quản lý không hợp lệ.'); return data;
}
export function roomCounts(rooms: HostRoom[]) { return { total: rooms.length, vacant: rooms.filter(r=>r.status==='VACANT').length, occupied: rooms.filter(r=>r.status==='OCCUPIED').length, other: rooms.filter(r=>!['VACANT','OCCUPIED'].includes(r.status)).length }; }
export function formatHostDate(value: string) { if (!value) return 'Chưa có thời gian'; const date = new Date(value.endsWith('Z') || /[+-]\d\d:\d\d$/.test(value) ? value : value+'+07:00'); return Number.isNaN(date.getTime()) ? 'Thời gian không hợp lệ' : date.toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'}); }

export function hostPrice(value:number|null):string { return value==null||!Number.isFinite(value)?'Chưa có giá':new Intl.NumberFormat('vi-VN').format(value)+' đ/tháng'; }


export function vacancyOverview(dashboard?:HostDashboard,rooms?:HostRoom[]):{total:number;vacant:number}|null {
 const valid=(total:unknown,vacant:unknown)=>Number.isSafeInteger(total)&&Number.isSafeInteger(vacant)&&(total as number)>=0&&(vacant as number)>=0&&(vacant as number)<=(total as number);
 if(dashboard&&valid(dashboard.totalRoomCount,dashboard.availableRoomCount))return {total:dashboard.totalRoomCount,vacant:dashboard.availableRoomCount};
 if(rooms){const counts=roomCounts(rooms);return {total:counts.total,vacant:counts.vacant};}
 return null;
}
