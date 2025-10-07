import { ChartCandlestick, ChartLine, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { TapGestureHandler } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { WebView } from 'react-native-webview';

export interface Candle { time: number; open: number; high: number; low: number; close: number; volume?: number; }
export const RANGE_OPTIONS = ['1D','1W','1M','3M','6M','YTD','1Y','5Y','All'] as const;
export type RangeKey = typeof RANGE_OPTIONS[number];

export interface ChartProps {
  symbol: string; data: Candle[]; latestCandle?: Candle; theme?: 'dark' | 'light';
  onFullscreenChange?: (fullscreen: boolean) => void;
  onRangeStats?: (stats: { range: string; first?: Candle; last?: Candle }) => void;
  range?: RangeKey; defaultRange?: RangeKey; onRangeChange?: (r: RangeKey) => void; hideRangeSelector?: boolean;
  onHoverCandle?: (c?: Candle) => void;
  live?: boolean; // when true chart streams updates & auto-scrolls; range acts as context only
}

const Chart: React.FC<ChartProps> = ({ symbol, data, latestCandle, theme='dark', onFullscreenChange, onRangeStats, range, defaultRange='All', onRangeChange, hideRangeSelector, onHoverCandle, live=false }) => {
  const webviewRef = useRef<WebView>(null);
  const [isFullscreen,setIsFullscreen] = useState(false);
  const [chartType,setChartType] = useState<'candlestick'|'line'>('candlestick');
  const isControlled = range !== undefined; const [internalRange,setInternalRange]=useState<RangeKey>(defaultRange); const activeRange=(isControlled?range:internalRange) as RangeKey;
  const [isWebViewReady,setIsWebViewReady]=useState(false); const [screenDim,setScreenDim]=useState(Dimensions.get('window'));
  // Reduced fullscreen height (78% of screen) so the chart isn't edge-to-edge
  const fullscreenChartHeight = useMemo(()=> Math.max(250, Math.round(Platform.OS === 'ios'?screenDim.height * 0.78:Math.min(screenDim.height * 0.85))), [screenDim.height]);
  useEffect(()=>{ const sub=Dimensions.addEventListener('change',({window})=>setScreenDim(window)); return ()=>{ // cleanup
    // @ts-ignore
    if(sub?.remove) sub.remove(); else Dimensions.removeEventListener?.('change',()=>{}); }; },[]);

  const normalized = useMemo(()=> data.map(c=>({...c,time: c.time>2_000_000_000?Math.floor(c.time/1000):c.time})),[data]);
  const filtered = useMemo(()=> {
    if(!normalized.length) return [] as Candle[];
    if(activeRange==='All') return normalized;
    const lastTs = normalized[normalized.length-1].time; // seconds
    const lastDate = new Date(lastTs * 1000);
    const startOfTodayUTC = Date.UTC(lastDate.getUTCFullYear(), lastDate.getUTCMonth(), lastDate.getUTCDate()) / 1000;
    let cutoff = 0;
    try {
      switch(activeRange){
        case '1D': {
          // Current UTC calendar day only
          cutoff = startOfTodayUTC; break;
        }
        case '1W': {
          // Last 7 calendar days including today (start of day 7 days ago)
            cutoff = startOfTodayUTC - 7*24*3600; break;
        }
        case '1M': {
          // One calendar month back keeping day number where possible
          cutoff = Date.UTC(lastDate.getUTCFullYear(), lastDate.getUTCMonth()-1, lastDate.getUTCDate()) / 1000; break;
        }
        case '3M': {
          cutoff = Date.UTC(lastDate.getUTCFullYear(), lastDate.getUTCMonth()-3, lastDate.getUTCDate()) / 1000; break;
        }
        case '6M': {
          cutoff = Date.UTC(lastDate.getUTCFullYear(), lastDate.getUTCMonth()-6, lastDate.getUTCDate()) / 1000; break;
        }
        case 'YTD': {
          cutoff = Date.UTC(lastDate.getUTCFullYear(), 0, 1) / 1000; break;
        }
        case '1Y': {
          cutoff = Date.UTC(lastDate.getUTCFullYear()-1, lastDate.getUTCMonth(), lastDate.getUTCDate()) / 1000; break;
        }
        case '5Y': {
          cutoff = Date.UTC(lastDate.getUTCFullYear()-5, lastDate.getUTCMonth(), lastDate.getUTCDate()) / 1000; break;
        }
        default: cutoff = 0;
      }
    } catch(e){
      // Fallback: if any error, default to last year window
      cutoff = lastTs - 365*24*3600;
    }
    return normalized.filter(c=>c.time >= cutoff);
  }, [normalized, activeRange]);

  // Snapshot logic: when not in live mode, freeze data at time of selection so new candles don't alter historical view.
  const snapshotRef = useRef<{range: RangeKey; data: Candle[]}|null>(null);
  const prevRangeRef = useRef<RangeKey>(activeRange);
  useEffect(()=>{
    if(live){ // live mode clears snapshots
      snapshotRef.current = null;
      prevRangeRef.current = activeRange;
      return;
    }
    if(prevRangeRef.current !== activeRange){
      snapshotRef.current = { range: activeRange, data: filtered.slice() };
      prevRangeRef.current = activeRange;
    }
  },[activeRange, filtered, live]);
  const displayData = live ? filtered : (snapshotRef.current?.range===activeRange ? snapshotRef.current.data : filtered);

  const html = useMemo(()=>{ 
    const bg=theme==='dark'?'#111':'#fff'; 
    const text=theme==='dark'?'#DDD':'#222'; 
    const grid=theme==='dark'?'#222':'#eee'; 
    return `<!DOCTYPE html><html><head><meta name=viewport content="initial-scale=1, maximum-scale=1" />
  <style>html,body,#c{margin:0;padding:0;height:100%;background:${bg};}body{font-family:-apple-system,system-ui,Roboto,sans-serif;}a[href*="tradingview"],a[href*="tv.tradingview"],.tradingview-widget-copyright{display:none !important;pointer-events:none !important;}#liveBtn{position:absolute;top:6px;right:6px;background:#d32f2f;color:#fff;font-size:11px;padding:4px 8px;border-radius:4px;font-weight:600;letter-spacing:.5px;font-family:inherit;cursor:pointer;user-select:none;box-shadow:0 2px 6px rgba(0,0,0,.4);transition:opacity .25s,transform .25s;}#liveBtn.hidden{opacity:0;pointer-events:none;transform:translateY(-4px);}#liveBtn.active{background:#2e7d32;}
    </style></head><body><div id="c"></div><div id="liveBtn" class="hidden">LIVE</div>
    <script src="https://unpkg.com/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js"></script>
  <script>
  function safePost(msg){try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(typeof msg==='string'?msg:JSON.stringify(msg));}catch(e){}} 
  const container=document.getElementById('c'); 
  const chart=LightweightCharts.createChart(container,{
    layout:{background:{color:'${bg}'},textColor:'${text}'},
    grid:{vertLines:{color:'${grid}'},horzLines:{color:'${grid}'}},
    rightPriceScale:{borderVisible:false},
    timeScale:{borderVisible:false},
    crosshair:{mode:1}
  }); 
  let series=null,allData=[],currentChartType='candlestick'; 
  let autoScroll=true; 
  let currentRange='All'; 
  // cache key to avoid unnecessary re-application; include fullscreen state so toggling forces refresh
  let lastFormatCategory=null; 
  const liveBtn=document.getElementById('liveBtn'); 
  let isFullscreenMode = false; 
  
  function baseCategoryForRange(r){
    switch(r){
      case '1D': return 'minutes'; // start with minutes so intraday shows finer labels
      case '1W': return 'week';
    case '1M': return 'quarter'; // day + month (e.g. 12 Aug)
    case '3M': return 'year'; // month abbreviations
    case '6M': return 'year';
    case 'YTD': return 'year';
    case '1Y': return 'multiYear'; // Mon '25
    case '5Y': return 'all'; // full year numbers
    case 'All': return 'all'; // full years
      default: return 'year';
    }
  }
  let forcedCategory = null; // if set, overrides dynamic classification until user interacts (zoom/pan)
  
  function updateLiveBtn(){ 
    if(autoScroll){liveBtn.classList.add('hidden');liveBtn.classList.add('active');} 
    else {liveBtn.classList.remove('hidden');liveBtn.classList.remove('active');}
  } 
  
  function classifySpan(spanSec){ 
  // Very small spans -> show seconds
  if(spanSec < 30*60) return 'seconds';       // < 30 minutes
  if(spanSec < 6*3600) return 'minutes';      // < 6 hours
  if(spanSec < 48*3600) return 'hours';       // < 2 days
  if(spanSec < 14*24*3600) return 'week';     // < 2 weeks
  if(spanSec < 120*24*3600) return 'quarter'; // < ~4 months
  if(spanSec < 500*24*3600) return 'year';    // < ~1.3 years
  if(spanSec < 3*365*24*3600) return 'multiYear'; // < 3 years
  return 'all'; 
  } 
  
  function makeFormatter(cat){ 
    return function(time){ 
      const ts=(typeof time==='number'?time:time.timestamp); 
      const d=new Date(ts*1000); 
      const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; 
      if(cat==='seconds'){ 
        return d.getUTCHours().toString().padStart(2,'0')+':' + d.getUTCMinutes().toString().padStart(2,'0') + ':' + d.getUTCSeconds().toString().padStart(2,'0'); 
      }
      if(cat==='minutes' || cat==='hours'){ 
        return d.getUTCHours().toString().padStart(2,'0')+':'+d.getUTCMinutes().toString().padStart(2,'0'); 
      }
      if(cat==='week'){ 
        return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getUTCDay()]; 
      } 
      if(cat==='quarter'){ 
        return d.getUTCDate()+ ' ' + months[d.getUTCMonth()]; 
      } 
      if(cat==='year'){ 
        return months[d.getUTCMonth()]; 
      } 
      if(cat==='multiYear'){ 
        return months[d.getUTCMonth()] + ' ' + (''+d.getUTCFullYear()).slice(2); 
      } 
      return ''+d.getUTCFullYear(); 
    }; 
  } 
  
  function applyDynamicFormatter(overrideCat){ 
    const vr = chart.timeScale().getVisibleRange(); 
    let cat;
    if(overrideCat){
      cat = overrideCat;
    } else {
      if(forcedCategory){
        cat = forcedCategory;
      } else {
        if(!vr){ return; }
        const spanSec = (vr.to - vr.from); 
        cat=classifySpan(spanSec); 
      }
    }
    const key = cat + '|' + (isFullscreenMode?'fs':'norm');
  if(key===lastFormatCategory) return; 
  lastFormatCategory=key; 
    // Always show time axis (user wants axis visible for all ranges)
  const timeVisible = true; 
    chart.applyOptions({ 
      timeScale:{ 
    timeVisible: timeVisible, 
    secondsVisible: cat==='seconds', 
        tickMarkFormatter: makeFormatter(cat) 
      }
    }); 
  } 
  
  function applyRangeFormatting(initial){ 
    if(initial){
      forcedCategory = initial; // lock initial category
      lastFormatCategory=null; // force apply
      applyDynamicFormatter(initial);
    } else {
      applyDynamicFormatter(); 
    }
  } 
  
  function setFullscreenMode(fullscreen){ 
    isFullscreenMode = fullscreen; 
    applyDynamicFormatter(); // Re-apply formatting with new mode 
  } 
  
  liveBtn.addEventListener('click',()=>{
    autoScroll=true;
    chart.timeScale().scrollToRealTime();
    updateLiveBtn();
  });
  
  function userInteracted(){ 
    if(autoScroll){autoScroll=false;updateLiveBtn();}
    if(forcedCategory){
      forcedCategory=null; // release lock and allow dynamic classification
      lastFormatCategory=null; // ensure reapply
      applyDynamicFormatter();
    }
  } 
  
  ['wheel','touchstart','mousedown','pointerdown','gesturestart'].forEach(evt=>
    window.addEventListener(evt,userInteracted,{passive:true})
  );
  
  function createSeries(type){ 
    if(series) chart.removeSeries(series); 
    if(type==='candlestick'){ 
      series=chart.addCandlestickSeries({
        upColor:'#26a69a',
        downColor:'#ef5350',
        wickUpColor:'#26a69a',
        wickDownColor:'#ef5350',
        borderVisible:false
      }); 
    } else { 
      series=chart.addLineSeries({
        color:'#2962FF',
        lineWidth:2,
        priceScaleId:'right'
      });
    }
    if(allData.length){ 
      if(type==='line') series.setData(allData.map(d=>({time:d.time,value:d.close}))); 
      else series.setData(allData);
    }
    currentChartType=type; 
    if(autoScroll) chart.timeScale().scrollToRealTime(); 
  } 
  
  function setAll(d){
    let prevLogical=null; 
    if(!autoScroll){
      try{ prevLogical = chart.timeScale().getVisibleLogicalRange(); }catch(e){}
    }
    allData=d; 
    if(currentChartType==='line') series.setData(d.map(it=>({time:it.time,value:it.close}))); 
    else series.setData(d); 
    if(autoScroll){
      chart.timeScale().scrollToRealTime();
    } else if(prevLogical){
      try{ chart.timeScale().setVisibleLogicalRange(prevLogical); }catch(e){}
    }
    applyDynamicFormatter(); 
  } 
  
  function applyUpdate(c){ 
    const idx=allData.findIndex(it=>it.time===c.time); 
    if(idx>=0){allData[idx]=c;} 
    else { 
      let insertIndex=allData.length; 
      for(let i=allData.length-1;i>=0;i--){ 
        if(allData[i].time<c.time) break; 
        insertIndex=i;
      } 
  allData.splice(insertIndex,0,c);
    }
  if(currentChartType==='line') series.update({time:c.time,value:c.close}); 
    else series.update(c); 
    if(autoScroll) chart.timeScale().scrollToRealTime(); 
  } 
  
  createSeries('candlestick'); 
  applyRangeFormatting(); 
  
  chart.timeScale().subscribeVisibleTimeRangeChange(r=>{ 
    if(r) applyDynamicFormatter(); 
    try {
      if(autoScroll){
        const sp = chart.timeScale().scrollPosition();
        if(sp > 0.5){ // user scrolled left (away from realtime)
          autoScroll=false; updateLiveBtn();
        }
      }
    } catch(e) {}
  }); 
  
  chart.subscribeCrosshairMove(param=>{ 
    try{ 
      if(!param||param.time===undefined){ 
        safePost({type:'hover',candle:null}); 
        return;
      } 
      const t=typeof param.time==='number'?param.time:param.time.timestamp; 
      const found=allData.find(d=>d.time===t); 
      safePost({type:'hover',candle:found||null}); 
    }catch(e){} 
  }); 
  
  function handleMessage(raw){ 
    try{ 
      const dataStr=(raw&&raw.data)?raw.data:(typeof raw==='string'?raw:JSON.stringify(raw)); 
      const m=JSON.parse(dataStr); 
  if(m.type==='append'){applyUpdate(m.candle);} 
  else if(m.type==='setData'){setAll(m.data);} 
      else if(m.type==='changeChartType'){createSeries(m.chartType);} 
      else if(m.type==='rangeChanged'){ 
        currentRange=m.range; 
        const baseCat = baseCategoryForRange(currentRange);
        lastFormatCategory=null; // force reapply
        applyRangeFormatting(baseCat); 
        if(autoScroll){
          chart.timeScale().scrollToRealTime();
        } else {
          try { chart.timeScale().fitContent(); } catch(e) {}
        }
      } 
      else if(m.type==='setFullscreen'){ 
        setFullscreenMode(m.fullscreen); 
      } 
      else if(m.type==='setAutoScroll'){
        autoScroll = !!m.value;
        updateLiveBtn();
        if(autoScroll) chart.timeScale().scrollToRealTime();
      }
    }catch(e){} 
  } 
  
  document.addEventListener('message',handleMessage); 
  window.addEventListener('message',handleMessage); 
  window.onmessage=handleMessage; 
  updateLiveBtn(); 
  
  (function removeTradingView(){ 
    try{ 
      const sel='a[href*="tradingview"],a[href*="tv.tradingview"],.tradingview-widget-copyright'; 
      document.querySelectorAll(sel).forEach(el=>el.remove()); 
    }catch(e){} 
    setTimeout(removeTradingView,800); 
  })(); 
  
  document.addEventListener('click',e=>{ 
    try{ 
      const a=e.target&&e.target.closest?e.target.closest('a'):null; 
      if(a&&a.href&&(a.href.includes('tradingview')||a.href.includes('tv.tradingview'))){ 
        e.preventDefault(); 
        e.stopPropagation(); 
      } 
    }catch(err){} 
  },true); 
  
  function doResize(){ 
    try{ 
      const r=container.getBoundingClientRect(); 
      chart.resize(r.width,r.height); 
      if(autoScroll) chart.timeScale().scrollToRealTime(); 
      applyDynamicFormatter(); 
    }catch(e){} 
  } 
  
  new ResizeObserver(doResize).observe(container); 
  window.addEventListener('resize',doResize); 
  setTimeout(()=>{ 
    applyDynamicFormatter(); 
  },80); 
  safePost({type:'ready'}); 
  </script></body></html>`; 
  },[theme]);

  const changeChartType=(type:'candlestick'|'line')=>{ setChartType(type); try{ webviewRef.current?.postMessage(JSON.stringify({type:'changeChartType',chartType:type})); }catch(e){} };

  useEffect(()=>{ if(!live) return; if(!latestCandle||!isWebViewReady) return; const c={...latestCandle,time: latestCandle.time>2_000_000_000?Math.floor(latestCandle.time/1000):latestCandle.time}; try{ webviewRef.current?.postMessage(JSON.stringify({type:'append',candle:c})); }catch(e){} },[latestCandle,isWebViewReady,live]);
  useEffect(()=>{ if(isWebViewReady&&displayData.length){ try{ webviewRef.current?.postMessage(JSON.stringify({type:'setData',data:displayData})); }catch(e){} } },[displayData,isWebViewReady]);
  // inform webview of range change for axis formatting
  useEffect(()=>{ if(isWebViewReady){ try{ 
    webviewRef.current?.postMessage(JSON.stringify({type:'rangeChanged',range:activeRange})); 
  }catch(e){} } },[activeRange,isWebViewReady]);

  // inform webview of live mode autoScroll state
  useEffect(()=>{ if(isWebViewReady){ try{ webviewRef.current?.postMessage(JSON.stringify({type:'setAutoScroll',value:live})); }catch(e){} } },[live,isWebViewReady]);
  
  // Send fullscreen state to WebView
  useEffect(()=>{ if(isWebViewReady){ try{ webviewRef.current?.postMessage(JSON.stringify({type:'setFullscreen',fullscreen:isFullscreen})); }catch(e){} } },[isFullscreen,isWebViewReady]);
  // Notify parent when filtered data window actually changes (guard against identical emissions)
  const lastStatsRef = useRef<{range: string; firstTime?: number; lastTime?: number} | undefined>(undefined);
  useEffect(()=>{
    if(!onRangeStats) return;
    const first = filtered[0];
    const last = filtered[filtered.length-1];
    const signature = { range: activeRange, firstTime: first?.time, lastTime: last?.time };
    const prev = lastStatsRef.current;
    if(!filtered.length){
      if(!prev || prev.firstTime!==undefined || prev.lastTime!==undefined || prev.range!==activeRange){
        onRangeStats({range:activeRange,first:undefined,last:undefined});
        lastStatsRef.current = { range: activeRange };
      }
      return;
    }
    if(prev && prev.range===signature.range && prev.firstTime===signature.firstTime && prev.lastTime===signature.lastTime){
      return; // unchanged
    }
    lastStatsRef.current = signature;
    onRangeStats({range:activeRange,first,last});
  },[filtered,activeRange,onRangeStats]);

  const hydrate=()=>{ if(!filtered.length) return; try{ webviewRef.current?.postMessage(JSON.stringify({type:'setData',data:filtered})); webviewRef.current?.postMessage(JSON.stringify({type:'changeChartType',chartType})); }catch(e){} };
  const markReady=()=>{ if(!isWebViewReady) setIsWebViewReady(true); hydrate(); };
  const onMessage=(e:any)=>{ try{ const msg=JSON.parse(e.nativeEvent.data); if(msg?.type==='ready') markReady(); else if(msg?.type==='hover') onHoverCandle?.(msg.candle||undefined); }catch(err){ if(e.nativeEvent?.data==='ready') markReady(); } };
  const onLoadEnd=()=> setTimeout(()=>{ if(!isWebViewReady) markReady(); },400);
  const openFullscreen=()=>{ setIsFullscreen(true); onFullscreenChange?.(true); };
  const closeFullscreen=()=>{ setIsFullscreen(false); onFullscreenChange?.(false); };
  const changeRange=(r:RangeKey)=>{ if(isControlled) onRangeChange?.(r); else setInternalRange(r); };

  return (
    <TapGestureHandler numberOfTaps={2} onActivated={openFullscreen}>
      <Animated.View style={[styles.wrapper,isFullscreen&&styles.fullscreenWrapper]}>
  <View style={styles.chartTypeContainer}>
          <Pressable accessibilityLabel="Candlestick" style={[styles.chartTypeIconBtn,chartType==='candlestick'&&styles.activeChartTypeButton]} onPress={()=>changeChartType('candlestick')}>
            <ChartCandlestick size={22} color={chartType==='candlestick'? '#fff':'#ccc'} strokeWidth={1.75} />
          </Pressable>
          <Pressable accessibilityLabel="Line" style={[styles.chartTypeIconBtn,chartType==='line'&&styles.activeChartTypeButton]} onPress={()=>changeChartType('line')}>
            <ChartLine size={22} color={chartType==='line'? '#fff':'#ccc'} strokeWidth={1.75} />
          </Pressable>
        </View>
  {!hideRangeSelector && !isFullscreen && (
          <View style={styles.rangeContainer}>
            {RANGE_OPTIONS.map(r=> (
              <Pressable key={r} onPress={()=>changeRange(r)} style={[styles.rangeBtn,activeRange===r&&styles.rangeBtnActive]} hitSlop={6}>
                <Text style={[styles.rangeText,activeRange===r&&styles.rangeTextActive]}>{r}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <WebView
          key={isFullscreen?'chart-fs':'chart-inline'}
            ref={webviewRef}
            originWhitelist={['*']}
            style={isFullscreen?[styles.webviewFullscreen,{width:screenDim.width,height:fullscreenChartHeight}]:styles.webview}
            source={{ html }}
            javaScriptEnabled
            allowFileAccess
            allowUniversalAccessFromFileURLs
            mixedContentMode="always"
            androidLayerType="hardware"
            automaticallyAdjustContentInsets={true}
            scrollEnabled={false}
            onLoadEnd={onLoadEnd}
            onMessage={onMessage}
        />
        {!isFullscreen && (
          <Pressable style={styles.fullscreenBtn} onPress={openFullscreen} hitSlop={10}>
            <View style={styles.fullscreenBtnInner}><View style={[styles.fsBar,{transform:[{rotate:'0deg'}]}]}/><View style={[styles.fsBar,{transform:[{rotate:'90deg'}]}]}/></View>
          </Pressable>
        )}
        {isFullscreen && (
          <Pressable style={styles.exitBtn} onPress={closeFullscreen} hitSlop={10} accessibilityLabel="Close Fullscreen">
            <X size={18} color="#fff" />
          </Pressable>
        )}
      </Animated.View>
    </TapGestureHandler>
  );
};

export default Chart;

const styles = StyleSheet.create({
  wrapper:{ flex:1,borderRadius:8,overflow:'hidden',backgroundColor:'#000' },
  fullscreenWrapper:{ position:'absolute',top:0,left:0,right:0,bottom:0,borderRadius:0,zIndex:999,elevation:50,backgroundColor:'#000',width:'100%',height:'100%',overflow:'hidden' },
  webview:{ flex:1,backgroundColor:'transparent' },
  webviewFullscreen:{ position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'transparent' },
  chartTypeContainer:{ position:'absolute',top:8,left:8,zIndex:15,flexDirection:'row',backgroundColor:'rgba(0,0,0,0.35)',borderRadius:8,padding:4 },
  chartTypeIconBtn:{ width:34,height:30,justifyContent:'center',alignItems:'center',borderRadius:6,marginHorizontal:2 },
  activeChartTypeButton:{ backgroundColor:'rgba(255,255,255,0.18)' },
  rangeContainer:{ position:'absolute',bottom:6,left:0,right:0,flexDirection:'row',justifyContent:'center',flexWrap:'wrap',paddingHorizontal:4,zIndex:12 },
  rangeBtn:{ paddingHorizontal:8,paddingVertical:4,marginHorizontal:2,marginVertical:2,borderRadius:4,backgroundColor:'rgba(0,0,0,0.35)' },
  rangeBtnActive:{ backgroundColor:'rgba(255,255,255,0.22)' },
  rangeText:{ color:'#ccc',fontSize:10,fontWeight:'500' },
  rangeTextActive:{ color:'#fff' },
  fullscreenBtn:{ position:'absolute',top:8,right:8,backgroundColor:'rgba(0,0,0,0.4)',padding:6,borderRadius:6,zIndex:14 },
  fullscreenBtnInner:{ width:18,height:18,justifyContent:'center',alignItems:'center' },
  fsBar:{ position:'absolute',width:14,height:2,backgroundColor:'#fff',borderRadius:2 },
  exitBtn:{ position:'absolute',top:8,right:8,backgroundColor:'rgba(255,255,255,0.18)',padding:8,borderRadius:20,zIndex:15 },
  exitText:{ color:'#fff',fontSize:12,fontWeight:'600' }
});
