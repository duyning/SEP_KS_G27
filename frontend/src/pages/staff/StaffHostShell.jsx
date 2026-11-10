import '../../styles/staff-host-prototype.css';
import '../../styles/staff-host-integration.css';
import '../../styles/staff-host-decision-modal.css';
import '../../styles/staff-host-workspace.css';
import { motion } from 'motion/react';
import { useMotionTokens, useShouldReduceMotion } from '@animate-ui/react/utils/motion';
import {
  applicationLabels,
  applicationBadgeTones,
  formatApplicationDate,
  formatRelativeTime,
  isLongPendingApplication,
  formatProcessedBreakdown,
  isKpiStatusActive
} from '../../services/staff-host-applications.js';

export {
  applicationLabels,
  applicationBadgeTones,
  formatApplicationDate as date,
  formatRelativeTime as relativeTime,
  isLongPendingApplication as isLongPending,
  formatProcessedBreakdown,
  isKpiStatusActive
};

export function HostApplicationStatus({ status }) {
  const tone = applicationBadgeTones[status] || '';
  return (
    <span className={`shr-status-badge ${tone}`}>
      <span className="dot" />
      {applicationLabels[status] || status}
    </span>
  );
}

// Navigation and topbar come from PortalLayout, shared by every Staff screen.
export default function StaffHostShell({ children }) {
  const { transition } = useMotionTokens();
  const reduce = useShouldReduceMotion();
  return (
    <motion.div
      initial={{ opacity: reduce ? 1 : 0.95 }}
      animate={{ opacity: 1, transition: transition.fade }}
      className="hr-staff staff-body hr-staff-content-only"
    >
      {children}
    </motion.div>
  );
}
