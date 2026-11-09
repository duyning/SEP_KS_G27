import { communityCategories, communitySorts, communityZones } from './community-prototype.js';

export function readFeedFilters(params) {
  return {
    category: communityCategories.some(([key]) => key === params.get('category')) ? params.get('category') : 'ALL',
    q: (params.get('q') || '').slice(0, 200),
    location: communityZones.some(([key]) => key === params.get('location')) ? params.get('location') : 'all',
    sort: communitySorts.some(([key]) => key === params.get('sort')) ? params.get('sort') : 'newest',
  };
}

export function appendFeedPosts(existing, incoming) {
  const ids = new Set(existing.map(post => post.id));
  return [...existing, ...incoming.filter(post => {
    if (ids.has(post.id)) return false;
    ids.add(post.id);
    return true;
  })];
}
