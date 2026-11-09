import { createContext, useContext, useEffect, useId, useMemo, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useAnimationControls } from 'motion/react';
import { Highlight, HighlightItem } from '@animate-ui/react/primitives/effects/highlight';
import { SlidingNumber } from '@animate-ui/react/primitives/texts/sliding-number';
import { useMotionTokens, useShouldReduceMotion, useTempoTransition } from '@animate-ui/react/utils/motion';
import { Building2, ChevronDown, DoorOpen, Layers, X } from 'lucide-react';
import HostDrawer from './HostDrawer.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { AnimatePresence, MotionButton } from './motion/MotionUI.jsx';
import { getHostWorkspaceMemory, updateHostWorkspaceMemory } from '../services/host-management.js';

export const HOST_MANAGEMENT_TABS = [
  { key: 'property', path: '/host/property', label: 'Nhà trọ của tôi', icon: Building2 },
  { key: 'room-types', path: '/host/room-types', label: 'Quản lý loại phòng', icon: Layers },
  { key: 'rooms', path: '/host/rooms', label: 'Danh sách phòng', icon: DoorOpen },
];

export const HostWorkspaceContext = createContext(null);

const subscribeToCompactFilters = listener => {
  const media = window.matchMedia('(max-width: 640px)');
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
};
const compactFiltersSnapshot = () => window.matchMedia('(max-width: 640px)').matches;
export const useCompactHostFilters = () => useSyncExternalStore(subscribeToCompactFilters, compactFiltersSnapshot, () => false);

// One set of controls, inline on desktop and in the existing modal sheet on phones.
export function HostFilterPanel({ open, onClose, triggerId, title = 'Bộ lọc phòng', children }) {
  const compact = useCompactHostFilters();
  const titleId = useId();
  const reduce = useShouldReduceMotion();
  const { transition } = useMotionTokens();
  useEffect(() => {
    if (!open || compact) return;
    const handleKey = event => { if (event.key === 'Escape') { event.preventDefault(); onClose(); document.getElementById(triggerId)?.focus(); } };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, compact, onClose, triggerId]);
  const close = () => { onClose(); document.getElementById(triggerId)?.focus(); };
  return <AnimatePresence initial={false}>{open && (compact ?
    <HostDrawer key="filter-sheet" title={title} onClose={close} side="bottom" className="hm-filter-drawer"
      footer={<MotionButton type="button" className="hm-btn hm-btn-primary" onClick={close}>Xem kết quả</MotionButton>}>
      <div className="hm-filter-fields">{children}</div>
    </HostDrawer> :
    <motion.section key="filter-panel" role="region" aria-labelledby={titleId} className="hm-filter-panel"
      initial={{ opacity: 0, height: reduce ? 'auto' : 0 }}
      animate={{ opacity: 1, height: 'auto', transition: reduce ? transition.fade : transition.disclosure }}
      exit={{ opacity: 0, height: reduce ? 'auto' : 0, transition: transition.dismiss }}>
      <div className="hm-filter-heading"><h3 id={titleId}>{title}</h3><MotionButton type="button" className="hm-icon-btn" aria-label="Đóng bộ lọc" onClick={close}><X size={16}/></MotionButton></div>
      <div className="hm-filter-fields">{children}</div>
    </motion.section>)}</AnimatePresence>;
}

// Keep results mounted (including image state and focused actions) during filter/view updates.
// Opacity is the only animated property; intrinsic grid/table sizing remains immediate.
export function HostResults({ revision, children }) {
  const controls = useAnimationControls();
  const reduce = useShouldReduceMotion();
  const { transition } = useMotionTokens();
  useEffect(() => {
    controls.set({ opacity: reduce ? 1 : 0.9 });
    if (!reduce) void controls.start({ opacity: 1, transition: transition.swap });
    return () => controls.stop();
  }, [revision, reduce, controls, transition.swap]);
  return <motion.div className="hm-results" initial={false} animate={controls}>{children}</motion.div>;
}

function resolveScopedTabHref(targetPath, selectedPropertyId) {
  if (!selectedPropertyId) return targetPath;
  if (targetPath === '/host/room-types' || targetPath === '/host/rooms') {
    return `${targetPath}?propertyId=${encodeURIComponent(selectedPropertyId)}`;
  }
  return targetPath;
}

