import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useMotionTokens, useShouldReduceMotion } from '@animate-ui/react/utils/motion';
import {
  HOST_MANAGEMENT_TABS,
  HostManagementChrome,
  HostWorkspaceContext,
} from '../../components/HostManagementShell.jsx';
import HostPropertyPage from './HostPropertyPage.jsx';
import HostRoomTypesPage from './HostRoomTypesPage.jsx';
import HostRoomsPage from './HostRoomsPage.jsx';
import '../../styles/host-management-saas.css';

export default function HostManagementWorkspace({ activePath }) {
  const [actionTarget, setActionTarget] = useState(null);
  const reduce = useShouldReduceMotion();
  const { transition, shift } = useMotionTokens();

  const currentIndex = Math.max(
    0,
    HOST_MANAGEMENT_TABS.findIndex(tab => tab.path === activePath)
  );
  const prevIndexRef = useRef(currentIndex);
  const direction = currentIndex >= prevIndexRef.current ? 1 : -1;

  useEffect(() => {
    prevIndexRef.current = currentIndex;
  }, [currentIndex]);

  const offsetX = reduce ? 0 : direction * (shift?.tabs || 12);

  return (
    <HostWorkspaceContext.Provider value={{ actionTarget, activePath }}>
      <div className="hm-workspace">
        <HostManagementChrome activePath={activePath} actionSlotRef={setActionTarget} />

        <div className="hm-workspace-stage">
          <motion.div
            key={activePath}
            className="hm-workspace-panel"
            data-ui-motion="tab-panel"
            initial={{
              opacity: 0,
              transform: reduce ? 'none' : `translateX(${offsetX}px)`,
            }}
            animate={{
              opacity: 1,
              transform: 'translateX(0px)',
              transition: reduce ? { duration: 0 } : transition.enter,
              transitionEnd: { transform: 'none' },
            }}
          >
            {activePath === '/host/property' && <HostPropertyPage />}
            {activePath === '/host/room-types' && <HostRoomTypesPage />}
            {activePath === '/host/rooms' && <HostRoomsPage />}
          </motion.div>
        </div>
      </div>
    </HostWorkspaceContext.Provider>
  );
}
