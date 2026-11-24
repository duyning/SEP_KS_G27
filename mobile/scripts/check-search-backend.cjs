const assert = require('node:assert/strict');
const base = process.env.HLRCS_TEST_API_URL || 'http://127.0.0.1:8081';
async function search(filters) { const response = await fetch(`${base}/api/properties/search?${new URLSearchParams({size:'15',...filters})}`,{signal:AbortSignal.timeout(15000)}); assert.equal(response.status,200); const body=await response.json(); assert.equal(body.success,true); assert.ok(Array.isArray(body.data.items)); return body.data; }
(async()=>{
 const all=await search({page:'0'}); const names=all.items[0];
 for(const sort of ['newest','price-asc','price-desc','area-desc']){const page=await search({sort});if(sort==='price-asc')assert.ok(page.items.every((x,i)=>!i||Number(page.items[i-1].price)<=Number(x.price)));if(sort==='price-desc')assert.ok(page.items.every((x,i)=>!i||Number(page.items[i-1].price)>=Number(x.price)));if(sort==='area-desc')assert.ok(page.items.every((x,i)=>!i||Number(page.items[i-1].areaSqm)>=Number(x.areaSqm)));}
 for(const price of ['under-15','15-25','25-35','above-35']){const page=await search({price});assert.ok(page.items.every(x=>price==='under-15'?x.price<1500000:price==='15-25'?x.price>=1500000&&x.price<=2500000:price==='25-35'?x.price>2500000&&x.price<=3500000:x.price>3500000));}
 for(const type of ['khep-kin','chung-cu-mini','gac-lung'])await search({type});for(const location of ['tan-xa','thach-hoa','binh-yen','cnc'])await search({location});
 await search({amenities:'airConditioner,camera',type:'khep-kin',location:'tan-xa',availableOnly:'true',price:'15-25'});
 const vacant=await search({availableOnly:'true'});assert.ok(vacant.items.every(x=>x.availableRooms>0));
 if(names){for(const q of [names.roomTypeName,names.propertyName,names.address])if(q){const page=await search({q});assert.ok(page.totalElements>0);}}
 if(all.totalPages>1){const next=await search({page:'1'});assert.ok(!next.items.some(x=>all.items.some(y=>x.roomTypeId===y.roomTypeId)));}
 console.log(JSON.stringify({result:'passed',readOnly:true,total:all.totalElements,keywordSamples:Boolean(names),filters:['price','type','location','amenities','availableOnly'],sorts:4}));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
