import { parsePropertyCoordinates } from './property-registration.js';

export const roomCoordinates = room => {
  const { latitude, longitude } = room || {};
  if (typeof latitude === 'number' && typeof longitude === 'number')
    return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
      ? [latitude, longitude] : null;
  return parsePropertyCoordinates(latitude, longitude);
};
export function directionsUrl(latitude, longitude) {
  const point = roomCoordinates({ latitude, longitude });
  return point ? `https://www.google.com/maps/dir/?api=1&destination=${point.join(',')}` : null;
}
export const accommodationDetailUrl = room => `/properties/detail?propertyId=${room.propertyId}&roomTypeId=${room.roomTypeId}`;
