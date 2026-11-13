import { useEffect, useState } from 'react';
import '../styles/service-catalog.css';
import { ImageOff, Wrench } from 'lucide-react';
import { serviceRegistrationApi } from '../services/service-registration.js';

export default function ServicePhoto({ application, url, index = 0, alt = 'Ảnh dịch vụ', backdrop = false }) {
  const [source, setSource] = useState(url || ''); const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false); setSource(url || '');
    if (!application?.hasImage) return;
    const controller = new AbortController(); let objectUrl;
    serviceRegistrationApi.image(application.registrationId, controller.signal, index).then(blob => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob); setSource(objectUrl);
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url, index, application?.registrationId, application?.revision, application?.hasImage]);
  if (source && !failed && backdrop) return <span className="svc-photo-stage">
    <img className="svc-photo-backdrop" src={source} alt="" aria-hidden="true" />
    <img className="svc-photo-foreground" src={source} alt={alt} onError={() => setFailed(true)} />
  </span>;
  return source && !failed ? <img className="svc-photo" src={source} alt={alt} loading="lazy" onError={() => setFailed(true)} />
    : <div className="svc-photo svc-photo-placeholder">{failed ? <ImageOff size={38} /> : <Wrench size={38} />}<span>{failed ? 'Không tải được ảnh' : 'Dịch vụ Hòa Lạc'}</span></div>;
}
