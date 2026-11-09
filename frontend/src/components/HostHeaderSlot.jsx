import { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';

export const HostHeaderTarget = createContext(null);

/** The page owns its data/actions; the portal layout owns header placement. */
export default function HostHeaderSlot({children}) {
  const target=useContext(HostHeaderTarget);
  return target?createPortal(children,target):null;
}
