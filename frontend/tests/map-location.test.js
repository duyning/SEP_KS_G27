import test from 'node:test';
import assert from 'node:assert/strict';
import { roomCoordinates, directionsUrl, accommodationDetailUrl } from '../src/services/map-location.js';

test('map uses persisted coordinates including zero and boundary values', () => {
  assert.deepEqual(roomCoordinates({latitude: 21.018812, longitude: 105.521512}), [21.018812, 105.521512]);
  assert.deepEqual(roomCoordinates({latitude: 0, longitude: 0}), [0, 0]);
  assert.deepEqual(roomCoordinates({latitude: 0.0000001, longitude: -0.0000001}), [0.0000001, -0.0000001]);
  assert.deepEqual(roomCoordinates({latitude: -90, longitude: 180}), [-90, 180]);
});
test('legacy, partial, malformed and out-of-range locations have no pin or directions', () => {
  for (const room of [null, {}, {latitude: null, longitude: null}, {latitude: '', longitude: ''},
    {latitude: 21}, {latitude: 91, longitude: 105}, {latitude: 21, longitude: 181},
    {latitude: NaN, longitude: 105}, {latitude: Infinity, longitude: 105},
    {latitude: '0x15', longitude: 105}]) {
    assert.equal(roomCoordinates(room), null);
    assert.equal(directionsUrl(room?.latitude, room?.longitude), null);
  }
});
test('directions and detail links keep exact coordinates and existing route IDs', () => {
  assert.equal(directionsUrl(21.018812,105.521512), 'https://www.google.com/maps/dir/?api=1&destination=21.018812,105.521512');
  assert.equal(accommodationDetailUrl({propertyId:12,roomTypeId:34}), '/properties/detail?propertyId=12&roomTypeId=34');
});
