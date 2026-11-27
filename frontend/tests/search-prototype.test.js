import test from 'node:test';
import assert from 'node:assert/strict';
import {readSearchFilters,searchSorts,updateSearchFilters} from '../src/services/search-prototype.js';
import {accommodationQuery} from '../src/services/accommodations.js';
test('search supports prototype keyword links and rejects unknown filters without fabricated results',()=>{
 const value=readSearchFilters(new URLSearchParams('keyword=Tân+Xã&page=-4&location=invalid&sort=rating-desc&amenities=balcony,invalid,balcony&availableOnly=true'));
 assert.equal(value.q,'Tân Xã');assert.equal(value.page,1);assert.equal(value.location,'all');assert.equal(value.sort,'rating-desc');assert.deepEqual(value.amenities,['balcony']);assert.equal(value.availableOnly,true);
});
test('changing filters resets pagination and keeps unrelated URL state; page navigation preserves filters',()=>{
 const original=new URLSearchParams('keyword=Studio&page=3&location=tan-xa&sort=area-desc');
 const changed=updateSearchFilters(original,{amenities:['balcony','airConditioner'],availableOnly:true});
 assert.equal(original.get('page'),'3');assert.equal(changed.get('page'),null);assert.equal(changed.get('q'),'Studio');assert.equal(changed.get('keyword'),null);assert.equal(changed.get('location'),'tan-xa');
 const page=updateSearchFilters(changed,{page:2});assert.equal(page.get('page'),'2');assert.equal(page.get('amenities'),'balcony,airConditioner');
 const clear=updateSearchFilters(page,{amenities:[],availableOnly:false});assert.equal(clear.has('amenities'),false);assert.equal(clear.has('availableOnly'),false);assert.equal(clear.has('page'),false);
});
test('search preserves literal keywords that are also filter values',()=>{
 for(const q of ['all','false']){
  const params=updateSearchFilters(new URLSearchParams('keyword=Studio&page=3'),{q});
  assert.equal(readSearchFilters(params).q,q);
  assert.equal(params.has('keyword'),false);
  assert.equal(params.has('page'),false);
 }
});
test('search defaults to newest and accepts legacy links without exposing the old sort option',()=>{
 assert.equal(readSearchFilters(new URLSearchParams()).sort,'newest');
 assert.equal(readSearchFilters(new URLSearchParams('sort=recommended')).sort,'newest');
 assert.equal(readSearchFilters(new URLSearchParams('sort=nearest')).sort,'newest');
 assert.equal(readSearchFilters(new URLSearchParams('sort=nearest&originLat=21.01354&originLng=105.52522')).sort,'nearest');
 assert.equal(searchSorts.some(([key])=>key==='recommended'),false);
});
test('advanced criteria are sent to the API with zero-based pagination, before server pagination',()=>{
 const query=new URLSearchParams(accommodationQuery({page:1,size:6,amenities:'airConditioner,balcony',availableOnly:true,sort:'rating-desc'}));
 assert.equal(query.get('page'),'1');assert.equal(query.get('amenities'),'airConditioner,balcony');assert.equal(query.get('availableOnly'),'true');assert.equal(query.get('sort'),'rating-desc');
});
