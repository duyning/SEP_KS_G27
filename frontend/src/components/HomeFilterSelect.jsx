import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {Check, ChevronDown} from 'lucide-react';

export default function HomeFilterSelect({id, value, options, onChange}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef(null);
  const list = useRef(null);
  const [menu, setMenu] = useState({above:false, maxHeight:260});
  const selected = Math.max(0, options.findIndex(option => option.value === value));
  const search = useRef({text:'', time:0});
  useEffect(() => {
    if (!open) return;
    const close = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      const rect = root.current.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 24, above = rect.top - 24;
      const opensAbove = below < 140 && above > below;
      setMenu({above:opensAbove,maxHeight:Math.max(80,Math.min(260,opensAbove ? above : below))});
    };
    position();
    window.addEventListener('resize',position);
    window.addEventListener('scroll',position,true);
    return () => {window.removeEventListener('resize',position);window.removeEventListener('scroll',position,true);};
  }, [open]);
  useLayoutEffect(() => {
    const option = open && document.getElementById(`${id}-option-${active}`);
    const container = list.current;
    if (!option || !container) return;
    // Scroll only the options, never the whole page or the hero's ancestors.
    if (option.offsetTop < container.scrollTop) container.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > container.scrollTop + container.clientHeight)
      container.scrollTop = option.offsetTop + option.offsetHeight - container.clientHeight;
  }, [open, active, id, menu.maxHeight]);
  const choose = index => {
    onChange({target:{id, value:options[index].value}});
    setOpen(false);
  };
  const onKeyDown = event => {
    if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
      setActive(event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : !open ? selected : (active + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) choose(active); else { setActive(selected); setOpen(true); }
    } else if (event.key === 'Escape') {
      event.preventDefault(); setOpen(false);
    } else if (event.key === 'Tab') {
      setOpen(false);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      search.current.text = (Date.now() - search.current.time < 700 ? search.current.text : '') + event.key.toLocaleLowerCase('vi');
      search.current.time = Date.now();
      const index = options.findIndex(option => option.label.toLocaleLowerCase('vi').startsWith(search.current.text));
      if (index >= 0) { event.preventDefault(); setActive(index); setOpen(true); }
    }
  };
  return <div className="home-filter-select" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button type="button" id={id} className="home-filter-trigger" role="combobox" aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-options`} aria-activedescendant={open ? `${id}-option-${active}` : undefined} onKeyDown={onKeyDown} onClick={() => {setActive(selected);setOpen(previous => !previous);}}>
      <span id={`${id}-value`}>{options[selected].label}</span><ChevronDown size={18} aria-hidden="true"/>
    </button>
    {open && <div ref={list} id={`${id}-options`} className={`home-filter-options${menu.above ? ' opens-above' : ''}`} style={{maxHeight:menu.maxHeight}} role="listbox" aria-labelledby={`${id}-label`}>
      {options.map((option, index) => <div key={option.value} id={`${id}-option-${index}`} role="option" aria-selected={value === option.value} className={`home-filter-option ${active === index ? 'is-active' : ''}`} onPointerMove={() => setActive(index)} onPointerDown={event => event.preventDefault()} onClick={() => choose(index)}>
        <span>{option.label}</span>{value === option.value && <Check size={17} aria-hidden="true"/>}
      </div>)}
    </div>}
  </div>;
}
