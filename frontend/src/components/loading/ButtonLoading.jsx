/**
 * Inline loading indicator for submit / save / confirm buttons.
 * Prevents full-screen blocking when performing localized user actions.
 */
export function ButtonLoading({
  loading = false,
  loadingText = '',
  icon = null,
  size = 15,
  children
}) {
  return (
    <span className="bl-inline" data-loading={loading ? 'true' : 'false'}>
      {loading ? (
        <span
          className="bl-spinner"
          style={{ width: `${size}px`, height: `${size}px` }}
          aria-hidden="true"
        />
      ) : (
        icon
      )}
      <span>{loading && loadingText ? loadingText : children}</span>
    </span>
  );
}

export function LoadingButton({
  loading = false,
  loadingText = '',
  icon = null,
  size = 15,
  disabled = false,
  type = 'button',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      <ButtonLoading loading={loading} loadingText={loadingText} icon={icon} size={size}>
        {children}
      </ButtonLoading>
    </button>
  );
}

export default ButtonLoading;
