import GlobalLoading from './GlobalLoading.jsx';
import { useLoading } from '../../context/LoadingContext.jsx';

export default function GlobalLoadingOverlay() {
  const { snapshot } = useLoading();
  if (!snapshot.visible) return null;
  return (
    <GlobalLoading
      overlay
      message={snapshot.message}
      className={snapshot.mode === 'fullscreen' ? 'gl-fullscreen-mode' : 'gl-translucent-mode'}
    />
  );
}
