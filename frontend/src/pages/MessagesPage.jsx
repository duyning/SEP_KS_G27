import {useEffect,useRef,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {MessageSquare} from 'lucide-react';
import {useMessaging} from '../context/messagingState.js';
import ConversationList from '../components/messaging/ConversationList.jsx';
import MessageThread from '../components/messaging/MessageThread.jsx';

export default function MessagesPage(){
 const chat=useMessaging(),[params,setParams]=useSearchParams(),id=Number(params.get('conversation'))||null;
 const [error,setError]=useState(''),opened=useRef('');
 useEffect(()=>{document.title='Tin nhắn | NestHub';},[]);
 useEffect(()=>{const recipient=Number(params.get('recipient')),post=Number(params.get('post'));if(!recipient||opened.current===params.toString())return;opened.current=params.toString();chat.openTo(recipient,post?{kind:'COMMUNITY_POST',referenceId:post}:null).catch(e=>setError(e.message));},[params.toString()]);
 return <main className={`msg-page${id?' has-selection':''}`}><h1>Tin nhắn</h1>{error&&<p role="alert">{error}</p>}<div className="msg-workspace"><ConversationList selected={id} onChoose={selected=>chat.openId(selected)}/>{id?<MessageThread key={id} id={id} onBack={()=>setParams({})}/>:<section className="msg-welcome"><MessageSquare size={46}/><h2>Tin nhắn riêng của bạn</h2><p>Chọn hội thoại để xem lịch sử và tiếp tục trao đổi.</p></section>}</div></main>;
}
