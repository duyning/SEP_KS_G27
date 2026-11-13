import { Children, cloneElement, isValidElement, useId } from 'react';
export default function Field({ label, helper, error, children, className = '', htmlFor, ...props }) {
  const generated = useId();
  const control = Children.toArray(children).find(child => isValidElement(child) && ['input', 'select', 'textarea'].includes(child.type));
  const id = htmlFor || control?.props.id || generated, messageId = id + '-message';
  const controls = label ? Children.map(children, child => isValidElement(child) && ['input', 'select', 'textarea'].includes(child.type)
    ? cloneElement(child, { id: child.props.id || id, 'aria-invalid': error ? true : child.props['aria-invalid'], 'aria-describedby': [child.props['aria-describedby'], (error || helper) && messageId].filter(Boolean).join(' ') || undefined }) : child) : children;
  return <label className={'ui-field ' + className} htmlFor={htmlFor || (label ? id : undefined)} {...props}>{label && <span className="ui-field-label">{label}</span>}{controls}{(error || helper) && <small id={messageId} className={error ? 'ui-field-error' : 'ui-field-helper'} role={error ? 'alert' : undefined}>{error || helper}</small>}</label>;
}
