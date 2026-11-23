import { useEffect, useRef } from 'react';

export default function useCommunityLive(types, refresh, postId = null) {
  const latest = useRef(refresh);
  latest.current = refresh;
  useEffect(() => {
    let timer;
    const receive = ({ detail }) => {
      if (detail?.type !== 'resync' && (!types.split(',').includes(detail?.type)
          || postId != null && detail.postId != null && Number(postId) !== detail.postId)) return;
      clearTimeout(timer);
      timer = setTimeout(() => latest.current(detail), 150);
    };
    window.addEventListener('hlrcs:community-live', receive);
    return () => { clearTimeout(timer); window.removeEventListener('hlrcs:community-live', receive); };
  }, [types, postId]);
}
