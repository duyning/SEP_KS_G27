import {useLayoutEffect,useRef} from 'react';

const displayAmount = value => String(value ?? '').replace(/\B(?=(\d{3})+(?!\d))/g,'.');

// The form keeps integer digits; grouping separators belong only to the input display.
export default function VndMoneyInput({value,onChange,onKeyDown,...props}) {
 const input=useRef(null),caret=useRef(null);
 const display=displayAmount(value);
 useLayoutEffect(()=>{
  if(caret.current==null||document.activeElement!==input.current)return;
  let digits=caret.current,position=0;
  while(position<display.length&&digits>0){if(/\d/.test(display[position]))digits--;position++;}
  input.current.setSelectionRange(position,position);caret.current=null;
 });
 const change=(raw,position)=>{
  if(!/^[\d.,\s]*$/.test(raw))return;
  const digits=raw.replace(/\D/g,'');
  caret.current=(raw.slice(0,position).match(/\d/g)||[]).length;
  onChange({target:{name:props.name,value:digits}});
 };
 return <input {...props} ref={input} type="text" inputMode="numeric" value={display}
  onChange={event=>change(event.target.value,event.target.selectionStart??event.target.value.length)}
  onKeyDown={event=>{
   onKeyDown?.(event);if(event.defaultPrevented)return;
   const node=event.currentTarget,start=node.selectionStart;
   if(start!==node.selectionEnd||start==null)return;
   // Delete a digit together with the adjacent separator, avoiding an apparently stuck key.
   if(event.key==='Backspace'&&start>1&&display[start-1]==='.'){
    event.preventDefault();change(display.slice(0,start-2)+display.slice(start),start-2);
   }else if(event.key==='Delete'&&display[start]==='.'){
    event.preventDefault();change(display.slice(0,start)+display.slice(start+2),start);
   }
  }}/>;
}
