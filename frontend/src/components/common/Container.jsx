export default function Container({ as: Tag = 'div', className = '', children, ...props }) {
  return <Tag className={'layout-container ' + className} {...props}>{children}</Tag>;
}
