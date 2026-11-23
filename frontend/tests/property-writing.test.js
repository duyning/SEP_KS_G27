import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPropertyDescriptionDraft,descriptionFacts,getPropertyDescriptionSuggestion} from '../src/services/property-writing.js';
import {createPropertyForm,validatePropertyStep,restorePropertyDraft,propertyDraft} from '../src/services/property-registration.js';
test('custom property type survives validation and text-only draft roundtrip',()=>{const form={...createPropertyForm({fullName:'Chủ trọ',phoneNumber:'0912345678'}),name:'Nhà trọ thử nghiệm',propertyType:'Ký túc xá tư nhân',description:'Thông tin nhà trọ thử nghiệm đầy đủ để xét duyệt.'};assert.deepEqual(validatePropertyStep(form,0),{});assert.equal(restorePropertyDraft(JSON.stringify(propertyDraft(form)),{}).propertyType,'Ký túc xá tư nhân');for(const value of ['', 'a','a'.repeat(101),'Loại\nkhác'])assert.ok(validatePropertyStep({...form,propertyType:value},0).propertyType);});
test('AI facts omit contact, identifiers, documents, images and coordinates',()=>{const form={...createPropertyForm(),name:'Nhà trọ thử nghiệm',propertyType:'Ký túc xá tư nhân',managerName:'private-name',contactPhone:'0912345678',documents:{idCard:'private-document'},photos:['private-image'],latitude:'21.01',amenities:['wifi'],selectedRules:['noSmoking']};const facts=descriptionFacts(form);assert.deepEqual(Object.keys(facts).sort(),['name','propertyType','commune','nearby','amenities','rules','existingDescription'].sort());assert.ok(facts.amenities.length===1);assert.equal(JSON.stringify(facts).includes('private-'),false);});

const form = {
  name: 'Nhà trọ thử nghiệm', propertyType: 'Ký túc xá tư nhân', commune: 'Tân Xã',
  nearby: 'Chợ Tân Xã.', amenities: ['parking'], selectedRules: ['quietHours:22:30'],
  description: 'Mô tả hiện tại.', contactPhone: '0912345678', photos: ['private-image'],
};

globalThis.sessionStorage = {getItem: () => null};
globalThis.localStorage = {getItem: () => null};

test('local drafts use form facts and work with only a valid name and type', () => {
  const draft = buildPropertyDescriptionDraft(form);
  for (const fact of ['Tân Xã', 'Chợ Tân Xã.', 'Bãi để xe máy có mái che', 'Giữ trật tự sau 22h30']) {
    assert.ok(draft.includes(fact), fact);
  }
  for (const unused of ['Mô tả hiện tại.', '0912345678', 'private-image', '..']) {
    assert.ok(!draft.includes(unused), unused);
  }
  const minimalDraft = buildPropertyDescriptionDraft({name: 'ABC', propertyType: 'XY'});
  assert.ok(minimalDraft.length >= 30 && minimalDraft.length <= 2000);
  assert.equal(buildPropertyDescriptionDraft({name: '', propertyType: 'XY'}), '');
});

test('AI success stays distinct from local drafts used after provider errors or offline', async t => {
  const description = 'Mô tả gợi ý được trả về cho nhà trọ thử nghiệm.';
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({success: true, data: {description}}));
  const suggest = () => getPropertyDescriptionSuggestion(form, new AbortController().signal);
  assert.deepEqual(await suggest(), {source: 'ai', description});

  for (const status of [429, 503]) {
    fetch.mock.mockImplementation(async () => Response.json({success: false}, {status}));
    const result = await suggest();
    assert.equal(result.source, 'form');
    assert.equal(result.description, buildPropertyDescriptionDraft(form));
  }

  fetch.mock.mockImplementation(async () => { throw new TypeError('Offline'); });
  assert.equal((await suggest()).source, 'form');
  fetch.mock.mockImplementation(async () => Response.json({success: true, data: {description: 'Too short'}}));
  assert.equal((await suggest()).source, 'form');

  fetch.mock.mockImplementation(async () => Response.json({success: false}, {status: 403}));
  await assert.rejects(suggest(), {status: 403});
});

test('a slow response yields a local draft once and the pending request is aborted', async t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  let requestSignal;
  t.mock.method(globalThis, 'fetch', (_url, options) => {
    requestSignal = options.signal;
    return new Promise(() => {});
  });
  const suggestion = getPropertyDescriptionSuggestion(form, new AbortController().signal);
  t.mock.timers.tick(5000);
  assert.equal((await suggestion).source, 'form');
  assert.equal(requestSignal.aborted, true);
});

test('changing the form cancels AI without returning a draft for stale facts', async t => {
  t.mock.method(globalThis, 'fetch', (_url, {signal}) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), {once: true});
  }));
  const controller = new AbortController();
  const pending = getPropertyDescriptionSuggestion(form, controller.signal);
  controller.abort();
  await assert.rejects(pending, {name: 'AbortError'});
});
