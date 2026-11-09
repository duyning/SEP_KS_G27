export function CommunitySupportLinks() {
  return <>
    <a href="https://zalo.me/0912345678" target="_blank" rel="noopener noreferrer">Trợ giúp qua Zalo</a>
    <a href="tel:0912345678">Liên hệ hỗ trợ</a>
  </>;
}

export function CommunityMenuSupport() {
  return <li className="community-menu-support"><CommunitySupportLinks /></li>;
}

export default function CommunityFooter() {
  return <footer className="community-compact-footer">
    <div className="container">
      <strong>HL_RCS · Cộng đồng Hòa Lạc</strong>
      <nav aria-label="Liên hệ cộng đồng"><CommunitySupportLinks /></nav>
      <small>© {new Date().getFullYear()} HL_RCS</small>
    </div>
  </footer>;
}
