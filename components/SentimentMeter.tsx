import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

export interface SentimentMeterProps {
  neutral: number; // yellow
  caution: number; // orange
  bearish: number; // red
  max?: number;
  height?: number; // overrides size
  size?: 'large' | 'small';
}

const SentimentMeter: React.FC<SentimentMeterProps> = ({ neutral, caution, bearish, max, height, size='large' }) => {
  const values = useMemo(() => ({ neutral, caution, bearish }), [neutral, caution, bearish]);
  const isSmall = size==='small';
  const h = height ?? (isSmall ? 34 : 120);
  const maxValue = max ?? Math.max(1, neutral, caution, bearish);
  const barWidth = isSmall ? 12 : 50; const gap = isSmall ? 6 : 24; const width = barWidth * 3 + gap * 2;
  const scale = (v: number) => (v / maxValue) * (h - (isSmall?6:20));
  return (
    <View style={[styles.container, isSmall && styles.containerSmall]}>
      <Svg width={width} height={h}>
        <Rect x={0} y={h - scale(values.neutral)} width={barWidth} height={scale(values.neutral)} rx={isSmall?2:6} fill="#f5c842" />
        <Rect x={barWidth + gap} y={h - scale(values.caution)} width={barWidth} height={scale(values.caution)} rx={isSmall?2:6} fill="#ff8c32" />
        <Rect x={(barWidth + gap) * 2} y={h - scale(values.bearish)} width={barWidth} height={scale(values.bearish)} rx={isSmall?2:6} fill="#ff4242" />
      </Svg>
    </View>
  );
};

export default SentimentMeter;

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 12 },
  containerSmall: { paddingVertical: 0 }
});
