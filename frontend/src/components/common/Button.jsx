import { forwardRef } from 'react';
// Preserve native form semantics and existing class hooks.
export default forwardRef(function Button({ variant, className = '', children, ...props }, ref) {
  const tone = variant || (/icon|toggle|close|thumbnail|gallery|tab|filter|nav|link/.test(className) ? 'ghost' : /danger|destructive|delete|reject/.test(className) ? 'destructive' : /primary|submit|confirm|approve/.test(className) ? 'primary' : 'secondary');
  return <button ref={ref} className={'ui-button ' + className} data-variant={tone} {...props}>{children}</button>;
});
