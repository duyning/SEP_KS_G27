import { ExternalLink, Facebook, MessageSquare } from 'lucide-react';
import { validPostContactLink } from '../services/community.js';
import '../styles/community-post-contacts.css';

export default function CommunityPostContactLinks({ post, asFacts = false }) {
  const contacts = [['facebook', 'Facebook', post.facebookUrl], ['zalo', 'Zalo', post.zaloUrl]]
    .filter(([platform, , url]) => url?.trim() && validPostContactLink(url, platform));
  if (!contacts.length) return null;

  const links = contacts.map(([platform, label, url]) => {
    const link = (
      <a key={platform} href={url.trim()} target="_blank" rel="noopener noreferrer"
        aria-label={`Liên hệ qua ${label} (mở tab mới)`}>
        {platform === 'facebook' ? <Facebook size={16} aria-hidden="true" /> : (
          <MessageSquare size={16} aria-hidden="true">
            <path d="M9 7h6l-6 6h6" />
          </MessageSquare>
        )}
        <span>Liên hệ qua {label}</span>
        <ExternalLink size={14} aria-hidden="true" />
      </a>
    );
    if (!asFacts) return link;
    return (
      <div key={platform} className="community-social-contact-fact">
        <dt>{label}</dt>
        <dd>{link}</dd>
      </div>
    );
  });

  if (asFacts) return <>{links}</>;
  return <div className="community-post-contact-links" aria-label="Liên hệ qua mạng xã hội">{links}</div>;
}
