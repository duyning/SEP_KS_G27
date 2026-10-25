import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLocationInput,locationFromGoogle} from '../src/services/location-lookup.js';

test('paste lookup accepts address text, Zalo labels and exact coordinate links',()=>{
  assert.equal(parseLocationInput('Địa chỉ: Số 18, Thôn 2, Tân Xã\nSĐT: 0912345678').address,'Số 18, Thôn 2, Tân Xã');
  assert.deepEqual(parseLocationInput('https://maps.google.com/?q=21.0188,105.5215'),{location:{lat:21.0188,lng:105.5215}});
  assert.equal(parseLocationInput('https://www.google.com/maps/search/?api=1&query=T%C3%A2n+X%C3%A3').address,'Tân Xã');
  assert.deepEqual(parseLocationInput('https://www.google.com/maps/place/Nha+tro/data=!3d21.01!4d105.52'),{location:{lat:21.01,lng:105.52}});
  assert.deepEqual(parseLocationInput('https://www.google.com/maps/search/?query_place_id=some-place-id'),{placeId:'some-place-id'});
});
test('viewport centers, short links and arbitrary URLs never become fake exact pins',()=>{
  for(const value of ['https://www.google.com/maps/@21.01,105.52,15z','https://maps.app.goo.gl/abc','https://evil.example/?q=21,105','91,105','x','x'.repeat(1501)])assert.throws(()=>parseLocationInput(value));
});
const result=()=>({formatted_address:'Số 18, Thôn 2, Tân Xã, Hà Nội',address_components:[{long_name:'Tân Xã',types:['administrative_area_level_3']}],geometry:{location:{lat:()=>21.0188,lng:()=>105.5215},location_type:'ROOFTOP'}});
test('Google result supplies actual address and coordinates without fabricating unknown commune',()=>{
  const location=locationFromGoogle(result());assert.equal(location.commune,'Tân Xã');assert.equal(location.latitude,'21.018800');assert.equal(location.longitude,'105.521500');assert.equal(location.approximate,false);
  const unknown=result();unknown.formatted_address='Xã Hòa Lạc, Hà Nội';unknown.address_components=[];assert.equal(locationFromGoogle(unknown).commune,'');
  const approximate=result();approximate.partial_match=true;assert.equal(locationFromGoogle(approximate).approximate,true);
  assert.throws(()=>locationFromGoogle({formatted_address:'Address without geometry'}));
  const invalid=result();invalid.geometry.location={lat:NaN,lng:105};assert.throws(()=>locationFromGoogle(invalid));
});
