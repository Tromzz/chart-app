import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

// Add Market tab with combined screen
export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({ ios: { position: 'absolute' }, default: {} }),
      }}>
      <Tabs.Screen
        name="market"
        options={{
          title: 'Market',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="candle"
        options={{
          title: 'Candle',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="chart.bar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="tradingview"
        options={{
          title: 'TradingView',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="waveform.path.ecg" color={color} />,
        }}
      />
    </Tabs>
  );
}
