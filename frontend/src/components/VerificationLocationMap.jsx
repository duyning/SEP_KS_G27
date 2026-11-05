import {MapPin} from 'lucide-react';
import {verificationLocation} from '../services/verification-detail.js';
import {RoomLocationMap} from './AccommodationMap.jsx';

export default function VerificationLocationMap({summary,submission}){
 const {coordinates,address}=verificationLocation(summary,submission);
 return <section className="svd-location"><header><MapPin size={18}/><div><h4>Vị trí nhà trọ &amp; Bản đồ định vị</h4><p>Đối chiếu vị trí chủ trọ đã ghim · Chế độ chỉ xem</p></div></header><dl className="svd-address"><div><dt>Địa chỉ đầy đủ:</dt><dd>{address||'Chưa cung cấp địa chỉ'}</dd></div>{submission?.nearby&&<div><dt>Địa điểm lân cận:</dt><dd>{submission.nearby}</dd></div>}</dl><RoomLocationMap room={{propertyName:summary.name,address,latitude:coordinates?.[0],longitude:coordinates?.[1]}}/><p className="svd-map-note">Staff đối chiếu bản đồ, không chỉnh sửa vị trí trong hồ sơ.</p></section>;
}
