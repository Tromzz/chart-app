import { Redirect } from 'expo-router';

// When navigating to /(tabs) root, immediately show the market tab.
export default function TabsIndex() {
  return <Redirect href="/(tabs)/market" />;
}
