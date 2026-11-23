import { ReactNode, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { MotionTokens, triggerHaptic, useReducedMotionPreference } from '@/constants/motion';

const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable);

export interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: 'light' | 'medium' | 'success' | 'selection' | 'none';
}

export function AnimatedPressable({
  children,
  style,
  scaleTo = MotionTokens.scale.press,
  haptic = 'light',
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: AnimatedPressableProps) {
  const [scale] = useState(() => new Animated.Value(1));
  const reduceMotion = useReducedMotionPreference();

  const handlePressIn = (e: GestureResponderEvent) => {
    if (disabled) return;
    if (haptic !== 'none') {
      void triggerHaptic(haptic);
    }
    if (!reduceMotion) {
      Animated.spring(scale, {
        toValue: scaleTo,
        stiffness: 550,
        damping: 30,
        mass: 1,
        useNativeDriver: true,
      }).start();
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    if (disabled) return;
    if (!reduceMotion) {
      Animated.spring(scale, {
        toValue: 1,
        stiffness: 550,
        damping: 30,
        mass: 1,
        useNativeDriver: true,
      }).start();
    }
    onPressOut?.(e);
  };

  return (
    <AnimatedPressableComponent
      style={[
        styles.base,
        style,
        reduceMotion ? undefined : { transform: [{ scale }] },
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      {...rest}
    >
      {children}
    </AnimatedPressableComponent>
  );
}

const styles = StyleSheet.create({
  base: {
    // Base styles
  },
});
