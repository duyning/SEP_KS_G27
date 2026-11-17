import { RoomSearchProvider } from '@/context/room-search-context';
import AppTabs from '@/components/app-tabs';

// Discovery is public; account actions enforce authentication when used.
export default function MainLayout() {
  return <RoomSearchProvider><AppTabs /></RoomSearchProvider>;
}

