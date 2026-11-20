import {useEffect,useRef,useState} from 'react';
import {KeyboardAvoidingView,Modal,Platform,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useAuth} from '@/context/auth-context';
import {PhoneChallenge} from '@/services/auth';
import {AuthInput} from '@/components/auth/auth-input';
import {PrimaryButton} from '@/components/auth/primary-button';
import {InlineError} from '@/components/auth/inline-error';
import {AnimatedPressable} from '@/components/home/animated-pressable';
import {authColors as c} from '@/components/auth/tokens';
import {useReducedMotionPreference} from '@/constants/motion';

export function PhoneOtpDialog({challenge,onCancel,onVerified}:{challenge:PhoneChallenge;onCancel():void;onVerified():Promise<void>}){
 const {sendPhoneOtp,verifyPhoneOtp}=useAuth();const reduce=useReducedMotionPreference();
 const [timing,setTiming]=useState(challenge),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[notice,setNotice]=useState(''),[verified,setVerified]=useState(false),[now,setNow]=useState(()=>Date.now());const lock=useRef(false);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const retry=Math.max(0,Math.ceil((Date.parse(timing.resendAt)-now)/1000)),expired=Date.parse(timing.expiresAt)<=now;
 async function submit(){
  if(lock.current)return;if(!verified&&!/^\d{6}$/.test(code)){setError('Vui lòng nhập đủ 6 chữ số OTP.');return;}
  lock.current=true;setBusy(true);setError(null);
  try{if(!verified){await verifyPhoneOtp(challenge.phoneNumber,code);setVerified(true);}await onVerified();}
  catch(e){const message=e instanceof Error?e.message:'Chưa thể xác minh. Vui lòng thử lại.';if(message.includes('xác minh OTP'))setVerified(false);setError(message);}
  finally{lock.current=false;setBusy(false);}
 }
 async function resend(){
  if(lock.current||retry>0)return;lock.current=true;setBusy(true);setError(null);
  try{setTiming(await sendPhoneOtp(challenge.phoneNumber));setCode('');setVerified(false);setNow(Date.now());setNotice('Đã yêu cầu gửi lại mã OTP.');}
  catch(e){setError(e instanceof Error?e.message:'Chưa thể gửi mã.');}finally{lock.current=false;setBusy(false);}
 }
 return <Modal transparent animationType={reduce?'none':'fade'} onRequestClose={()=>{if(!busy)onCancel();}}>
  <KeyboardAvoidingView style={s.backdrop} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.scroll}>
   <View accessibilityViewIsModal style={s.dialog}><Text accessibilityRole="header" style={s.title}>Xác minh số điện thoại</Text>
    <Text style={s.hint}>Nhập mã OTP gửi qua SMS đến <Text style={s.bold}>{challenge.phoneNumber}</Text> để xác minh và lưu thông tin.</Text>
    <AuthInput label="Mã OTP" value={code} onChangeText={value=>{setCode(value.replace(/\D/g,'').slice(0,6));setError(null);}} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} autoFocus editable={!busy&&!verified} placeholder="Nhập 6 chữ số"/>
    <Text style={s.hint}>{verified?'Đã xác minh. Bạn có thể thử lưu lại nếu lần trước thất bại.':expired?'Mã đã hết hạn. Vui lòng gửi lại.':'Mã có hiệu lực tối đa 5 phút. Không chia sẻ mã với người khác.'}</Text>
    <InlineError message={error}/>{!!notice&&<Text accessibilityRole="status" style={s.hint}>{notice}</Text>}
    {!verified&&<AnimatedPressable disabled={busy||retry>0} onPress={()=>{void resend();}} style={s.linkButton}><Text style={[s.link,(busy||retry>0)&&s.disabled]}>{retry>0?`Gửi lại sau ${retry}s`:'Gửi lại mã OTP'}</Text></AnimatedPressable>}
    <PrimaryButton title={verified?'Lưu thông tin':'Xác nhận OTP và lưu'} disabled={busy||(!verified&&expired)} loading={busy} onPress={()=>{void submit();}}/>
    <AnimatedPressable disabled={busy} onPress={onCancel} style={s.linkButton}><Text style={s.link}>Hủy</Text></AnimatedPressable>
   </View></ScrollView></KeyboardAvoidingView>
 </Modal>;
}
const s=StyleSheet.create({backdrop:{flex:1,backgroundColor:'rgba(20,45,41,0.45)'},scroll:{flexGrow:1,justifyContent:'center',padding:20},dialog:{backgroundColor:c.surface,borderRadius:22,padding:22,gap:14},title:{fontSize:22,lineHeight:30,fontWeight:'700',color:c.forestInk},hint:{fontSize:14,lineHeight:22,color:c.textSecondary},bold:{fontWeight:'700',color:c.forestInk},linkButton:{minHeight:44,alignItems:'center',justifyContent:'center'},link:{color:c.primary,fontSize:14,fontWeight:'700'},disabled:{opacity:.5}});
