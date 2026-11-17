import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { authColors, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from './animated-pressable';

interface HomeSearchBarProps {
  query: string;
  onChangeQuery: (text: string) => void;
  onSubmitSearch: () => void;
  onOpenFilter: () => void;
  activeFilterCount?: number;
}

export function HomeSearchBar({
  query,
  onChangeQuery,
  onSubmitSearch,
  onOpenFilter,
  activeFilterCount = 0,
}: HomeSearchBarProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.container}>
      <View style={[styles.inputCard, focused && { borderColor: authColors.primary }]}>
        <Feather name="search" size={18} color={authColors.textMuted} style={styles.searchIcon} />
        <TextInput
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} value={query}
          onChangeText={onChangeQuery}
          onSubmitEditing={onSubmitSearch}
          placeholder="Tìm phòng, khu vực, địa chỉ..."
          placeholderTextColor={authColors.placeholder}
          returnKeyType="search"
          style={styles.textInput}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={200}
          accessibilityLabel="Ô tìm kiếm phòng trọ"
        />
        {query.length > 0 && (
          <AnimatedPressable
            onPress={() => onChangeQuery('')}
            style={styles.clearButton}
            accessibilityLabel="Xóa tìm kiếm"
          >
            <Feather name="x" size={16} color={authColors.textSecondary} />
          </AnimatedPressable>
        )}
      </View>

      <AnimatedPressable
        onPress={onOpenFilter}
        style={styles.filterButton}
        accessibilityLabel="Mở bộ lọc tìm kiếm"
      >
        <Feather name="sliders" size={17} color={authColors.forestInk} />
        {activeFilterCount > 0 && (
          <View style={styles.filterBadge}>
            <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>{activeFilterCount}</Text>
          </View>
        )}
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: authSpacing.xl,
    paddingTop: authSpacing.sm,
    paddingBottom: authSpacing.xs,
    gap: 10,
  },
  inputCard: {
    flex: 1,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: authColors.forestInk,
    height: '100%',
    paddingVertical: 0,
  },
  clearButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: authColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});



