import {validatePostImages} from './community-images.js';
import {validatePostVideos} from './community-videos.js';
export const MESSAGE_MEDIA_ACCEPT='.jpg,.jpeg,.png,.mp4,image/jpeg,image/png,video/mp4';
export async function validateMessageFiles(files){
 if(files.reduce((sum,file)=>sum+file.size,0)>80*1024*1024)return 'Tổng tệp trong tin nhắn không được vượt quá 80 MB.';
 const videos=files.filter(file=>file.type==='video/mp4'),photos=files.filter(file=>file.type!=='video/mp4');
 const error=await validatePostImages(photos)||await validatePostVideos(videos);
 return error.replaceAll('bài viết','tin nhắn');
}
