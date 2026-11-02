import {canAccess, landingFor, screens} from './screens.js';

// A remembered URL belongs to the new authenticated actor only if its route is allowed.
export function sessionDestination(user, from) {
  if (!user || typeof from !== 'string' || !from.startsWith('/') || /[\\\u0000-\u0020]/.test(from) || from.startsWith('//')) return landingFor(user);
  let url;
  try {url = new URL(from, 'https://hlrcs.local');} catch {return landingFor(user);}
  if (url.origin !== 'https://hlrcs.local') return landingFor(user);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const screen = screens.find(item => item.path === path || item.source && `/${item.source}` === path);
  if (!screen || screen.kind === 'auth' || !canAccess(screen.portal, user)) return landingFor(user);
  // Retain an authorized deep link, including the canonical source for legacy HTML routes.
  return `${screen.path}${url.search}${url.hash}`;
}
