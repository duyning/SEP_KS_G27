import { useEffect, useRef } from 'react';
import { motion, useIsPresent } from 'motion/react';
import { AnimateUIProvider } from '@animate-ui/react/provider';
import { ReducedMotionConfig, useMotionTokens, useShouldReduceMotion } from '@animate-ui/react/utils/motion';
export { Button as MotionButton } from '@animate-ui/react/primitives/buttons/button';
export { AnimatePresence } from 'motion/react';

// One pace for all portals. No route/content entrance or API timing lives here.
export function AppMotionProvider({ children }) {
  useEffect(() => {
    const selector = '.spin,.animate-spin,.btn-spinner,.loading-spinner,.svcd-spinner,.spinning svg';
    const visible = new Map();
    const update = () => visible.forEach((inView, element) => {
      if (!element.isConnected) { observer.unobserve(element); visible.delete(element); }
      else element.style.animationPlayState = !document.hidden && inView ? 'running' : 'paused';
    });
    const observer = new IntersectionObserver(entries => { entries.forEach(entry => visible.set(entry.target, entry.isIntersecting)); update(); });
    const scan = root => {
      const elements = [...(root.matches?.(selector) ? [root] : []), ...root.querySelectorAll(selector)];
      elements.forEach(element => { if (!visible.has(element)) { visible.set(element, false); element.style.animationPlayState = 'paused'; observer.observe(element); } });
    };
    const mutations = new MutationObserver(records => {
      records.forEach(record => {
        if (record.type === 'attributes') scan(record.target);
        else record.addedNodes.forEach(node => { if (node.nodeType === 1) scan(node); });
      });
      update();
    });
    scan(document.getElementById('root'));
    mutations.observe(document.getElementById('root'), { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', update);
    return () => { mutations.disconnect(); observer.disconnect(); document.removeEventListener('visibilitychange', update); visible.forEach((_, element) => element.style.removeProperty('animation-play-state')); };
  }, []);
  return <AnimateUIProvider tempo={0.85}><ReducedMotionConfig>{children}</ReducedMotionConfig></AnimateUIProvider>;
}

export function useSurfaceMotion(kind = 'dialog') {
  const reduce = useShouldReduceMotion();
  const { spring, transition, scale } = useMotionTokens();
  const hidden = { opacity: 0, transform: reduce ? 'none' : `scale(${kind === 'menu' ? scale.menu : kind === 'toast' ? scale.toast : scale.dialog})` };
  return {
    initial: hidden,
    animate: { opacity: 1, transform: reduce ? 'none' : 'scale(1)', transition: kind === 'menu' ? transition.menu : { ...(kind === 'toast' ? spring.toast : spring.dialog), opacity: transition.fade }, transitionEnd: { transform: 'none' } },
    exit: { ...hidden, transition: transition.dismiss },
  };
}

// Preserve native top-layer modality, Escape, labels and browser focus trapping.
// Presence retains only the departing surface; the API/state updates immediately.
export function MotionDialog({ children, ...props }) {
  const ref = useRef(null);
  const trigger = useRef(null);
  const leaving = useRef(false);
  const present = useIsPresent();
  const surface = useSurfaceMotion();
  useEffect(() => {
    const dialog = ref.current;
    trigger.current = document.activeElement;
    if (!dialog.open) dialog.showModal();
    return () => { const hadFocus = dialog.contains(document.activeElement); dialog.close(); if ((hadFocus || document.activeElement === document.body) && trigger.current?.isConnected) trigger.current.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    if (present && leaving.current) {
      const dialog = ref.current;
      leaving.current = false;
      dialog.close();
      dialog.inert = false;
      for (const property of ['position','margin','left','top','width','z-index']) dialog.style.removeProperty(property);
      dialog.showModal();
    }
    if (!present) {
      leaving.current = true;
      ref.current.inert = true;
      const rect = ref.current.getBoundingClientRect();
      // Release the top layer at exit start; no invisible focus trap.
      ref.current.close();
      ref.current.setAttribute('open', '');
      Object.assign(ref.current.style, { position: 'fixed', margin: '0', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, zIndex: '1000' });
      if (trigger.current?.isConnected) trigger.current.focus({ preventScroll: true });
    }
  }, [present]);
  return <motion.dialog {...props} {...surface} ref={ref} data-ui-motion="dialog" aria-hidden={present ? undefined : true}>{children}</motion.dialog>;
}

export function MotionMenu({ children, ...props }) {
  const present = useIsPresent();
  return <motion.div {...props} {...useSurfaceMotion('menu')} inert={!present || undefined} style={{ ...props.style, transformOrigin: 'top right' }} data-ui-motion="menu">{children}</motion.div>;
}

export function MotionToast({ children, ...props }) {
  const ref = useRef(null);
  const trigger = useRef(null);
  const present = useIsPresent();
  useEffect(() => { trigger.current = document.activeElement; }, []);
  useEffect(() => { if (!present && ref.current?.contains(document.activeElement) && trigger.current?.isConnected) trigger.current.focus({ preventScroll:true }); }, [present]);
  return <motion.div {...props} {...useSurfaceMotion('toast')} ref={ref} inert={!present || undefined} data-ui-motion="toast">{children}</motion.div>;
}
