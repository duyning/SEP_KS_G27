import {useEffect,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {ArrowLeft,Check,Clock3,ShieldCheck} from 'lucide-react';
import {useAuth} from '../context/AuthContext.jsx';
import {roleLabels} from '../routing/screens.js';
import {onboardingApi} from '../services/host-onboarding.js';
import HostAccountApplicationForm from '../components/HostAccountApplicationForm.jsx';
import HostIdentityImage from '../components/HostIdentityImage.jsx';
import HostPhoneVerificationModal from '../components/HostPhoneVerificationModal.jsx';
import {MotionButton} from '../components/motion/MotionUI.jsx';
import {StateView} from '../components/PortalUI.jsx';
import DetailPrototypeShell from '../components/detail/DetailPrototypeShell.jsx';
import HostOnboardingStatus from '../components/HostOnboardingStatus.jsx';
import PublicFooter from '../components/layout/PublicFooter.jsx';
import {RegistrationForm} from './host/HostPropertyCreatePage.jsx';
import {Editor} from './host/HostPropertyEditForm.jsx';
import '../styles/home-prototype.css';
import '../styles/home-prototype-integration.css';
import '../styles/host-onboarding.css';

export default function HostOnboardingPage(){
 const {user,refreshUser}=useAuth();
 const [params]=useSearchParams();const preview=import.meta.env.DEV&&params.get('formPreview')==='1';
 const [state,setState]=useState({loading:true,account:null,registration:null,error:''});
 const [revision,setRevision]=useState(0),[stage,setStage]=useState(0),[started,setStarted]=useState(false);
 const [values,setValues]=useState({introduction:'',agreementAccepted:false});
 const [images,setImages]=useState({front:'',back:''}),[errors,setErrors]=useState({}),[reading,setReading]=useState(0),[phoneOpen,setPhoneOpen]=useState(false);
 const [editor,setEditor]=useState(null),[editing,setEditing]=useState(false),[refreshing,setRefreshing]=useState(false);
 const mounted=useRef(true),reads=useRef({front:0,back:0});
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{if(preview){setState({loading:false,account:null,registration:null,error:''});return;}const c=new AbortController();setState(p=>({...p,loading:true,error:''}));onboardingApi.current(c.signal).then(data=>{if(!c.signal.aborted)setState({loading:false,...data,error:''});}).catch(error=>{if(!c.signal.aborted)setState(p=>({...p,loading:false,error:error.message}));});return()=>c.abort();},[user.userId,revision,preview]);
 const account=state.account,registration=state.registration;
 const missingContact=!user.fullName?.trim()||!/^(0|\+84)[35789]\d{8}$/.test(user.phoneNumber||'');
 async function choose(file,side='front'){
  if(!file)return;const key=side==='back'?'identityBackImage':'identityImage';const sequence=++reads.current[side];
  if(!['image/jpeg','image/png'].includes(file.type)||file.size===0||file.size>5*1024*1024){setErrors(p=>({...p,[key]:'Chọn ảnh JPG hoặc PNG, tối đa 5 MB.'}));return;}
  setReading(n=>n+1);
  try{const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});if(mounted.current&&reads.current[side]===sequence){setImages(p=>({...p,[side]:data}));setErrors(p=>({...p,[key]:undefined}));}}
  catch{if(mounted.current)setErrors(p=>({...p,[key]:'Không đọc được ảnh. Vui lòng chọn lại.'}));}
  finally{if(mounted.current)setReading(n=>n-1);}
 }
 function next(event){event.preventDefault();if(missingContact||!values.agreementAccepted||reading||errors.identityImage||errors.identityBackImage||!(images.front||account?.hasIdentityImage)||!(images.back||account?.hasIdentityBackImage))return;setStarted(true);setStage(1);window.scrollTo({top:0});}
 async function submit(data,signal){if(preview)throw new Error('Bản xem trước không gửi hồ sơ thật.');return onboardingApi.submit({...values,identityImage:images.front||null,identityBackImage:images.back||null,version:account?.version??null},data,signal);}
 function received(record){setImages({front:'',back:''});setEditor(null);setEditing(false);setState(p=>({...p,registration:record}));setRevision(n=>n+1);window.scrollTo({top:0});}
 async function refresh(){if(refreshing)return;setRefreshing(true);setErrors({});try{await refreshUser();const data=await onboardingApi.current();setState({loading:false,...data,error:''});}catch(error){setErrors({load:error.message});}finally{setRefreshing(false);}}
 async function edit(){setEditing(true);setErrors({});try{setEditor(await onboardingApi.propertyEdit(registration.registrationId));}catch(error){setErrors({load:error.message});}finally{setEditing(false);}}
 const identityPreview=<div className="host-identity-pair">{['front','back'].map(side=><section key={side}><strong>{side==='front'?'Mặt trước CCCD':'Mặt sau CCCD'}</strong>{images[side]?<img className="host-identity-image" src={images[side]} alt={side==='front'?'Mặt trước CCCD đã chọn':'Mặt sau CCCD đã chọn'}/>:account&&<HostIdentityImage id={account.id} present side={side}/>}</section>)}</div>;
 const host=user.role==='ROOM_HOST';
 return <DetailPrototypeShell className="prototype-become-host host-onboarding" footer={<PublicFooter/>}><main className="onboarding-main">
  <header className="onboarding-heading"><span><ShieldCheck size={18}/>Đối tác HL_RCS</span><h1>Đăng ký chủ trọ & nhà trọ</h1><p>Hoàn thiện thông tin tài khoản và nhà trọ đầu tiên trong một hồ sơ. Nhân viên thẩm định và phê duyệt một lần.</p></header>
  {preview&&<p className="registration-info" role="note">Bản xem trước giao diện · Không gửi SMS hoặc hồ sơ thật.</p>}
  {state.loading?<StateView kind="loading"/>:state.error?<StateView kind="error" message={state.error}><MotionButton className="p-button" onClick={()=>setRevision(n=>n+1)}>Thử lại</MotionButton></StateView>:!['USER','ROOM_HOST'].includes(user.role)?<p>Tài khoản này không cần đăng ký quyền Chủ trọ.</p>:host?<section className="onboarding-status"><Check/><h2>Bạn đã có quyền Chủ trọ</h2><p>Bạn có thể đăng ký thêm nhiều nhà trọ trong Host Portal.</p><Link className="p-button primary" to="/host/property/new">Đăng ký nhà trọ</Link><Link className="p-button" to="/host/property">Nhà trọ của tôi</Link></section>:editor?<><MotionButton className="p-button" onClick={()=>setEditor(null)}><ArrowLeft size={16}/>Trạng thái hồ sơ</MotionButton><Editor snapshot={editor} api={onboardingApi} onboarding onDone={received}/></>:registration?<HostOnboardingStatus registration={registration} refreshing={refreshing} editing={editing} error={errors.load} onRefresh={refresh} onEdit={edit}/>:<>
   <ol className="onboarding-steps" aria-label="Tiến trình đăng ký">{['Tài khoản & CCCD','Thông tin nhà trọ','Nhân viên thẩm định'].map((label,index)=><li key={label} aria-current={index===stage?'step':undefined} className={index===stage?'current':''}><span>{index+1}</span>{label}</li>)}</ol>
   <div hidden={stage!==0} onSubmit={next} onChange={event=>{if(event.target.name==='introduction')setValues(p=>({...p,introduction:event.target.value}));if(event.target.name==='agreementAccepted')setValues(p=>({...p,agreementAccepted:event.target.checked}));}}>
    <HostAccountApplicationForm {...{user,application:account,values,errors,missingContact}} roleLabel={roleLabels[user.role]} busy={reading>0} identityImage={images.front} identityBackImage={images.back} preview={preview} onIdentityFile={choose} onRemoveIdentity={side=>{reads.current[side]++;setImages(p=>({...p,[side]:''}));setErrors(p=>({...p,[side==='back'?'identityBackImage':'identityImage']:undefined}));}} onVerifyPhone={()=>setPhoneOpen(true)} title="Thông tin tài khoản & CCCD" submitLabel="Tiếp tục đăng ký nhà trọ"/>
   </div>
   {started&&<div className="host-portal" hidden={stage!==1}><RegistrationForm user={user} onboarding identityPreview={identityPreview} lookup={onboardingApi.lookup} submitRegistration={submit} onSubmitted={received} onBack={()=>setStage(0)}/></div>}
  </>}
 </main>{phoneOpen&&<HostPhoneVerificationModal user={user} preview={preview} onClose={()=>setPhoneOpen(false)} onVerified={async()=>{if(!preview)await refreshUser();setPhoneOpen(false);}}/>}</DetailPrototypeShell>;
}
