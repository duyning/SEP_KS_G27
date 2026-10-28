import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {AppMotionProvider, AnimatePresence, MotionButton, MotionMenu} from '../../src/components/motion/MotionUI.jsx';
import {ToastProvider, useToast, Modal} from '../../src/components/PortalUI.jsx';
import '../../src/styles/portal.css';
import '../../src/styles/motion.css';
function Harness(){
 const [open,setOpen]=useState(false),[menu,setMenu]=useState(false),notify=useToast();
 return <main className="portal-app" style={{padding:20}}><MotionButton id="open" onClick={()=>setOpen(true)}>Mở modal</MotionButton><MotionButton onClick={()=>notify('Đã lưu')}>Thông báo</MotionButton><MotionButton onClick={()=>setMenu(!menu)}>Menu</MotionButton><div style={{position:'relative'}}><AnimatePresence>{menu&&<MotionMenu id="test-menu"><button>Hồ sơ</button></MotionMenu>}</AnimatePresence></div><AnimatePresence>{open&&<Modal title="Kiểm tra modal" onClose={()=>setOpen(false)}><label>Họ tên<input aria-label="Họ tên"/></label><button onClick={()=>setOpen(false)}>Hoàn tất</button></Modal>}</AnimatePresence><div style={{marginTop:1200}}><span id="loading-loop" className="spin" style={{display:"inline-block"}}>Đang tải</span></div></main>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><AppMotionProvider><ToastProvider><Harness/></ToastProvider></AppMotionProvider></React.StrictMode>);
