import { request } from './auth.js';

const basePath = '/api/host/rooms';
const path = (roomId, key) => `/${roomId}/tenancies${key ? `/${encodeURIComponent(key)}` : ''}`;

export const roomTenanciesApi = {
  load: (roomId, signal) => request(path(roomId), { basePath, signal }),
  start: (roomId, body, signal) => request(path(roomId), { basePath, method: 'POST', body, signal }),
  add: (roomId, key, body, signal) =>
    request(`${path(roomId, key)}/occupants`, { basePath, method: 'POST', body, signal }),
  leave: (roomId, key, personId, date, signal) =>
    request(`${path(roomId, key)}/occupants/${personId}/leave`, { basePath, method: 'POST', body: { date }, signal }),
  close: (roomId, key, date, signal) =>
    request(`${path(roomId, key)}/close`, { basePath, method: 'POST', body: { date }, signal }),
};
