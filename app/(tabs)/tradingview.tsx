import TradingViewLightweightChart from '@/components/TradingViewLightweightChart';
import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';

export default function TradingViewChartScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <TradingViewLightweightChart />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#111' } });
