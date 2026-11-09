import HostEmptyState from './HostEmptyState.jsx';

const content={
 types:{title:'Cần đăng ký nhà trọ trước khi tạo loại phòng',description:'Sau khi nhà trọ được duyệt, bạn có thể thiết lập giá, tiện nghi và tạo danh sách phòng tại đây.'},
 rooms:{title:'Chưa có nhà trọ để quản lý phòng',description:'Đăng ký nhà trọ trước. Sau khi được duyệt, tạo loại phòng cùng danh sách phòng tại Loại phòng & Giá.'},
 viewings:{title:'Chưa có nhà trọ để nhận lịch xem phòng',description:'Đăng ký và hoàn tất xét duyệt nhà trọ để người thuê có thể gửi yêu cầu xem phòng.'},
};
export default function HostSetupRequired({kind='types',pendingCount=0}){
 const view=content[kind];const pending=pendingCount>0;
 return <HostEmptyState title={pending?'Hồ sơ nhà trọ chưa được phê duyệt':view.title}
  description={pending?`Bạn có ${pendingCount} hồ sơ chưa hoàn tất xét duyệt. Kiểm tra phản hồi và bổ sung thông tin nếu được yêu cầu.`:view.description}
  action={{to:pending?'/host/property':'/host/property/new',label:pending?'Theo dõi hồ sơ':'Đăng ký nhà trọ'}} pending={pending}/>;
}
