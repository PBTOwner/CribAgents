import React, { useRef, useState } from 'react';
import { View, PanResponder, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors, Spacing, Radius } from '../constants/Colors';

interface Props {
  onSignatureChange: (svgData: string | null) => void;
  width?: number;
  height?: number;
}

interface Point { x: number; y: number }

export default function SignatureCanvas({ onSignatureChange, width = 320, height = 160 }: Props) {
  const [paths, setPaths] = useState<string[]>([]);
  const currentPath = useRef<Point[]>([]);

  function pointsToPath(pts: Point[]): string {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const mx = (prev.x + curr.x) / 2;
      const my = (prev.y + curr.y) / 2;
      d += ` Q ${prev.x} ${prev.y} ${mx} ${my}`;
    }
    return d;
  }

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const { locationX, locationY } = e.nativeEvent;
      currentPath.current = [{ x: locationX, y: locationY }];
    },
    onPanResponderMove: (e) => {
      const { locationX, locationY } = e.nativeEvent;
      currentPath.current.push({ x: locationX, y: locationY });
      setPaths(prev => {
        const updated = [...prev.slice(0, -1), pointsToPath(currentPath.current)].filter(Boolean);
        notifyChange(updated);
        return updated;
      });
    },
    onPanResponderRelease: () => {
      const newPath = pointsToPath(currentPath.current);
      if (newPath) {
        setPaths(prev => {
          const updated = [...prev.filter(p => p !== newPath), newPath];
          notifyChange(updated);
          return updated;
        });
      }
      currentPath.current = [];
    },
  });

  function notifyChange(currentPaths: string[]) {
    if (currentPaths.length === 0) {
      onSignatureChange(null);
      return;
    }
    const svgString = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${currentPaths.map(d => `<path d="${d}" stroke="#1B4F8A" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>`;
    onSignatureChange(svgString);
  }

  function clear() {
    setPaths([]);
    currentPath.current = [];
    onSignatureChange(null);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.canvas, { width, height }]} {...panResponder.panHandlers}>
        <Svg width={width} height={height}>
          {paths.map((d, i) => (
            <Path
              key={i}
              d={d}
              stroke={Colors.primary}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Svg>
        {paths.length === 0 && (
          <View style={styles.placeholder} pointerEvents="none">
            <Text style={styles.placeholderText}>Sign here</Text>
          </View>
        )}
      </View>
      <TouchableOpacity style={styles.clearBtn} onPress={clear}>
        <Text style={styles.clearText}>Clear</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  canvas: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { fontSize: 14, color: Colors.textLight, fontStyle: 'italic' },
  clearBtn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  clearText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
});
