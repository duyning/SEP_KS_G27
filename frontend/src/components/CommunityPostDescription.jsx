import { createElement, useEffect, useId, useMemo, useRef, useState } from 'react';
import { readPostDocument } from '../services/community-text-format.js';
import '../styles/community-post-description.css';

const blockTags = { paragraph: 'p', bulletList: 'ul', orderedList: 'ol', listItem: 'li' };
const markTags = { bold: 'strong', italic: 'em', underline: 'u', textStyle: 'span' };

function renderNode(node, key) {
  if (node.type === 'hardBreak') return <br key={key} />;
  if (node.type === 'text') {
    return createElement('span', { key }, (node.marks || []).reduce((text, mark) => {
      const style = mark.type === 'textStyle' ? { fontSize: mark.attrs.fontSize } : undefined;
      return createElement(markTags[mark.type], { style }, text);
    }, node.text));
  }
  return createElement(blockTags[node.type], { key }, (node.content || []).map(renderNode));
}

export default function CommunityPostDescription({ content, contentFormat, className = 'community-feed-description' }) {
  const id = useId();
  const text = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [long, setLong] = useState(false);
  const doc = useMemo(() => readPostDocument(content, contentFormat), [content, contentFormat]);
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
  }, [content, contentFormat]);
  return <div className="community-post-description">
    <div id={id} ref={text} className={`${className} community-rich-text${expanded ? '' : ' community-description-collapsed'}`}>
      {doc.content?.map(renderNode)}
    </div>
    {long && <button type="button" className="community-description-toggle" aria-expanded={expanded}
      aria-controls={id} onClick={() => setExpanded(value => !value)}>{expanded ? 'Thu gọn' : 'Xem thêm'}</button>}
  </div>;
}
