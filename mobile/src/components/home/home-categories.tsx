import { Feather } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { authColors, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from './animated-pressable';

export interface CategoryItem {
  id: string;
  label: string;
  icon?: ComponentProps<typeof Feather>['name'];
}

export const CATEGORIES: CategoryItem[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'khep-kin', label: 'Khép kín' },
  { id: 'chung-cu-mini', label: 'Chung cư mini' },
  { id: 'gac-lung', label: 'Gác lửng' },
  { id: 'con-phong', label: 'Còn phòng' },
];

interface HomeCategoriesProps {
  selectedCategory: string;
  availableOnly?: boolean;
  onSelectCategory: (id: string) => void;
}

export function HomeCategories({
  selectedCategory,
  availableOnly = false,
  onSelectCategory,
}: HomeCategoriesProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map((cat, index) => {
          const isSelected = cat.id === 'con-phong' ? availableOnly : selectedCategory === cat.id;

          return (
            <Animated.View
              key={cat.id}
              entering={FadeInRight.duration(240).delay(index * 30)}
            >
              <AnimatedPressable
                onPress={() => onSelectCategory(cat.id)}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipSelected,
                ]}
                accessibilityLabel={`Danh mục: ${cat.label}`}
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.categoryLabel,
                    isSelected && styles.categoryLabelSelected,
                  ]}
                >
                  {cat.label}
                </Text>
              </AnimatedPressable>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: authSpacing.xs,
  },
  scrollContent: {
    paddingHorizontal: authSpacing.xl,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: authRadius.round,
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.border,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipSelected: {
    backgroundColor: authColors.primary,
    borderColor: authColors.primary,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: authColors.textSecondary,
  },
  categoryLabelSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});



