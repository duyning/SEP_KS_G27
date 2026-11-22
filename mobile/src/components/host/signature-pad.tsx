import { useMemo, useRef, useState } from 'react';
import { type GestureResponderEvent, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { authColors as c, authRadius } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import {
  SIGNATURE_CANVAS_HEIGHT,
  SIGNATURE_CANVAS_WIDTH,
  SIGNATURE_MAX_POINTS_PER_STROKE,
  SIGNATURE_MAX_STROKES,
} from '@/services/contract-wizard';
import type { SignaturePoint } from '@/services/rental-contracts';

interface RenderedSegment {
  key: string;
  left: number;
  top: number;
  width: number;
  angleRad: number;
}

function buildSegments(
  strokes: readonly (readonly SignaturePoint[])[],
  width: number,
  height: number
): RenderedSegment[] {
  if (width <= 0 || height <= 0) return [];
  const scaleX = width / SIGNATURE_CANVAS_WIDTH;
  const scaleY = height / SIGNATURE_CANVAS_HEIGHT;
  const segments: RenderedSegment[] = [];

  strokes.forEach((stroke, sIdx) => {
    for (let i = 1; i < stroke.length; i += 1) {
      const p1 = stroke[i - 1];
      const p2 = stroke[i];
      const x1 = p1.x * scaleX;
      const y1 = p1.y * scaleY;
      const x2 = p2.x * scaleX;
      const y2 = p2.y * scaleY;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.5) continue;
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      segments.push({
        key: `${sIdx}-${i}`,
        left: midX - dist / 2,
        top: midY - 1.5,
        width: dist + 1.5,
        angleRad: Math.atan2(dy, dx),
      });
    }
  });

  return segments;
}

/**
 * Renders saved DRAWN signature strokes cleanly on any read-only card
 * (exact 600x200 aspect ratio matching backend RentalContractSignatureRequest).
 */
