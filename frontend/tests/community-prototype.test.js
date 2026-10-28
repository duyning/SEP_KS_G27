import test from 'node:test';
import assert from 'node:assert/strict';
import {communityZone,filterCommunityPosts,communityDate} from '../src/services/community-prototype.js';
const posts=[{id:1,type:'ROOMMATE',title:'Tìm người ở ghép',content:'Có điều hòa',location:'Tân Xã',authorName:'Nguyễn An',price:1500000,createdAt:'2026-10-20T10:00:00'},{id:2,type:'SECOND_HAND',title:'Bàn học',content:'Còn tốt',location:'Bình Yên',authorName:'Trần Bình',price:0,createdAt:'2026-10-21T10:00:00'},{id:3,type:'ROOMMATE',title:'Phòng studio',content:'Tiện nghi',location:'Khu CNC Hòa Lạc',authorName:'Lê Lan',price:null,createdAt:'2026-10-22T10:00:00'}];
test('community filters real posts by category, accent-insensitive author/content search and area',()=>{
 assert.deepEqual(filterCommunityPosts(posts,{category:'ROOMMATE',q:'nguyen',location:'tan-xa'}).map(p=>p.id),[1]);
 assert.deepEqual(filterCommunityPosts(posts,{q:'dieu hoa'}).map(p=>p.id),[1]);
 assert.deepEqual(filterCommunityPosts(posts,{location:'binh-yen'}).map(p=>p.id),[2]);
 assert.deepEqual(filterCommunityPosts(posts,{q:'không tồn tại'}),[]);
 assert.equal(communityZone('Gần Khu Công nghệ cao Hòa Lạc'),'cnc');assert.equal(communityZone('Địa chỉ khác'),'khac');
});
test('community sorts without changing source, treats a free item as zero and unspecified price as unknown',()=>{
 assert.deepEqual(filterCommunityPosts(posts,{sort:'price-asc'}).map(p=>p.id),[2,1,3]);
 assert.deepEqual(filterCommunityPosts(posts,{sort:'price-desc'}).map(p=>p.id),[1,2,3]);
 assert.deepEqual(filterCommunityPosts(posts,{sort:'newest'}).map(p=>p.id),[3,2,1]);
 assert.deepEqual(filterCommunityPosts(posts,{sort:'oldest'}).map(p=>p.id),[1,2,3]);assert.deepEqual(posts.map(p=>p.id),[1,2,3]);
 assert.equal(communityDate('invalid'),'Chưa cập nhật thời gian');
});
