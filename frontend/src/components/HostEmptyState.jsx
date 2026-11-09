import { Link } from 'react-router-dom';
import { House, Clock3 } from 'lucide-react';
import '../styles/host-empty-state.css';

/** One task and one primary action; optional guidance stays out of the way. */
export default function HostEmptyState({id,title,description,action,hint,pending=false,children}) {
  const Icon=pending?Clock3:House;
  return <section id={id} className={`host-empty-state${pending?' is-pending':''}`} aria-label={title}>
    <span className="host-empty-symbol" aria-hidden="true"><Icon size={27} strokeWidth={1.6}/></span>
    <div className="host-empty-copy"><h2>{title}</h2><p>{description}</p>
      {action&&<Link className="host-empty-action" to={action.to}>{action.label}</Link>}
      {hint&&<p className="host-empty-hint">{hint}</p>}
      {children}
    </div>
  </section>;
}
