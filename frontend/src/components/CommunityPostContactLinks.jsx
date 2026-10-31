import { ExternalLink } from 'lucide-react';
import { validPostContactLink } from '../services/community.js';
import '../styles/community-post-contacts.css';

export default function CommunityPostContactLinks({ post, asFacts = false }) {
  const contacts = [['facebook', 'Facebook', post.facebookUrl], ['zalo', 'Zalo', post.zaloUrl]]
    .filter(([platform, , url]) => url?.trim() && validPostContactLink(url, platform));
  if (!contacts.length) return null;
  if (asFacts) return <>{contacts.map(([platform, label, url]) => <div key={platform} className="community-social-contact-fact">
    <dt>{label}</dt><dd><a href={url.trim()} target="_blank" rel="noopener noreferrer"
      aria-label={`Liên hệ qua ${label} (mở tab mới)`}>Liên hệ qua {label}<ExternalLink size={14} aria-hidden="true" /></a></dd>
  </div>)}</>;
  return <div className="community-post-contact-links" aria-label="Liên hệ qua mạng xã hội">
    {contacts.map(([platform, label, url]) => <a key={platform} href={url.trim()} target="_blank" rel="noopener noreferrer"
      aria-label={`Liên hệ qua ${label} (mở tab mới)`}>{label}<ExternalLink size={14} aria-hidden="true" /></a>)}
  </div>;
}
