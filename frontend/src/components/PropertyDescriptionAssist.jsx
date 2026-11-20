import {useEffect,useRef,useState} from 'react';
import {Sparkles,LoaderCircle} from 'lucide-react';
import {MotionButton} from './motion/MotionUI.jsx';
import {generatePropertyDescription,descriptionFacts} from '../services/property-writing.js';
import '../styles/property-writing.css';
export default function PropertyDescriptionAssist({form,onApply,disabled=false}){
 const [busy,setBusy]=useState(false),[suggestion,setSuggestion]=useState(''),[error,setError]=useState('');
 const pending=useRef(),sequence=useRef(0),snapshot=useRef('');const facts=JSON.stringify(descriptionFacts(form));
 useEffect(()=>{sequence.current++;pending.current?.abort();pending.current=null;setBusy(false);setSuggestion('');setError('');},[facts,disabled]);
 useEffect(()=>()=>{sequence.current++;pending.current?.abort();},[]);
 async function generate(){if(pending.current||disabled)return;if(form.name.trim().length<3||form.propertyType.trim().length<2){setError('Nhập tên và loại hình nhà trọ trước khi tạo gợi ý.');return;}const c=new AbortController();pending.current=c;const id=++sequence.current;snapshot.current=facts;setBusy(true);setError('');setSuggestion('');try{const text=await generatePropertyDescription(form,c.signal);if(id===sequence.current&&!c.signal.aborted)setSuggestion(text);}catch(cause){if(id===sequence.current&&!c.signal.aborted)setError(cause.message);}finally{if(id===sequence.current){pending.current=null;setBusy(false);}}}
 return <div className="property-writing"><MotionButton className="p-button" type="button" onClick={generate} disabled={disabled||busy}>{busy?<LoaderCircle size={16} className="spin"/>:<Sparkles size={16}/>} {busy?'AI đang viết…':'Tạo mô tả bằng AI'}</MotionButton><small>AI dùng thông tin đã nhập. Hãy kiểm tra gợi ý trước khi sử dụng.</small>{busy&&<p role="status">Đang tạo gợi ý mô tả…</p>}{error&&<p className="registration-error" role="alert">{error}</p>}{suggestion&&<section className="property-writing-preview" aria-label="Gợi ý mô tả từ AI"><strong>Gợi ý từ AI</strong><p>{suggestion}</p>{form.description&&<small>Dùng gợi ý sẽ thay nội dung mô tả đang có.</small>}<div><MotionButton type="button" className="p-button primary" disabled={disabled} onClick={()=>{if(snapshot.current===facts){onApply(suggestion);setSuggestion('');}}}>Dùng mô tả này</MotionButton><MotionButton type="button" className="p-button" onClick={()=>setSuggestion('')}>Bỏ gợi ý</MotionButton></div></section>}</div>;
}
