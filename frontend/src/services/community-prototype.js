export const communityCategories=[['ALL','🌐','Tất cả'],['ROOM_TRANSFER','🏠','Nhượng phòng'],['ROOMMATE','👥','Tìm người ở ghép'],['SECOND_HAND','📦','Đồ cũ sinh viên']];
export const communityZones=[['all','Tất cả khu vực Hòa Lạc'],['tan-xa','Tân Xã (Gần ĐH FPT)'],['thach-hoa','Thạch Hòa (Gần ĐHQG, Chợ)'],['binh-yen','Bình Yên (Khu yên tĩnh)'],['cnc','Khu CNC Hòa Lạc'],['khac','Khu vực khác']];
export const communitySorts=[['newest','Mới đăng nhất'],['oldest','Cũ nhất'],['price-asc','Giá thấp đến cao'],['price-desc','Giá cao đến thấp']];
export function paginateCommunityPosts(posts,rawPage=1,pageSize=8){
 const totalPages=Math.max(1,Math.ceil(posts.length/pageSize));
 const requested=Number(rawPage),page=Number.isSafeInteger(requested)&&requested>0?Math.min(requested,totalPages):1;
 return {page,totalPages,items:posts.slice((page-1)*pageSize,page*pageSize)};
}
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase();
export function communityZone(location){const value=normalize(location);return value.includes('tan xa')?'tan-xa':value.includes('thach hoa')?'thach-hoa':value.includes('binh yen')?'binh-yen':/cong nghe cao|khu cnc/.test(value)?'cnc':'khac'}
export function filterCommunityPosts(posts,{category='ALL',q='',location='all',sort='newest'}={}){
 const text=normalize(q.trim());
 return posts.filter(post=>(category==='ALL'||post.type===category)&&(!text||normalize(`${post.title} ${post.content} ${post.location} ${post.authorName}`).includes(text))&&(location==='all'||communityZone(post.location)===location))
  .sort((a,b)=>{
   if(sort.startsWith('price-')){if(a.price==null&&b.price!=null)return 1;if(a.price!=null&&b.price==null)return -1;if(a.price!=null&&b.price!=null&&a.price!==b.price)return sort==='price-asc'?a.price-b.price:b.price-a.price;}
   const difference=(Date.parse(a.createdAt)||0)-(Date.parse(b.createdAt)||0);return(sort==='oldest'?difference:-difference)||b.id-a.id;
  });
}
export function communityDate(value){const date=new Date(value);return Number.isNaN(date.getTime())?'Chưa cập nhật thời gian':date.toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
