import { useCallback } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { Alert } from 'react-native';
import { useAuth } from '@/context/auth-context';
import { useFavorites } from '@/context/favorites-context';

export function useListingFavorites(ids: number[]) {
  const { user } = useAuth();
  const { states, pending, store } = useFavorites();
  const key = [...new Set(ids)].sort((a, b) => a - b).join(',');
  useFocusEffect(useCallback(() => { void store.hydrate(key.split(',').filter(Boolean).map(Number)); }, [store, key]));
  const toggle = async (id: number) => {
    if (!user) { router.push('/login'); return; }
    if (!['USER', 'ROOM_HOST'].includes(user.role)) { Alert.alert('Thông báo', 'Yêu thích dành cho tài khoản người thuê và chủ trọ.'); return; }
    try { await store.toggle(id); }
    catch (error) { Alert.alert('Chưa thể cập nhật yêu thích', error instanceof Error ? error.message : 'Vui lòng thử lại.'); }
  };
  return { favorites: states, pendingFavorites: pending, toggle, canFavorite: !user || ['USER', 'ROOM_HOST'].includes(user.role) };
}
