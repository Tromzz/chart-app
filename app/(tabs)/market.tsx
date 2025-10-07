import Chart, { Candle, RANGE_OPTIONS, RangeKey } from "@/components/Chart";
import { NewsItem } from "@/components/NewsFeed";
import TabbedNews, { IdeaItem } from "@/components/TabbedNews";
import { fetchCandles } from "@/services/candles";
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Image, Platform, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// Removed dummy generators in favor of API data

const mockNews: NewsItem[] = Array.from({ length: 50 }).map((_, i) => ({
  id: String(i + 1),
  title: `Market Update ${i + 1}`,
  description:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio.",
  neutral: Math.round(Math.random() * 100),
  caution: Math.round(Math.random() * 100),
  bearish: Math.round(Math.random() * 100),
}));
const mockFeeds: NewsItem[] = Array.from({ length: 40 }).map((_, i) => ({
  id: `f${i + 1}`,
  title: `Feed Post ${i + 1}`,
  description: "Short feed insight lorem ipsum dolor sit amet.",
  neutral: Math.round(Math.random() * 100),
  caution: Math.round(Math.random() * 100),
  bearish: Math.round(Math.random() * 100),
}));
const mockIdeas: IdeaItem[] = Array.from({ length: 20 }).map((_, i) => ({
  id: `i${i + 1}`,
  author: `User${i + 3}`,
  title: `Idea: Breakout Strategy ${i + 1}`,
  body: "This is a dummy trading idea describing entry, stop loss and take profit levels for demonstration.",
  likes: Math.round(Math.random() * 120),
}));