export function HostManagementChrome({ activePath, actions, actionSlotRef }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { spring } = useMotionTokens();
  const selectionSpring = useTempoTransition(spring.selection);
  const tabRefs = useRef([]);

  const activeTab = useMemo(
    () => HOST_MANAGEMENT_TABS.find(tab => tab.path === activePath) || HOST_MANAGEMENT_TABS[0],
    [activePath]
  );

  const currentPropertyId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const fromQuery = params.get('propertyId') || params.get('id');
    if (fromQuery) return fromQuery;
    return getHostWorkspaceMemory(user?.userId).selectedPropertyId;
  }, [location.search, user?.userId]);

  const goToTab = tab => {
    if (!tab) return;
    if (tab.path === location.pathname && !new URLSearchParams(location.search).has('id') && !new URLSearchParams(location.search).has('registrationId')) {
      return;
    }
    navigate(resolveScopedTabHref(tab.path, currentPropertyId));
  };

  const handleTabKeyDown = (event, index) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const total = HOST_MANAGEMENT_TABS.length;
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % total;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + total) % total;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = total - 1;
    const target = HOST_MANAGEMENT_TABS[nextIndex];
    tabRefs.current[nextIndex]?.focus();
    goToTab(target);
  };

  return (
    <div className="hm-chrome">
      <header className="hm-header">
        <div className="hm-header-copy">
          <h1 className="hm-title">Quản lý nhà trọ</h1>
          <p className="hm-subtitle">Quản lý nhà trọ, loại phòng và tình trạng phòng của bạn.</p>
        </div>
        <div className="hm-header-actions" ref={actionSlotRef}>
          {actions}
        </div>
      </header>

      <div className="hm-tabs-bar">
        <Highlight
          value={activeTab.path}
          onValueChange={val => {
            const found = HOST_MANAGEMENT_TABS.find(tab => tab.path === val);
            if (found) goToTab(found);
          }}
          controlledItems
          transition={selectionSpring}
          className="hm-tab-highlight"
        >
          <div className="hm-tabs-list" role="tablist" aria-label="Điều hướng quản lý nhà trọ">
            {HOST_MANAGEMENT_TABS.map((tab, index) => {
              const Icon = tab.icon;
              const isSelected = activeTab.path === tab.path;
              return (
                <HighlightItem
                  key={tab.path}
                  value={tab.path}
                  activeClassName="is-active"
                  className="hm-tab-item"
                >
                  <button
                    ref={node => {
                      tabRefs.current[index] = node;
                    }}
                    type="button"
                    role="tab"
                    id={`hm-tab-${tab.key}`}
                    aria-selected={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    className={`hm-tab-btn ${isSelected ? 'is-active' : ''}`}
                    onClick={() => goToTab(tab)}
                    onKeyDown={event => handleTabKeyDown(event, index)}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span>{tab.label}</span>
                  </button>
                </HighlightItem>
              );
            })}
          </div>
        </Highlight>
      </div>
    </div>
  );
}

export function HostSummaryStrip({ metrics = [], ariaLabel = 'Thống kê nhanh' }) {
  const visible = metrics.filter(Boolean);
  if (!visible.length) return null;

  return (
    <section className="hm-kpi-strip" style={{ '--hm-metric-count': visible.length }} aria-label={ariaLabel}>
      {visible.map(metric => {
        const Icon = metric.icon;
        const isNumeric = typeof metric.value === 'number' && Number.isFinite(metric.value);
        const content = (
          <>
            <span className="hm-kpi-label">
              {Icon && <Icon size={14} aria-hidden="true" />}
              <span>{metric.label}</span>
            </span>
            <span className="hm-kpi-value-row">
              <strong className="hm-kpi-value">
                {isNumeric ? <SlidingNumber number={metric.value} initiallyStable /> : (metric.value ?? '—')}
              </strong>
              {metric.suffix && <small className="hm-kpi-suffix">{metric.suffix}</small>}
            </span>
          </>
        );

        const toneClass = metric.tone ? `tone-${metric.tone}` : '';
        if (typeof metric.onClick === 'function') {
          return (
            <MotionButton
              key={metric.key || metric.label}
              type="button"
              aria-pressed={Boolean(metric.active)}
              title={metric.hint || undefined}
              className={`hm-kpi-item is-interactive ${toneClass} ${metric.active ? 'is-active' : ''}`.trim()}
              onClick={metric.onClick}
            >
              {content}
            </MotionButton>
          );
        }

        return (
          <div
            key={metric.key || metric.label}
            title={metric.hint || undefined}
            className={`hm-kpi-item ${toneClass}`.trim()}
          >
            {content}
          </div>
        );
      })}
    </section>
  );
}

