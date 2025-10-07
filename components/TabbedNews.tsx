import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import NewsFeed, { NewsItem } from './NewsFeed';

interface TabbedNewsProps {
  news: NewsItem[];
  feeds: NewsItem[];
  ideas: IdeaItem[];
  contentHeight?: number; // height for the internal scroll area
}

export interface IdeaItem { id: string; author: string; title: string; body: string; likes: number; }

const IdeaCard: React.FC<{ idea: IdeaItem }> = ({ idea }) => (
  <View style={styles.ideaCard}>
    <Text style={styles.ideaTitle}>{idea.title}</Text>
    <Text style={styles.ideaMeta}>by {idea.author} • {idea.likes} likes</Text>
    <Text style={styles.ideaBody}>{idea.body}</Text>
  </View>
);

const TabbedNews: React.FC<TabbedNewsProps> = ({ news, feeds, ideas, contentHeight }) => {
  const [tab, setTab] = useState<'news' | 'feeds' | 'ideas'>('news');
  const tabs: { key: 'news' | 'feeds' | 'ideas'; label: string }[] = [
    { key: 'news', label: 'News' },
    { key: 'feeds', label: 'Feeds' },
    { key: 'ideas', label: 'Ideas' },
  ];

  const renderContent = useMemo(() => {
    if (tab === 'news') return <NewsFeed items={news} showSentiment />;
    if (tab === 'feeds') return <NewsFeed items={feeds} showSentiment={false} />;
    return (
      <View style={styles.ideasWrapper}>
        {ideas.map(i => <IdeaCard key={i.id} idea={i} />)}
      </View>
    );
  }, [tab, news, feeds, ideas]);

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {tabs.map(t => {
          const active = t.key === tab;
          return (
            <Pressable key={t.key} style={styles.tabBtn} onPress={() => setTab(t.key)}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              <View style={[styles.underline, active && styles.underlineActive]} />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.tabContent}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
          nestedScrollEnabled
        >
          {renderContent}
        </ScrollView>
      </View>
    </View>
  );
};

export default TabbedNews;

const styles = StyleSheet.create({
  container: { marginHorizontal: 16, marginTop: 12 },
  tabBar: { flexDirection: 'row', alignItems:'flex-end', paddingHorizontal:0, paddingBottom:4 },
  tabBtn: { paddingHorizontal:4, marginRight:6, alignItems:'center' },
  tabText: { color: '#5c5c5c', fontSize: 18, fontWeight: '600' },
  tabTextActive: { color: '#ffffff' },
  underline: { marginTop:4, height:2, backgroundColor:'transparent', alignSelf:'stretch', width:'100%', borderRadius:1 },
  underlineActive: { backgroundColor:'#14b195' },
  tabContent: { marginTop: 10 , maxHeight: 420 },
  scroll: { flexGrow:0 },
  scrollContent: { paddingBottom: Platform.OS === 'ios' ? 165 : 70 },
  ideasWrapper: { gap: 10 },
  ideaCard: { backgroundColor: '#1d1d1d', padding: 12, borderRadius: 10, marginBottom: 10 },
  ideaTitle: { color: '#fff', fontWeight: '600', marginBottom: 4 },
  ideaMeta: { color: '#aaa', fontSize: 11, marginBottom: 6 },
  ideaBody: { color: '#ccc', fontSize: 12, lineHeight: 16 },
});
