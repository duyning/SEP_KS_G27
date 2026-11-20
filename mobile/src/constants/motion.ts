import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { Easing, WithSpringConfig, WithTimingConfig } from 'react-native-reanimated';

/**
 * Animate UI Motion Design Tokens adapted for React Native & Reanimated
 * Reference: Animate UI skill specification & physics tokens
 */
export const MotionTokens = {
  // Springs (mass: 1)
  spring: {
    // Quick press feedback (~120ms)
    press: {
      stiffness: 550,
      damping: 30,
      mass: 1,
    } as WithSpringConfig,
    // Popovers, badges, tooltips (~175ms, ~4% overshoot)
    pop: {
      stiffness: 400,
      damping: 29,
      mass: 1,
    } as WithSpringConfig,
    // Lively check/favorite pop (overshoots ~13%)
    checkPop: {
      stiffness: 500,
      damping: 24,
      mass: 1,
    } as WithSpringConfig,
    // Smooth selection slide (tabs, category pills)
    selection: {
      stiffness: 300,
      damping: 30,
      mass: 1,
    } as WithSpringConfig,
    // Entrance animations
    entrance: {
      stiffness: 200,
      damping: 20,
      mass: 1,
    } as WithSpringConfig,
    // Bottom sheet / modal dialog
    sheet: {
      stiffness: 350,
      damping: 32,
      mass: 1,
    } as WithSpringConfig,
  },

  // Tweens / Timings
  timing: {
    fade: {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    } as WithTimingConfig,
    overlay: {
      duration: 300,
      easing: Easing.out(Easing.quad),
    } as WithTimingConfig,
    reveal: {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    } as WithTimingConfig,
    instant: {
      duration: 0,
    } as WithTimingConfig,
  },

  // Scale constants
  scale: {
    press: 0.97,
    pop: 1.05,
    heartPop: 1.25,
  },

  // Stagger intervals (ms)
  stagger: {
    fast: 30,
    normal: 45,
    relaxed: 60,
  },
} as const;

/**
 * Safe Haptics feedback utility
 */
export async function triggerHaptic(
  type: 'light' | 'medium' | 'success' | 'selection' = 'light'
) {
  if (Platform.OS === 'web') return;
  try {
    switch (type) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'selection':
        await Haptics.selectionAsync();
        break;
    }
  } catch {
    // Graceful degradation when haptics unavailable
  }
}

/**
 * Hook to detect and observe system Reduced Motion preference
 */
export function useReducedMotionPreference(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) setReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      enabled => {
        setReduceMotion(enabled);
      }
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