export function HostInlinePropertySelect({ properties = [], selectedPropertyId, label = 'Nhà trọ' }) {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  if (!properties.length) return null;

  const selected =
    properties.find(item => String(item.propertyId) === String(selectedPropertyId)) || properties[0];

  const handleChange = event => {
    const nextId = event.target.value;
    updateHostWorkspaceMemory(user?.userId, { selectedPropertyId: nextId });
    const nextParams = new URLSearchParams(params);
    nextParams.set('propertyId', nextId);
    nextParams.delete('roomTypeId');
    nextParams.delete('page');
    setParams(nextParams);
  };

  return (
    <label className="hm-prop-select" aria-label={`Chọn ${label.toLocaleLowerCase('vi')}`}>
      <Building2 size={15} className="hm-prop-select-icon" aria-hidden="true" />
      <span className="hm-prop-select-prefix">{label}:</span>
      <select value={String(selected?.propertyId ?? '')} onChange={handleChange}>
        {properties.map(item => (
          <option key={item.propertyId} value={String(item.propertyId)}>
            {item.name}
            {item.status !== 'ACTIVE' ? ' (Tạm ẩn)' : ''}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="hm-prop-select-caret" aria-hidden="true" />
    </label>
  );
}

export function HostSegmentedToggle({ value, onChange, options = [], ariaLabel = 'Chế độ hiển thị' }) {
  const { spring } = useMotionTokens();
  const selectionSpring = useTempoTransition(spring.selection);

  return (
    <Highlight
      value={value}
      onValueChange={val => val && onChange(val)}
      controlledItems
      transition={selectionSpring}
      className="hm-seg-highlight"
    >
      <div className="hm-seg-group" role="group" aria-label={ariaLabel}>
        {options.map(option => {
          const Icon = option.icon;
          const active = value === option.value;
          return (
            <HighlightItem
              key={option.value}
              value={option.value}
              activeClassName="is-active"
              className="hm-seg-item"
            >
              <button
                type="button"
                aria-pressed={active}
                title={option.title || option.label}
                aria-label={option.ariaLabel || option.label}
                className={`hm-seg-btn ${active ? 'is-active' : ''}`}
                onClick={() => onChange(option.value)}
              >
                {Icon && <Icon size={15} aria-hidden="true" />}
                {option.label && <span>{option.label}</span>}
              </button>
            </HighlightItem>
          );
        })}
      </div>
    </Highlight>
  );
}

export function HostManagementSkeleton({ kind = 'property' }) {
  const metricCount = kind === 'property' ? 5 : kind === 'rooms' ? 3 : 4;
  return (
    <div className="hm-skeleton-wrap" data-kind={kind} role="status" aria-live="polite" aria-label="Đang tải dữ liệu quản lý nhà trọ">
      <div className="hm-skel-strip" style={{ '--hm-metric-count': metricCount }}>
        {Array.from({ length: metricCount }, (_, index) => (
          <div key={index} className="hm-skel-pill" />
        ))}
      </div>
      <div className="hm-skel-toolbar" />
      {kind === 'rooms' ? (
        <div className="hm-skel-floors">
          {Array.from({ length: 3 }, (_, floorIdx) => (
            <div key={floorIdx} className="hm-skel-floor-card">
              <div className="hm-skel-floor-head" />
              <div className="hm-skel-tiles">
                {Array.from({ length: 6 }, (_, tileIdx) => (
                  <div key={tileIdx} className="hm-skel-tile" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="hm-skel-grid">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className={`hm-skel-card ${kind === 'room-types' ? 'is-compact' : ''}`} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HostManagementShell({
  activePath,
  actions = null,
  metrics = [],
  summaryLabel,
  children,
}) {
  const workspace = useContext(HostWorkspaceContext);
  const reduce = useShouldReduceMotion();
  const { transition, blur } = useMotionTokens();

  const animatedActions = actions ? (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={activePath}
        className="hm-actions-inner"
        data-ui-motion="header-actions"
        initial={{ opacity: 0, filter: reduce ? 'none' : `blur(${blur.icon}px)` }}
        animate={{
          opacity: 1,
          filter: 'blur(0px)',
          transition: transition.swap,
          transitionEnd: { filter: 'none' },
        }}
        exit={{ opacity: 0, transition: transition.dismiss }}
      >
        {actions}
      </motion.div>
    </AnimatePresence>
  ) : null;

  return (
    <div className="hm-shell" data-management-tab={activePath}>
      {workspace ? (
        workspace.actionTarget && animatedActions
          ? createPortal(animatedActions, workspace.actionTarget)
          : null
      ) : (
        <HostManagementChrome activePath={activePath} actions={animatedActions} />
      )}

      {metrics?.length > 0 && <HostSummaryStrip metrics={metrics} ariaLabel={summaryLabel} />}

      <div className="hm-shell-body">{children}</div>
    </div>
  );
}
