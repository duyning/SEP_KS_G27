import {useEffect,useId,useRef,useState} from 'react';
import {parseLocationInput} from '../services/location-lookup.js';
import {lookupPropertyLocation} from '../services/property-location.js';
import {vietmapLocation} from '../services/vietmap-location.js';
import {MotionButton} from './motion/MotionUI.jsx';
import {roomCoordinates} from '../services/map-location.js';
import '../styles/property-address-autocomplete.css';

const plainAddress=value=>value.trim().length>=3&&!/^https?:\/\//i.test(value.trim())&&!/^[+\-\d.\s]+,[+\-\d.\s]+$/.test(value.trim());
const pointKey=point=>point?point.join(','):'';
export default function PropertyAddressLookup({onApply,resolveDetails=false,coordinates,disabled=false,locationKey='',lookup=lookupPropertyLocation}) {
 const [query,setQuery]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [enabled,setEnabled]=useState(false),[suggestions,setSuggestions]=useState([]),[active,setActive]=useState(-1),[source,setSource]=useState('');
 const listId=useId(),pending=useRef(),applyRef=useRef(onApply),queryRef=useRef(query),selectedQuery=useRef(''),resolved=useRef('');
 const point=roomCoordinates(coordinates),key=pointKey(point),previousPoint=useRef(key);
 applyRef.current=onApply;queryRef.current=query;
 const cancel=()=>{pending.current?.abort();pending.current=null;};
 useEffect(()=>{if(!resolveDetails)return;const c=new AbortController();vietmapLocation.status(c.signal).then(data=>{if(!c.signal.aborted)setEnabled(data.enabled);}).catch(()=>{});return()=>c.abort();},[resolveDetails]);
 useEffect(()=>{cancel();setBusy(false);setSuggestions([]);setActive(-1);},[locationKey,disabled]);
 useEffect(()=>()=>cancel(),[]);
 const begin=()=>{cancel();const c=new AbortController();pending.current=c;setBusy(true);setError('');return c;};
 const finish=c=>{if(pending.current===c){pending.current=null;setBusy(false);}};
 function receive(data,text){resolved.current=pointKey(roomCoordinates(data));applyRef.current(data);setSource(data.attribution||'');setMessage([text,...(data.warnings||[])].join(' '));}
 async function search(input=queryRef.current){
  if(!enabled||disabled||!plainAddress(input))return;
  if(input.trim().length>200){setError('Từ khóa tìm địa chỉ tối đa 200 ký tự.');setSuggestions([]);return;}
  const c=begin();setMessage('');
  try{const values=await vietmapLocation.autocomplete(input.trim(),roomCoordinates(coordinates),c.signal);if(c.signal.aborted||queryRef.current!==input)return;setSuggestions(values);setActive(-1);if(!values.length)setMessage('Chưa tìm thấy địa chỉ phù hợp. Thử tên đường, khu vực gần đó hoặc chọn ghim trên bản đồ.');}
  catch(e){if(!c.signal.aborted){setSuggestions([]);setError(e.message);}}finally{finish(c);}
 }
 useEffect(()=>{
  if(!enabled||disabled||!plainAddress(query)||query===selectedQuery.current)return;
  const timer=setTimeout(()=>{if(document.activeElement?.id==='property-pasted-address')search(query);},300);return()=>clearTimeout(timer);
 },[query,enabled,disabled]);
 useEffect(()=>{if(active>=0)document.getElementById(`${listId}-${active}`)?.scrollIntoView({block:'nearest'});},[active,listId]);
 async function choose(item){
  const c=begin();selectedQuery.current=item.display;setQuery(item.display);setSuggestions([]);setActive(-1);
  try{const data=await vietmapLocation.place(item.refId,c.signal);if(!c.signal.aborted)receive(data,'Đã chọn địa chỉ và đặt ghim. Hãy kiểm tra số nhà, khu vực và vị trí cổng nhà trọ.');}
  catch(e){if(!c.signal.aborted)setError(e.message);}finally{finish(c);}
 }
 async function reverse(pin){
  const c=begin();setSuggestions([]);
  try{const data=await vietmapLocation.reverse(pin,c.signal);if(!c.signal.aborted)receive(data,'Đã gợi ý địa chỉ theo ghim. Vị trí bạn chọn được giữ nguyên; hãy kiểm tra địa chỉ trước khi gửi.');}
  catch(e){if(!c.signal.aborted)setError(e.message);}finally{finish(c);}
 }
 useEffect(()=>{
  const previous=previousPoint.current;previousPoint.current=key;
  if(!enabled||disabled||!point||previous===key||resolved.current===key)return;
  const timer=setTimeout(()=>reverse(point),600);return()=>clearTimeout(timer);
 },[key,enabled,disabled]);
 async function apply(input) {
  const c=begin();setMessage('');setSuggestions([]);
  try{
   let data;
   if(resolveDetails)data=await lookup(input,c.signal);
   else{const parsed=parseLocationInput(input);if(!parsed.location)throw Error('Nội dung chưa chứa tọa độ cụ thể. Hãy chọn vị trí trên bản đồ hoặc dán cặp vĩ độ, kinh độ.');data={latitude:String(parsed.location.lat),longitude:String(parsed.location.lng)};}
   if(!c.signal.aborted)receive(data,'Đã đặt ghim theo vị trí đã dán. Hãy kiểm tra lại thông tin nhà trọ.');
  }catch(e){if(!c.signal.aborted)setError(e.message);}finally{finish(c);}
 }
 return <section className="registration-address-lookup">
  <label htmlFor="property-pasted-address">{enabled?'Tìm địa chỉ hoặc dán liên kết Google Maps':resolveDetails?'Dán liên kết Google Maps hoặc tọa độ':'Dán tọa độ hoặc liên kết có tọa độ'}</label>
  <div className="registration-lookup-input">
   <div className="property-address-combobox">
    <input type="text" id="property-pasted-address" role={enabled?'combobox':undefined} aria-autocomplete={enabled?'list':undefined} aria-expanded={enabled?suggestions.length>0:undefined} aria-controls={enabled?listId:undefined} aria-activedescendant={active>=0?`${listId}-${active}`:undefined} autoComplete="off" maxLength={1500} disabled={disabled} value={query}
     placeholder={enabled?'Nhập tên đường, nhà trọ hoặc dán link Google Maps':resolveDetails?'Dán link Google Maps, kể cả link rút gọn':'Dán tọa độ hoặc liên kết Google Maps đầy đủ'}
     onChange={event=>{cancel();setBusy(false);selectedQuery.current='';setQuery(event.target.value);setSuggestions([]);setActive(-1);setError('');setMessage('');}}
     onBlur={()=>{cancel();setBusy(false);setSuggestions([]);setActive(-1);}}
     onKeyDown={event=>{
      if(event.key==='ArrowDown'&&suggestions.length){event.preventDefault();setActive(index=>(index+1)%suggestions.length);}
      else if(event.key==='ArrowUp'&&suggestions.length){event.preventDefault();setActive(index=>(index<=0?suggestions.length:index)-1);}
      else if(event.key==='Escape'){if(suggestions.length){event.preventDefault();event.stopPropagation();}cancel();setBusy(false);setSuggestions([]);setActive(-1);}
      else if(event.key==='Enter'){event.preventDefault();if(disabled||busy)return;if(active>=0&&suggestions[active])choose(suggestions[active]);else if(enabled&&plainAddress(query))search();else if(query.trim())apply(query);}
     }}/>
    {suggestions.length>0&&<ul id={listId} role="listbox" aria-label="Địa chỉ gợi ý" className="property-address-options">{suggestions.map((item,index)=><li key={item.refId} role="presentation"><button id={`${listId}-${index}`} type="button" role="option" tabIndex={-1} aria-selected={active===index} className={active===index?'is-active':''} onMouseDown={event=>event.preventDefault()} onMouseEnter={()=>setActive(index)} onClick={()=>choose(item)}><span>{item.display}</span>{item.commune&&<small>Khu vực gợi ý: {item.commune}</small>}</button></li>)}</ul>}
   </div>
   <MotionButton className="p-button primary" type="button" disabled={disabled||busy||!query.trim()} onClick={()=>enabled&&plainAddress(query)?search():apply(query)}>{busy?'Đang tìm vị trí…':enabled&&plainAddress(query)?'Tìm địa chỉ':resolveDetails?'Đặt ghim & điền thông tin':'Đặt ghim'}</MotionButton>
  </div>
  {resolveDetails&&<div className="registration-location-actions"><MotionButton className="p-button" type="button" disabled={disabled||busy||!point} onClick={()=>enabled?reverse(point):apply(point.join(','))}>Điền thông tin từ ghim hiện tại</MotionButton><small>{source|| (enabled?'VIETMAP':'OpenStreetMap')} · Chỉ điền các trường được phép chỉnh sửa. Bạn có thể kiểm tra và sửa lại.</small></div>}
  {error&&<p className="registration-error" role="alert">{error}</p>}{message&&<p className="registration-notice" role="status">{message}</p>}
 </section>;
}
