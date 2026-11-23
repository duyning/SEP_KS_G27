import { Clock3, CircleCheck, TriangleAlert } from 'lucide-react';
import { availabilityPresentation } from '../services/availability.js';
import '../styles/availability.css';

export default function AvailabilityNotice({ value, label }) {
  const { state, text } = availabilityPresentation(value);
  const Icon = state === 'CURRENT' ? CircleCheck : state === 'STALE' ? TriangleAlert : Clock3;
  return <p className={`availability-notice availability-${state.toLowerCase()}`}>
    <Icon size={15} aria-hidden="true"/><span>{label ? `${label}: ` : ''}{text}</span>
  </p>;
}
