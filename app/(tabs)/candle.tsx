import CandlestickChart, { Candle } from '@/components/CandlestickChart';
import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';

function generateInitialData(count: number): Candle[] {
  const data: Candle[] = []; let lastClose = 100 + Math.random() * 20;
  for (let i = 0; i < count; i++) {
    const open = lastClose; const change = (Math.random() - 0.5) * 2; const close = Math.max(1, open + change);
    const high = Math.max(open, close) + Math.random() * 1.5; const low = Math.min(open, close) - Math.random() * 1.5;
    const volume = 100 + Math.random() * 900; lastClose = close;
    data.push({ time: Date.now() - (count - i) * 60_000, open, high, low, close, volume });
  }
  return data;
}
function generateNext(prev: Candle): Candle {
  const base = prev.close; const open = base + (Math.random() - 0.5) * 0.5; const direction = Math.random() - 0.5;
  const close = open + direction * (0.5 + Math.random()); const high = Math.max(open, close) + Math.random() * 0.6;
  const low = Math.min(open, close) - Math.random() * 0.6; const volume = 100 + Math.random() * 900;
  return { time: Date.now(), open, high, low, close: Math.max(1, close), volume };
}

export default function CandleChartScreen() {
  const [data, setData] = useState<Candle[]>(() => generateInitialData(80));
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => { timer.current = setInterval(() => setData(p => { const n = generateNext(p[p.length - 1]); const u = [...p, n]; if (u.length > 150) u.shift(); return u; }), 2500); return () => { if (timer.current) clearInterval(timer.current); }; }, []);
  return (
    <SafeAreaView style={styles.root}>
      <CandlestickChart data={data} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#111' } });
