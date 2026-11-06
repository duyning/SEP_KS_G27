import { useEffect, useEffectEvent, useRef, useState } from 'react';

const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
let googleScript;

function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (!googleScript) {
    googleScript = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      const timeout = window.setTimeout(fail, 10000);

      function fail() {
        window.clearTimeout(timeout);
        script.remove();
        googleScript = undefined;
        reject(new Error('Không tải được đăng nhập Google. Vui lòng thử lại.'));
      }

      script.onload = () => {
        const identity = window.google?.accounts?.id;
        if (!identity) { fail(); return; }
        window.clearTimeout(timeout);
        resolve(identity);
      };
      script.onerror = fail;
      document.head.append(script);
    });
  }
  return googleScript;
}

export default function GoogleSignIn({ onCredential, disabled }) {
  const container = useRef(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const receiveCredential = useEffectEvent(onCredential);

  useEffect(() => {
    if (!clientId) return;
    const button = container.current;
    let active = true;

    loadGoogleIdentity().then(identity => {
      if (!active) return;

      // Lấy chiều rộng của container để ép iframe của Google giãn 100%
      const containerWidth = button.offsetWidth || 340;

      identity.initialize({
        client_id: clientId,
        callback: ({ credential }) => {
          if (active) receiveCredential(credential);
        },
      });

      // Thêm thuộc tính width vào cấu hình renderButton
      identity.renderButton(button, {
        theme: 'outline',
        size: 'large',
        locale: 'vi',
        width: containerWidth
      });
    }).catch(() => {
      if (active) setError('Không tải được đăng nhập Google.');
    });

    return () => {
      active = false;
      button.replaceChildren();
    };
  }, [attempt]);

  if (!clientId) return null;

  return (
      <div style={{ width: '100%', margin: '1.5rem 0' }}>
        {/* Đường kẻ ngang phía trên */}
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '0 0 1.5rem 0' }} />

        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div ref={container} inert={disabled} style={{ width: '100%', display: 'flex', justifyContent: 'center' }} />
        </div>

        {error && (
            <p role="alert" style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.75rem', textAlign: 'center' }}>
              {error}{' '}
              <button className="flip-trigger-btn" type="button" disabled={disabled} onClick={() => {
                setError('');
                setAttempt(value => value + 1);
              }}>Thử lại</button>
            </p>
        )}

        {/* Đường kẻ ngang phía dưới */}
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0 0 0' }} />
      </div>
  );
}