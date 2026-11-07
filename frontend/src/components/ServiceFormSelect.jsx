import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export default function ServiceFormSelect({ label, name, value, options, onChange, placeholder = 'Chọn danh mục', required = false, error }) {
  const id = useId(); const root = useRef(null); const trigger = useRef(null);
  const [open, setOpen] = useState(false); const [active, setActive] = useState(0);
  const selected = options.findIndex(option => String(option.value) === String(value));
  useEffect(() => {
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  useEffect(() => { if (open) root.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [open, active]);
  function choose(index) {
    if (!options[index]) return;
    onChange({ target: { name, value: String(options[index].value) } }); setOpen(false); trigger.current?.focus();
  }
  function keyDown(event) {
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); return; }
    if (event.key === 'Tab') { setOpen(false); return; }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (!open) { setOpen(true); setActive(Math.max(0, selected)); return; }
      setActive(index => event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : Math.max(0, Math.min(options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
    } else if (open && ['Enter', ' '].includes(event.key)) { event.preventDefault(); choose(active); }
  }
  return <div className="svc-select-field" ref={root}>
    <label id={`${id}-label`} onClick={() => trigger.current?.focus()}>{label}{required && <span className="svc-required"> *</span>}</label>
    <button ref={trigger} type="button" className={`svc-select-trigger${open ? ' is-open' : ''}`} role="combobox" aria-labelledby={`${id}-label`}
      name={name} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
      aria-expanded={open} aria-controls={`${id}-list`} aria-haspopup="listbox" aria-required={required}
      aria-activedescendant={open && options.length ? `${id}-option-${active}` : undefined}
      onKeyDown={keyDown} onClick={() => { setActive(Math.max(0, selected)); setOpen(previous => !previous); }}>
      <span className={selected < 0 ? 'svc-select-placeholder' : ''}>{selected < 0 ? placeholder : options[selected].label}</span><ChevronDown size={18} />
    </button>
    {open && <div className="svc-select-menu" role="listbox" id={`${id}-list`} aria-labelledby={`${id}-label`}>
      {options.map((option, index) => <div key={option.value} id={`${id}-option-${index}`} role="option" aria-selected={selected === index}
        className={`svc-select-option${active === index ? ' is-active' : ''}`} data-index={index}
        onPointerMove={() => setActive(index)} onMouseDown={event => event.preventDefault()} onClick={() => choose(index)}>
        <span>{option.label}</span>{selected === index && <Check size={17} />}
      </div>)}
      {!options.length && <div className="svc-select-empty">Chưa có danh mục</div>}
    </div>}
    {error && <small id={`${id}-error`} className="svc-field-error" role="alert">{error}</small>}
  </div>;
}