export function SignatureStrokesView({
  strokes,
  height = 84,
}: {
  strokes: readonly (readonly SignaturePoint[])[];
  height?: number;
}) {
  const [boxWidth, setBoxWidth] = useState(0);
  const segments = useMemo(
    () => buildSegments(strokes, boxWidth, height),
    [boxWidth, height, strokes]
  );

  return (
    <View
      style={[s.previewBox, { height }]}
      onLayout={e => {
        const w = Math.floor(e.nativeEvent.layout.width);
        if (w > 0 && w !== boxWidth) setBoxWidth(w);
      }}
      accessibilityLabel="Hình ảnh chữ ký vẽ"
    >
      {segments.map(seg => (
        <View
          key={seg.key}
          style={[
            s.inkSegment,
            {
              left: seg.left,
              top: seg.top,
              width: seg.width,
              transform: [{ rotate: `${seg.angleRad}rad` }],
            },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * Touch-optimized signature canvas mapping coordinates strictly onto the backend's
 * 600x200 integer space (max 24 strokes, 2..180 points per stroke).
 */
export function SignaturePad({
  strokes,
  disabled = false,
  onChangeStrokes,
  onDrawingChange,
}: {
  strokes: SignaturePoint[][];
  disabled?: boolean;
  onChangeStrokes: (next: SignaturePoint[][]) => void;
  onDrawingChange?: (drawing: boolean) => void;
}) {
  const [size, setSize] = useState({ width: 0, height: 180 });
  const [activeStroke, setActiveStroke] = useState<SignaturePoint[]>([]);
  const activeRef = useRef<SignaturePoint[]>([]);

  const toLogicalPoint = (locationX: number, locationY: number): SignaturePoint => {
    const w = Math.max(1, size.width);
    const h = Math.max(1, size.height);
    const x = Math.round(Math.max(0, Math.min(1, locationX / w)) * SIGNATURE_CANVAS_WIDTH);
    const y = Math.round(Math.max(0, Math.min(1, locationY / h)) * SIGNATURE_CANVAS_HEIGHT);
    return { x, y };
  };

  const canAcceptStroke = !disabled && strokes.length < SIGNATURE_MAX_STROKES;

  const handleResponderGrant = (evt: GestureResponderEvent) => {
    if (!canAcceptStroke) return;
    const pt = toLogicalPoint(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
    activeRef.current = [pt];
    setActiveStroke([pt]);
    onDrawingChange?.(true);
  };

  const handleResponderMove = (evt: GestureResponderEvent) => {
    const current = activeRef.current;
    if (!current.length || current.length >= SIGNATURE_MAX_POINTS_PER_STROKE) return;
    const pt = toLogicalPoint(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
    const last = current[current.length - 1];
    if (Math.abs(last.x - pt.x) + Math.abs(last.y - pt.y) < 3) return;
    const next = [...current, pt];
    activeRef.current = next;
    setActiveStroke(next);
  };

  const handleResponderRelease = () => {
    const current = activeRef.current;
    activeRef.current = [];
    setActiveStroke([]);
    onDrawingChange?.(false);
    if (
      current.length >= 2 &&
      current.some(pt => pt.x !== current[0].x || pt.y !== current[0].y)
    ) {
      onChangeStrokes([...strokes, current]);
    }
  };

  const handleResponderTerminate = () => {
    activeRef.current = [];
    setActiveStroke([]);
    onDrawingChange?.(false);
  };

  const allStrokes = useMemo(
    () => (activeStroke.length > 1 ? [...strokes, activeStroke] : strokes),
    [activeStroke, strokes]
  );

  const segments = useMemo(
    () => buildSegments(allStrokes, size.width, size.height),
    [allStrokes, size.height, size.width]
  );

  const reachedLimit = strokes.length >= SIGNATURE_MAX_STROKES;

  return (
    <View style={s.wrap}>
      <View
        style={[s.canvas, disabled && { opacity: 0.6 }]}
        onLayout={e => {
          const w = Math.floor(e.nativeEvent.layout.width);
          const h = Math.max(150, Math.round((w * SIGNATURE_CANVAS_HEIGHT) / SIGNATURE_CANVAS_WIDTH));
          if (w > 0 && (w !== size.width || h !== size.height)) {
            setSize({ width: w, height: h });
          }
        }}
        accessibilityLabel="Khung vẽ chữ ký bằng ngón tay"
        onStartShouldSetResponder={() => canAcceptStroke}
        onMoveShouldSetResponder={() => canAcceptStroke}
        onResponderTerminationRequest={() => false}
        onResponderGrant={handleResponderGrant}
        onResponderMove={handleResponderMove}
        onResponderRelease={handleResponderRelease}
        onResponderTerminate={handleResponderTerminate}
      >
        {/* Subtle baseline guide */}
        <View style={[s.baseline, { top: Math.round(size.height * 0.74) }]} pointerEvents="none" />

        {strokes.length === 0 && activeStroke.length === 0 && (
          <View style={s.placeholderWrap} pointerEvents="none">
            <Feather name="pen-tool" size={18} color={c.textMuted} />
            <Text style={s.placeholderText}>Ký bằng ngón tay hoặc bút cảm ứng tại đây</Text>
          </View>
        )}

        <View style={{ width: size.width, height: size.height }} pointerEvents="none">
          {segments.map(seg => (
            <View
              key={seg.key}
              style={[
                s.inkSegment,
                {
                  left: seg.left,
                  top: seg.top,
                  width: seg.width,
                  transform: [{ rotate: `${seg.angleRad}rad` }],
                },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={s.controlsRow}>
        <Text style={s.strokeCounter}>
          {reachedLimit
            ? `Đã đạt tối đa ${SIGNATURE_MAX_STROKES} nét — xóa để ký lại`
            : `${strokes.length}/${SIGNATURE_MAX_STROKES} nét ký`}
        </Text>
        <View style={s.btnGroup}>
          <AnimatedPressable
            scaleTo={0.96}
            disabled={disabled || strokes.length === 0}
            accessibilityLabel="Hoàn tác nét ký gần nhất"
            style={[s.toolBtn, (disabled || strokes.length === 0) && { opacity: 0.42 }]}
            onPress={() => onChangeStrokes(strokes.slice(0, -1))}
          >
            <Feather name="corner-up-left" size={13} color={c.forestInk} />
            <Text style={s.toolBtnText}>Hoàn tác</Text>
          </AnimatedPressable>
          <AnimatedPressable
            scaleTo={0.96}
            disabled={disabled || strokes.length === 0}
            accessibilityLabel="Xóa và ký lại"
            style={[s.toolBtn, (disabled || strokes.length === 0) && { opacity: 0.42 }]}
            onPress={() => onChangeStrokes([])}
          >
            <Feather name="trash-2" size={13} color={c.error} />
            <Text style={[s.toolBtnText, { color: c.error }]}>Xóa & ký lại</Text>
          </AnimatedPressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  canvas: {
    width: '100%',
    minHeight: 160,
    borderRadius: authRadius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#B8D4CC',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    position: 'relative',
  },
  previewBox: {
    width: '100%',
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    position: 'relative',
  },
  baseline: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: '#E6EFEA',
  },
  placeholderWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  placeholderText: {
    fontSize: 13,
    color: c.textMuted,
    textAlign: 'center',
  },
  inkSegment: {
    position: 'absolute',
    height: 3.2,
    borderRadius: 2,
    backgroundColor: '#134C59',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  strokeCounter: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  btnGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  toolBtn: {
    minHeight: 36,
    paddingHorizontal: 11,
    borderRadius: authRadius.round,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  toolBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.forestInk,
  },
});
