import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

export type Candle = {
  time: number; // ms timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

interface Props {
  data: Candle[];
}

const AnimatedView = Animated.createAnimatedComponent(View);

const CANDLE_WIDTH = 8;
const CANDLE_GAP = 4;
const MIN_SCALE = 0.5;
const MAX_SCALE = 5;

const CandlestickChart: React.FC<Props> = ({ data }) => {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  // crosshair visibility now handled fully on UI thread via shared value
  const showCrosshair = useSharedValue(0);
  const crosshairX = useSharedValue(0);
  const crosshairY = useSharedValue(0);

  const scale = useSharedValue(1);
  const startScale = useSharedValue(1); // remembers scale at pinch start
  const panX = useSharedValue(0); // in content units (pre-scale)
  const dataLength = useSharedValue(data.length);
  const chartWidth = useSharedValue(0);

  useEffect(() => { dataLength.value = data.length; }, [data.length]);
  useEffect(() => { chartWidth.value = layout.width; }, [layout.width]);

  const totalContentWidth = useMemo(() => data.length * (CANDLE_WIDTH + CANDLE_GAP), [data.length]);

  // Price scale (using entire dataset for simplicity)
  const { minPrice, maxPrice } = useMemo(() => {
    let minP = Number.POSITIVE_INFINITY;
    let maxP = Number.NEGATIVE_INFINITY;
    for (const c of data) {
      if (c.low < minP) minP = c.low;
      if (c.high > maxP) maxP = c.high;
    }
    if (!isFinite(minP) || !isFinite(maxP)) { minP = 0; maxP = 1; }
    const pad = (maxP - minP) * 0.05;
    return { minPrice: minP - pad, maxPrice: maxP + pad };
  }, [data]);

  const priceToY = useCallback((price: number) => {
    const h = layout.height || 1;
    return ((maxPrice - price) / (maxPrice - minPrice)) * (h - 20); // bottom padding for X axis labels
  }, [layout.height, maxPrice, minPrice]);

  // Gestures
  const pan = Gesture.Pan().onChange(e => {
    // worklet-safe clamp
    const clampW = (v: number, min: number, max: number) => { 'worklet'; return Math.min(Math.max(v, min), max); };
    const delta = e.changeX / scale.value; // convert screen delta to content units
    panX.value = clampW(panX.value - delta, 0, Math.max(totalContentWidth - layout.width / scale.value, 0));
  });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate(e => {
      const clampW = (v: number, min: number, max: number) => { 'worklet'; return Math.min(Math.max(v, min), max); };
      let nextScale = clampW(startScale.value * e.scale, MIN_SCALE, MAX_SCALE);
      const focalX = e.focalX;
      const contentX = panX.value + focalX / scale.value;
      scale.value = nextScale;
      panX.value = clampW(contentX - focalX / nextScale, 0, Math.max(totalContentWidth - layout.width / nextScale, 0));
    })
    .onEnd(() => {
      const clampW = (v: number, min: number, max: number) => { 'worklet'; return Math.min(Math.max(v, min), max); };
      panX.value = clampW(panX.value, 0, Math.max(totalContentWidth - layout.width / scale.value, 0));
    });

  // Separate gesture for crosshair: simple Tap to show + Pan to move when active.
  const tap = Gesture.Tap()
    .maxDuration(2500)
    .onStart((e: any) => {
      crosshairX.value = e.x;
      crosshairY.value = e.y;
      // toggle visibility if already shown to allow hide
      showCrosshair.value = showCrosshair.value === 1 ? 0 : 1;
    })
    .onEnd(() => { /* no-op */ });

  const moveCrosshair = Gesture.Pan()
    .onBegin((e: any) => {
      if (showCrosshair.value !== 1) return;
      crosshairX.value = e.x;
      crosshairY.value = e.y;
    })
    .onChange((e: any) => {
      if (showCrosshair.value !== 1) return;
      crosshairX.value = e.x;
      crosshairY.value = e.y;
    })
    .onEnd(() => { /* no-op */ });

  const composed = Gesture.Simultaneous(pan, pinch, tap, moveCrosshair);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -panX.value * scale.value },
      { scaleX: scale.value }
    ]
  }));

  const crosshairVStyle = useAnimatedStyle(() => ({ left: crosshairX.value, opacity: showCrosshair.value }));
  const crosshairHStyle = useAnimatedStyle(() => ({ top: crosshairY.value, opacity: showCrosshair.value }));

  const onLayoutRoot = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout({ width, height });
    // Re-clamp pan when size changes
  panX.value = clampJS(panX.value, 0, Math.max(totalContentWidth - width / scale.value, 0));
  };

  const yAxisTicks = useMemo(() => {
    const ticks: number[] = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      ticks.push(minPrice + (i / steps) * (maxPrice - minPrice));
    }
    return ticks;
  }, [minPrice, maxPrice]);

  const xAxisLabels = useMemo(() => {
    const labels: { x: number; text: string }[] = [];
    for (let i = 0; i < data.length; i += Math.ceil(data.length / 6)) {
      labels.push({ x: i * (CANDLE_WIDTH + CANDLE_GAP) + CANDLE_WIDTH / 2, text: `${i}` });
    }
    return labels;
  }, [data.length]);

  return (
    <GestureDetector gesture={composed}>
      <View style={styles.container} onLayout={onLayoutRoot}>
        {layout.width > 0 && (
          <>
            <View style={styles.chartArea}>
              <View style={styles.clipContainer}>
                <AnimatedView style={[styles.content, contentAnimatedStyle, { width: totalContentWidth }]}> 
                  <Svg width={totalContentWidth} height={layout.height}>
                    <G>
                      {data.map((c, i) => {
                        const x = i * (CANDLE_WIDTH + CANDLE_GAP);
                        const openY = priceToY(c.open);
                        const closeY = priceToY(c.close);
                        const highY = priceToY(c.high);
                        const lowY = priceToY(c.low);
                        const candleTop = Math.min(openY, closeY);
                        const candleBottom = Math.max(openY, closeY);
                        const color = c.close >= c.open ? '#26a69a' : '#ef5350';
                        const bodyHeight = Math.max(1, candleBottom - candleTop);
                        return (
                          <G key={c.time + '-' + i}>
                            {/* Wick */}
                            <Line x1={x + CANDLE_WIDTH / 2} x2={x + CANDLE_WIDTH / 2} y1={highY} y2={lowY} stroke={color} strokeWidth={1} />
                            {/* Body */}
                            <Rect x={x} y={candleTop} width={CANDLE_WIDTH} height={bodyHeight} fill={color} />
                          </G>
                        );
                      })}
                    </G>
                  </Svg>
                </AnimatedView>
                {/* Crosshair */}
                <Animated.View pointerEvents="none" style={[styles.crosshairV, crosshairVStyle, { height: layout.height }]} />
                <Animated.View pointerEvents="none" style={[styles.crosshairH, crosshairHStyle, { width: layout.width }]} />
              </View>
              {/* Y Axis labels (right side) */}
              <View style={styles.yAxisLabels} pointerEvents="none">
                {yAxisTicks.map(v => {
                  const y = priceToY(v);
                  return (
                    <Text key={v} style={[styles.yAxisText, { top: y - 7 }]}>{formatPrice(v)}</Text>
                  );
                })}
              </View>
            </View>
            {/* X Axis */}
            <View style={styles.xAxisContainer} pointerEvents="none">
              <Svg width={layout.width} height={20}>
                <Line x1={0} x2={layout.width} y1={0.5} y2={0.5} stroke="#444" strokeWidth={1} />
                {xAxisLabels.map(l => (
                  <SvgText key={l.x} x={(l.x - panX.value) * scale.value} y={14} fill="#aaa" fontSize={10} textAnchor="middle">{l.text}</SvgText>
                ))}
              </Svg>
            </View>
          </>
        )}
      </View>
    </GestureDetector>
  );
};

// JS-thread clamp (do NOT use inside worklets). For worklets we inline a 'clampW' with a 'worklet' directive.
function clampJS(v: number, min: number, max: number) { return Math.min(Math.max(v, min), max); }
function formatPrice(v: number) { return v >= 1000 ? v.toFixed(0) : v.toFixed(2); }

export default CandlestickChart;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  chartArea: { flex: 1, flexDirection: 'row' },
  clipContainer: { flex: 1, overflow: 'hidden' },
  content: { position: 'absolute', left: 0, top: 0 },
  yAxisLabels: { width: 60 },
  yAxisText: { position: 'absolute', right: 2, color: '#bbb', fontSize: 10 },
  xAxisContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 20 },
  crosshairV: { position: 'absolute', width: 1, backgroundColor: '#888' },
  crosshairH: { position: 'absolute', height: 1, backgroundColor: '#888' },
});
