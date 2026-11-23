import {useEffect,useRef,useState} from 'react';
import {Sparkles,LoaderCircle} from 'lucide-react';
import {MotionButton} from './motion/MotionUI.jsx';
import {descriptionFacts,getPropertyDescriptionSuggestion} from '../services/property-writing.js';
import '../styles/property-writing.css';

export default function PropertyDescriptionAssist({form, onApply, disabled = false}) {
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [error, setError] = useState('');
  const pending = useRef(null);
  const facts = descriptionFacts(form);
  const factsKey = JSON.stringify(facts);

  useEffect(() => {
    setBusy(false);
    setSuggestion(null);
    setError('');
    return () => {
      pending.current?.abort();
      pending.current = null;
    };
  }, [factsKey, disabled]);

  async function generate() {
    if (disabled || pending.current) return;
    if (facts.name.length < 3 || facts.propertyType.length < 2) {
      setError('Nhập tên và loại hình nhà trọ trước khi tạo gợi ý.');
      return;
    }

    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError('');
    setSuggestion(null);

    try {
      const next = await getPropertyDescriptionSuggestion(form, controller.signal);
      if (pending.current === controller) setSuggestion({...next, factsKey});
    } catch (cause) {
      if (pending.current === controller) setError(cause.message);
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  }

  const preview = !disabled && suggestion?.factsKey === factsKey ? suggestion : null;
  const previewTitle = preview?.source === 'form' ? 'Bản nháp từ thông tin đã nhập' : 'Gợi ý từ AI';

  return (
    <div className="property-writing">
      <MotionButton className="p-button" type="button" onClick={generate} disabled={disabled || busy}>
        {busy ? <LoaderCircle size={16} className="spin" aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
        {busy ? 'AI đang viết…' : 'Tạo mô tả bằng AI'}
      </MotionButton>
      <small>AI dùng thông tin đã nhập. Hãy kiểm tra gợi ý trước khi sử dụng.</small>
      {busy && <p role="status">Đang tạo gợi ý mô tả…</p>}
      {error && <p className="registration-error" role="alert">{error}</p>}
      {preview && (
        <section className="property-writing-preview" aria-label={previewTitle}>
          <strong role="status">{previewTitle}</strong>
          {preview.notice && <p><small>{preview.notice}</small></p>}
          <p>{preview.description}</p>
          {form.description && <small>Dùng gợi ý sẽ thay nội dung mô tả đang có.</small>}
          <div>
            <MotionButton type="button" className="p-button primary" onClick={() => {
              onApply(preview.description);
              setSuggestion(null);
            }}>Dùng mô tả này</MotionButton>
            <MotionButton type="button" className="p-button" onClick={() => setSuggestion(null)}>Bỏ gợi ý</MotionButton>
          </div>
        </section>
      )}
    </div>
  );
}
