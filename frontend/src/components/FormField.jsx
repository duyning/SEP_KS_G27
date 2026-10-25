import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function FormField({ name, label, icon: Icon, type = 'text', error, ...props }) {
  const [visible, setVisible] = useState(false);
  const password = type === 'password';
  return <div className="field"><label htmlFor={name}>{label}</label><div className={`input-wrap ${error ? 'invalid' : ''}`}>
    {Icon && <Icon className="field-icon" size={18} aria-hidden="true" />}
    <input id={name} name={name} type={password && visible ? 'text' : type} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} {...props} />
    {password && <button type="button" className="password-toggle" onClick={() => setVisible(value => !value)} aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} title={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={visible}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>}
  </div>{error && <p id={`${name}-error`} className="field-error">{error}</p>}</div>;
}
