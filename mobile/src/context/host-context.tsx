import { createContext, useContext, useEffect, useMemo, type PropsWithChildren } from 'react';
import { useAuth } from './auth-context';
import { tokenStore } from '@/services/auth';
import { HostError, hostPaths, hostRequest, validateHostResource, type HostData, type HostResource, type HostRoom } from '@/services/host';
import { useSyncExternalStore } from 'react';

type Snapshot = { data: Partial<HostData>; errors: Partial<Record<HostResource,string>>; loading: boolean; busy: boolean; mutationError: string | null; imageToken: string | null };
export class HostStore {
  private snapshot: Snapshot = {data:{},errors:{},loading:false,busy:false,mutationError:null,imageToken:null};
  private listeners = new Set<()=>void>(); private initialized=false; private notificationPage = 0; private active = true; private generation = 0; private controllers = new Set<AbortController>();
  constructor(private enabled:boolean, private unauthorized:()=>void, readonly accountKey?:number) {}
  subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};}; getSnapshot=()=>this.snapshot;
  private set(value:Partial<Snapshot>){this.snapshot={...this.snapshot,...value};this.listeners.forEach(fn=>fn());}
  start=()=>{this.active=true;}; stop=()=>{this.active=false;this.initialized=false;this.generation++;this.controllers.forEach(c=>c.abort());this.controllers.clear();this.snapshot={data:{},errors:{},loading:false,busy:false,mutationError:null,imageToken:null};};
  ensure=()=>{if(!this.initialized)void this.refresh();};
  private handleUnauthorized(error:unknown){if(error instanceof HostError&&[401,403].includes(error.status)){this.generation++;this.controllers.forEach(c=>c.abort());this.set({data:{},imageToken:null,loading:false,busy:false});this.unauthorized();}}
  refresh=async()=>{
    if(!this.enabled||!this.active||this.snapshot.loading||this.snapshot.busy)return;
    const version=this.generation, controller=new AbortController();this.controllers.add(controller);this.set({loading:true});
    try { const token=await tokenStore.get(); if(!this.active||version!==this.generation)return;if(!token)throw new HostError('Phiên đăng nhập đã hết hạn.',401);
      this.set({imageToken:token});
      await Promise.all((Object.keys(hostPaths) as HostResource[]).map(async key=>{try{const value=validateHostResource(key,await hostRequest<HostData[typeof key]>(hostPaths[key],token,controller.signal));if(this.active&&version===this.generation){if(key==='inbox')this.notificationPage=0;this.set({data:{...this.snapshot.data,[key]:value},errors:{...this.snapshot.errors,[key]:undefined}}); }}catch(error){if(this.active&&version===this.generation&&!controller.signal.aborted){this.handleUnauthorized(error);this.set({errors:{...this.snapshot.errors,[key]:error instanceof Error?error.message:'Không thể tải dữ liệu.'}});}}}));
    }catch(error){if(this.active&&version===this.generation){this.handleUnauthorized(error);this.set({errors:{dashboard:error instanceof Error?error.message:'Không thể tải dữ liệu.'}});}}
    finally{this.controllers.delete(controller);if(this.active&&version===this.generation){this.initialized=true;this.set({loading:false});}}
  };
  loadNotifications=async()=>{
    if(!this.active||!this.enabled||this.snapshot.busy||this.snapshot.loading||!this.snapshot.data.inbox?.hasNext)return;
    const version=this.generation,c=new AbortController();this.controllers.add(c);this.set({busy:true});
    try{const token=await tokenStore.get();if(!this.active||version!==this.generation)return;const next=validateHostResource('inbox',await hostRequest<HostData['inbox']>(`/viewings/notifications?page=${this.notificationPage+1}`,token||'',c.signal));if(!this.active||version!==this.generation)return;this.notificationPage++;this.set({data:{...this.snapshot.data,inbox:{...next,items:[...new Map([...(this.snapshot.data.inbox?.items||[]),...next.items].map(item=>[item.notificationId,item])).values()]}},errors:{...this.snapshot.errors,inbox:undefined}});}
    catch(error){if(this.active&&version===this.generation){this.handleUnauthorized(error);this.set({errors:{...this.snapshot.errors,inbox:error instanceof Error?error.message:'Không thể tải thêm.'}});}}
    finally{this.controllers.delete(c);if(this.active&&version===this.generation)this.set({busy:false});}
  };
  mutate=async(path:string,body?:unknown,method='POST',expectedRoomStatus?:string|HostRoom,send?:(token:string,signal:AbortSignal)=>Promise<unknown>)=>{
    if(!this.active||!this.enabled||this.snapshot.busy)throw new HostError('Vui lòng chờ thao tác hiện tại.');
    const version=this.generation,c=new AbortController();let conflict=false;const timeout=setTimeout(()=>c.abort(),30000);this.controllers.add(c);this.set({busy:true,mutationError:null});
    try{const token=await tokenStore.get();if(!this.active||version!==this.generation)throw new HostError('Phiên đã thay đổi.');
      if(expectedRoomStatus&&method==='PUT'&&path.startsWith('/host/rooms/')){
        const latest=validateHostResource('rooms',await hostRequest<HostData['rooms']>('/host/rooms',token||'',c.signal));
        const original=(typeof expectedRoomStatus==='string'?body:expectedRoomStatus) as Record<string,unknown>,id=Number(path.split('/').pop()),current=latest.rooms.find(room=>room.roomId===id);
        const expected=typeof expectedRoomStatus==='string'?expectedRoomStatus:expectedRoomStatus.status;
        if(!current||current.status!==expected||['roomTypeId','roomNumber','floor','customPrice'].some(key=>(current as unknown as Record<string,unknown>)[key]!==original[key]))throw new HostError('Thông tin phòng đã thay đổi. Đã tải lại dữ liệu; hãy kiểm tra trước khi lưu lại.',409);
      }
      if(!this.active||version!==this.generation)throw new HostError('Phiên đã thay đổi.');
      if(send)await send(token||'',c.signal);else await hostRequest(path,token||'',c.signal,body,method);}
    catch(error){conflict=error instanceof HostError&&error.status===409;if(this.active&&version===this.generation){this.handleUnauthorized(error);this.set({mutationError:c.signal.aborted?'Thao tác chưa hoàn tất. Hãy tải lại để kiểm tra kết quả trước khi thử lại.':error instanceof Error?error.message:'Chưa thể lưu thay đổi.'});}throw error;}
    finally{clearTimeout(timeout);this.controllers.delete(c);if(this.active&&version===this.generation){this.set({busy:false});if(conflict)await this.refresh();}}
    if(this.active&&version===this.generation){while(this.snapshot.loading)await new Promise(resolve=>setTimeout(resolve,50));await this.refresh();}
  };
}
const Context=createContext<HostStore|null>(null);
export function HostProvider({children}:PropsWithChildren){const {user,retry}=useAuth(); const key=user?.userId; const allowed=user?.role==='ROOM_HOST';const store=useMemo(()=>new HostStore(allowed,()=>{void retry();},key),[key,allowed,retry]);useEffect(()=>{store.start();return store.stop;},[store]);return <Context.Provider value={store}>{children}</Context.Provider>;}
export function useHost(){const store=useContext(Context);if(!store)throw new Error('HostProvider missing');const snapshot=useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot);const {user}=useAuth();useEffect(()=>{if(user?.role==='ROOM_HOST')store.ensure();},[user?.role,store]);return {...snapshot,store,allowed:user?.role==='ROOM_HOST'};}




