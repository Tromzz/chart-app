import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface NewsItem { id: string; title: string; description: string; neutral: number; caution: number; bearish: number; }
export interface NewsFeedProps { items: NewsItem[]; showSentiment?: boolean; }

// Sentiment signal: three equal bars. Determine dominant score and color by thresholds.
// Thresholds (value 0-100): 1-40 => yellow, 40-70 => orange, 70-100 => red
const SentimentSignal: React.FC<{ neutral: number; caution: number; bearish: number; }> = ({ neutral, caution, bearish }) => {
  const dominantVal = Math.max(neutral, caution, bearish);
  let color = '#444';
  if(dominantVal >= 70) color = '#ff2d2d';
  else if(dominantVal >= 40) color = '#ff8c32';
  else if(dominantVal > 0) color = '#f5c842';
  // Three ascending bars similar to signal icon
  const heights = [6, 10, 14];
  return (
    <View style={styles.signalWrap}>
      {heights.map((h,i)=>(
        <View key={i} style={[styles.signalBar,{height:h, backgroundColor:color}]} />
      ))}
    </View>
  );
};

const NewsFeed: React.FC<NewsFeedProps> = ({ items, showSentiment = true }) => {
  return (
    <View style={styles.list}>
      {items.map(item => (
        <View key={item.id} style={styles.newsCard}>
          <View style={styles.titleRow}>
            {showSentiment && <SentimentSignal neutral={item.neutral} caution={item.caution} bearish={item.bearish} />}
            <Text style={[styles.title, !showSentiment && { marginLeft: 0 }]} numberOfLines={3}>{item.title}</Text>
          </View>
          <Text style={styles.desc}>{item.description}</Text>
        </View>
      ))}
    </View>
  );
};

export default NewsFeed;

const styles = StyleSheet.create({
  list: { paddingBottom: 12 },
  newsCard: { backgroundColor: '#1d1d1d', padding: 12, borderRadius: 10, marginBottom: 8 },
  titleRow: { flexDirection:'row', alignItems:'flex-end', marginBottom:4 },
  title: { color: '#fff', fontWeight: '600', flex:1, marginLeft:6, fontSize:13, lineHeight:16 },
  desc: { color: '#ccc', fontSize: 11, lineHeight: 15 },
  signalWrap: { flexDirection:'row', alignItems:'flex-end', width:18, justifyContent:'space-between', height:14 },
  signalBar: { width:4, borderRadius:1, backgroundColor:'#666' },
});
