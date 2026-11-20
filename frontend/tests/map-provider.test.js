import test from 'node:test';
import assert from 'node:assert/strict';
import { selectMapProvider, vietmapStyleUrl, vietmapSatelliteUrl } from '../src/services/map-provider.js';

test('explicit providers cannot accidentally consume a different provider key', () => {
  const keys = { VITE_GOOGLE_MAPS_API_KEY: 'google-test', VITE_VIETMAP_API_KEY: 'vietmap-test' };
  assert.equal(selectMapProvider(keys), 'vietmap');
  for (const provider of ['google','vietmap','osm']) {
    assert.equal(selectMapProvider({ ...keys, VITE_MAP_PROVIDER: provider }), provider);
  }
  assert.equal(selectMapProvider({VITE_MAP_PROVIDER:'vietmap',VITE_GOOGLE_MAPS_API_KEY:'test'}),'osm');
  assert.equal(selectMapProvider({VITE_MAP_PROVIDER:'google',VITE_VIETMAP_API_KEY:'test'}),'osm');
  assert.equal(selectMapProvider({...keys,VITE_MAP_PROVIDER:'unknown'}),'osm');
  assert.equal(selectMapProvider({}), 'osm');
  assert.equal(selectMapProvider({VITE_GOOGLE_MAPS_API_KEY:'test'}),'google');
});

test('VietMap style and raster URLs keep coordinates/templates and encode only the key', () => {
  const key=' test&key ';
  assert.equal(vietmapStyleUrl(key),'https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=test%26key');
  assert.match(vietmapStyleUrl(key,'satellite'),/\/hm\/style\.json\?apikey=test%26key$/);
  assert.equal(vietmapSatelliteUrl(key),'https://maps.vietmap.vn/maps/tiles/st/{z}/{x}/{y}.png?apikey=test%26key');
  assert.throws(()=>vietmapSatelliteUrl(' '),/Chưa cấu hình/);
  assert.throws(()=>vietmapStyleUrl(''),/Chưa cấu hình/);
});