export default function MarketScreen() {
  const router = useRouter();
  const [data, setData] = useState<Candle[]>([]);
  const [latest, setLatest] = useState<Candle | undefined>(undefined);
  const [fullscreen, setFullscreen] = useState(false);
  const [rangeStats, setRangeStats] = useState<{ range: string; first?: Candle; last?: Candle }>({ range: 'All' });
  const [range, setRange] = useState<RangeKey>('All');
  const [live, setLive] = useState<boolean>(false);
  const [hoverCandle, setHoverCandle] = useState<Candle | undefined>(undefined);
  const liveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch candles whenever range changes or on first mount
  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    (async () => {
      try {
        const candles = await fetchCandles({ symbol: 'XAUUSD', range });
        candles.sort((a,b)=>a.time-b.time);
        setData(candles);
        setLatest(candles[candles.length-1]);
      } catch(e) {
        console.warn('Fetch candles failed', e);
      }
    })();
    return () => controller.abort();
  }, [range]);

  // Live polling (simple) when live mode enabled
  useEffect(() => {
    if(!live){
      if(liveTimer.current) clearInterval(liveTimer.current);
      liveTimer.current = null;
      return;
    }
    liveTimer.current = setInterval(async () => {
      try {
        const candles = await fetchCandles({ symbol: 'XAUUSD', range, limit: 2 });
        candles.sort((a,b)=>a.time-b.time);
        const last = candles[candles.length-1];
        if(!last) return;
        setLatest(prev => (prev && prev.time === last.time ? prev : last));
        setData(prev => {
          if(!prev.length) return candles;
            if(prev[prev.length-1].time === last.time){
              const copy = prev.slice();
              copy[copy.length-1] = last;
              return copy;
            }
            return [...prev, last];
        });
      } catch(e){ console.warn('Live update failed', e); }
    }, 5000);
    return () => { if(liveTimer.current) clearInterval(liveTimer.current); };
  }, [live, range]);

  // Derived pricing: if hovering show hover candle close; else show last price of range / latest candle
  const effectiveLast = hoverCandle?.close ?? rangeStats.last?.close ?? latest?.close ?? 0;
  const firstPrice = rangeStats.first?.close || data[0]?.close || effectiveLast;
  const change = effectiveLast - firstPrice;
  const pct = firstPrice ? (change / firstPrice) * 100 : 0;
  const changeColor = change === 0 ? '#bbb' : change > 0 ? '#26a69a' : '#ef5350';
  const showOHLC = !!hoverCandle;

  const insets = useSafeAreaInsets();
  const androidPadTop = Platform.OS === 'android' ? (insets.top || StatusBar.currentHeight || 0) : 0;

  const handleRangeStats = useCallback((stats: { range: string; first?: Candle; last?: Candle }) => {
    setRangeStats(stats);
  },[]);

  return (
    <SafeAreaView edges={['top','left','right']} style={[styles.root, Platform.OS==='android' && { paddingTop: androidPadTop }]}>    
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityLabel="Back"
            onPress={() => { if(router.canGoBack()) router.back(); }}
            style={styles.backBtn}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <View style={styles.assetRow}>
            <View style={styles.assetIconWrap}>
              <Image source={require('../../assets/xauusd.png')} style={styles.assetImage} resizeMode="contain" />
            </View>
            <View style={styles.assetMeta}>
              <View style={styles.symbolRow}>
                <Text style={styles.symbol}>XAU/USD</Text>
              </View>
              <Text style={styles.exchange}>Spot Gold</Text>
            </View>
          </View>
          {fullscreen && (
            <View style={styles.headerPriceBlock}>
              <Text style={styles.price}>{effectiveLast.toFixed(2)}</Text>
              {showOHLC ? (
                <Text style={[styles.change, styles.ohlcChangeSmall]}>O {hoverCandle!.open.toFixed(2)}  H {hoverCandle!.high.toFixed(2)}  L {hoverCandle!.low.toFixed(2)}  C {hoverCandle!.close.toFixed(2)}</Text>
              ) : (
                <Text style={[styles.change, { color: changeColor, fontSize:11 }]}>
                  {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)} ({pct.toFixed(2)}%)
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
      {!fullscreen && (
        <View style={styles.assetInfoContainer}>
          <View style={styles.inlinePriceBlock}>
            <Text style={styles.price}>{effectiveLast.toFixed(2)}</Text>
            {showOHLC ? (
              <Text style={[styles.change, styles.ohlcChange]}>O {hoverCandle!.open.toFixed(2)}  H {hoverCandle!.high.toFixed(2)}  L {hoverCandle!.low.toFixed(2)}  C {hoverCandle!.close.toFixed(2)}</Text>
            ) : (
              <Text style={[styles.change, { color: changeColor }]}>
                {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)} ({pct.toFixed(2)}%) {rangeStats.range}
              </Text>
            )}
          </View>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={[ fullscreen ? styles.chartContainerFullscreen : styles.chartContainer ]}>
          <Chart
            symbol="XAUUSD"
            data={data}
            latestCandle={latest}
            onFullscreenChange={setFullscreen}
            onRangeStats={handleRangeStats}
            range={range}
            onRangeChange={setRange}
            hideRangeSelector
            onHoverCandle={setHoverCandle}
            live={live}
          />
        </View>
        {/* External range selector now BELOW the chart */}
        {!fullscreen && (
          <View style={styles.externalRangeRow}>
            <Pressable
              onPress={()=> setLive(l=>!l)}
              style={[styles.liveToggle, live && styles.liveToggleActive]}
              hitSlop={6}
            >
              <Text style={[styles.liveToggleText, live && styles.liveToggleTextActive]}>{live ? 'Live On' : 'Live Off'}</Text>
            </Pressable>
            {RANGE_OPTIONS.map(r => {
              const active = range === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => setRange(r)}
                  style={[styles.rangeBtn, active && styles.rangeBtnActive]}
                  hitSlop={6}
                >
                  <Text style={[styles.rangeText, active && styles.rangeTextActive]}>{r}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
        {!fullscreen && (
          <View style={{ flexGrow:0 }}>
            <View style={styles.inlineHeaderRow}>
              <Text style={[styles.sectionTitle, styles.firstSection]}>Market Intelligence</Text>
            </View>
            <TabbedNews
              news={mockNews}
              feeds={mockFeeds}
              ideas={mockIdeas}
              contentHeight={420}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0e0e0e" },
  header: {
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#222",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftHeader: { flexDirection:'row', alignItems:'center', flex:1 },
  assetIconWrap: { width:46, height:40, borderRadius:10, backgroundColor:'#141414', justifyContent:'center', alignItems:'center', marginRight:10, borderWidth:1, borderColor:'#333', overflow:'hidden' },
  assetImage: { width:40, height:40 },
  symbol: { color: "#fff", fontSize: 18, fontWeight: "600" },
  exchange: { color: '#888', fontSize: 12, marginTop:2 },
  priceBlock: { alignItems:'flex-end' },
  price: { color:'#fff', fontSize:22, fontWeight:'700' },
  change: { marginTop:2, fontSize:12, fontWeight:'600' },
  chartContainer: { height: Platform.OS === 'ios' ? 260 : 300, paddingHorizontal: 12, paddingTop: 8 },
  chartContainerFullscreen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    paddingHorizontal: 0,
    paddingTop: 0,
    backgroundColor: "#000",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
    marginHorizontal: 16,
  },
  firstSection: { marginTop: 10 },
  inlineHeaderRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginRight:16 },
  externalRangeRow: { flexDirection:'row', flexWrap:'wrap', justifyContent:'center', paddingHorizontal:10, paddingTop:6 },
  liveToggle: { paddingHorizontal:10, paddingVertical:5, marginHorizontal:4, marginVertical:2, borderRadius:4, backgroundColor:'rgba(255,255,255,0.08)', borderWidth:1, borderColor:'rgba(255,255,255,0.15)' },
  liveToggleActive: { backgroundColor:'rgba(255,59,48,0.3)', borderColor:'#ff3b30' },
  liveToggleText: { color:'#bbb', fontSize:10, fontWeight:'600' },
  liveToggleTextActive: { color:'#fff' },
  rangeBtn: { paddingHorizontal:8, paddingVertical:4, marginHorizontal:2, marginVertical:2, borderRadius:4, backgroundColor:'rgba(255,255,255,0.08)', flexDirection:'row', alignItems:'center' },
  rangeBtnActive: { backgroundColor:'rgba(255,255,255,0.25)' },
  rangeText: { color:'#aaa', fontSize:10, fontWeight:'500' },
  rangeTextActive: { color:'#fff' },
  assetMeta: { justifyContent:'center' },
  inlinePriceBlock: { marginTop:4 },
  ohlcChange: { color:'#bbb' },
  headerRow: { flexDirection:'row', alignItems:'center', flex:1 },
  backBtn: { paddingRight:4, paddingVertical:6, marginRight:4 },
  assetRow: { flexDirection:'row', alignItems:'center', flexShrink:1 },
  symbolRow: { flexDirection:'row', alignItems:'baseline' },
  assetInfoContainer: { paddingHorizontal:16, paddingTop:8, paddingBottom:4, borderBottomWidth:StyleSheet.hairlineWidth, borderBottomColor:'#191919' },
  headerPriceBlock: { alignItems:'flex-end', marginLeft:8 },
  ohlcChangeSmall: { color:'#bbb', fontSize:10 },
});
