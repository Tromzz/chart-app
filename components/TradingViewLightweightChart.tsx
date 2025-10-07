import React, { useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

// Props for lightweight chart wrapper
export interface TradingViewLightweightChartProps { theme?: 'dark' | 'light'; }

const TradingViewLightweightChart: React.FC<TradingViewLightweightChartProps> = ({ theme = 'dark' }) => {
  const webviewRef = useRef<WebView>(null);

  // Build HTML for WebView (keep everything inline for simplicity)
  const html = useMemo(() => {
    const bg = theme === 'dark' ? '#111' : '#fff';
    const text = theme === 'dark' ? '#DDD' : '#222';
    const grid = theme === 'dark' ? '#222' : '#eee';
    return `<!DOCTYPE html><html><head><meta name="viewport" content="initial-scale=1, maximum-scale=1" />
    <style>html,body,#container{margin:0;padding:0;height:100%;background:${bg};}body{overscroll-behavior:none;font-family:-apple-system,system-ui,Roboto,sans-serif;}/* hide tradingview links/copyright */a[href*="tradingview"],a[href*="tv.tradingview"],.tradingview-widget-copyright{display:none !important;pointer-events:none !important;}
    </style>
    </head><body><div id="container"></div>
    <script src="https://unpkg.com/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js"></script>
    <script>
      const chart = LightweightCharts.createChart(document.getElementById('container'), {
        layout: { background: { color: '${bg}' }, textColor: '${text}' },
        grid: { vertLines: { color: '${grid}' }, horzLines: { color: '${grid}' } },
        rightPriceScale: { borderVisible: false },
        timeScale: { borderVisible: false },
        crosshair: { mode: 1 }
      });
      let series = chart.addCandlestickSeries({ upColor:'#26a69a', downColor:'#ef5350', wickUpColor:'#26a69a', wickDownColor:'#ef5350', borderVisible:false });
      function gen(count){ const d=[]; let t=Math.floor(Date.now()/1000)-count*60; let p=100+Math.random()*20; for(let i=0;i<count;i++){ const o=p; const c=o+(Math.random()-0.5)*2; const h=Math.max(o,c)+Math.random()*1.2; const l=Math.min(o,c)-Math.random()*1.2; p=c; d.push({time:t,open:o,high:h,low:l,close:c}); t+=60; } return d; }
      let seed = gen(80); series.setData(seed);
      function next(){ const last=seed[seed.length-1]; const o=last.close; const c=o+(Math.random()-0.5)*1.2; const h=Math.max(o,c)+Math.random()*0.6; const l=Math.min(o,c)-Math.random()*0.6; const candle={ time:last.time+60, open:o, high:h, low:l, close:c }; seed.push(candle); if(seed.length>300) seed=seed.slice(-300); series.update(candle); }
      setInterval(next,2500);
      // remove any tradingview anchors/copyrights and block clicks
      (function removeTradingView(){ try{ const sel = 'a[href*="tradingview"],a[href*="tv.tradingview"],.tradingview-widget-copyright'; document.querySelectorAll(sel).forEach(el=>el.remove()); }catch(e){} setTimeout(removeTradingView,800); })();
      document.addEventListener('click', function(e){ try{ const a = (e.target && e.target.closest) ? e.target.closest('a') : null; if(a && a.href && (a.href.indexOf('tradingview')!==-1 || a.href.indexOf('tv.tradingview')!==-1)){ e.preventDefault(); e.stopPropagation(); } }catch(e){} }, true);
    </script></body></html>`;
  }, [theme]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        style={styles.webview}
        source={{ html }}
        javaScriptEnabled
        scrollEnabled={false}
        scalesPageToFit={false}
      />
    </View>
  );
};

export default TradingViewLightweightChart;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  webview: { flex: 1, backgroundColor: 'transparent' },
});
