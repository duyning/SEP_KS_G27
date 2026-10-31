import { useEffect, useId, useRef, useState } from 'react';
import '../styles/community-post-description.css';

export default function CommunityPostDescription({ content, className = 'community-feed-description' }) {
  const id = useId();
  const text = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [long, setLong] = useState(false);
  useEffect(() => { setExpanded(false); }, [content]);
  useEffect(() => {
    const element = text.current;
    const measure = () => {
      const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
      setLong(element.scrollHeight > lineHeight * 5 + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [content]);
  return <div className="community-post-description">
    <p id={id} ref={text} className={`${className}${expanded ? '' : ' community-description-collapsed'}`}>{content}</p>
    {long && <button type="button" className="community-description-toggle" aria-expanded={expanded}
      aria-controls={id} onClick={() => setExpanded(value => !value)}>{expanded ? 'Thu gọn' : 'Xem thêm'}</button>}
  </div>;
}
