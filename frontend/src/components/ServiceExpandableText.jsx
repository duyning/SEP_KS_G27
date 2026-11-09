import { useId, useState } from 'react';

export default function ServiceExpandableText({ text, label }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const value = String(text || '');
  const preview = value.slice(0, 180).split('\n').slice(0, 3).join('\n');
  const long = preview.length < value.length;
  if (!value) return null;
  return <div className="svc-expandable-text">
    {label && <strong>{label}</strong>}
    <p id={id}>{expanded || !long ? value : preview.trimEnd() + '…'}</p>
    {long && <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(previous => !previous)}>{expanded ? 'Thu gọn' : 'Xem thêm'}</button>}
  </div>;
}
