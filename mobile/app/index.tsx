import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PlantCareScreen from '../src/components/PlantCareScreen';
import HomeScreen from '../src/screens/HomeScreen';
import HistoryScreen from '../src/screens/HistoryScreen';
import SettingsScreen from '../src/screens/SettingsScreen';
import { COLORS } from '../src/constants/config';
import { addScanRecord, clearScanHistory, deleteScanRecord, readScanHistory } from '../src/services/scanHistory';
import type { Prediction, ScanRecord, SelectedImage } from '../src/types/plant';

type Tab = 'home' | 'scan' | 'history' | 'settings';
const tabs: { id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'home', label: 'Home', icon: 'home-outline' },
  { id: 'scan', label: 'Scan', icon: 'scan-outline' },
  { id: 'history', label: 'History', icon: 'time-outline' },
  { id: 'settings', label: 'Settings', icon: 'settings-outline' },
];

export default function AppHome() {
  const [tab, setTab] = useState<Tab>('home');
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [chooseGallery, setChooseGallery] = useState(false);

  useEffect(() => {
    let active = true;
    void readScanHistory().then((items) => { if (active) setRecords(items); }).catch(() => {
      if (active) Alert.alert('History unavailable', 'Saved scans could not be loaded. You can still analyze a leaf.');
    }).finally(() => { if (active) setHistoryLoaded(true); });
    return () => { active = false; };
  }, []);

  const savePrediction = useCallback(async (prediction: Prediction, image: SelectedImage) => {
    try {
      const record = await addScanRecord(prediction, image);
      setRecords((previous) => [record, ...previous.filter((item) => item.id !== record.id)].slice(0, 50));
    } catch {
      Alert.alert('Prediction complete', 'Your result is ready, but it could not be saved to scan history. Check available device storage and try again.');
    }
  }, []);

  async function removeRecord(id: string) {
    try { await deleteScanRecord(id); setRecords((items) => items.filter((item) => item.id !== id)); }
    catch { Alert.alert('Could not delete scan', 'Please try again.'); }
  }
  async function removeAllRecords() {
    try { await clearScanHistory(); setRecords([]); }
    catch { Alert.alert('Could not clear history', 'Please try again.'); }
  }
  function openGallery() { setChooseGallery(true); setTab('scan'); }

  return <SafeAreaView style={styles.root} edges={['bottom']}>
    <View style={styles.screen}>
      {tab === 'home' && <HomeScreen latest={records[0] ?? null} onScan={() => setTab('scan')} onHistory={() => setTab('history')} onGallery={openGallery} historyLoaded={historyLoaded}/>}
      {tab === 'scan' && <PlantCareScreen onPredictionSaved={(prediction, image) => { void savePrediction(prediction, image); }} onBackHome={() => setTab('home')} chooseGalleryOnOpen={chooseGallery} onGalleryRequestHandled={() => setChooseGallery(false)}/>}
      {tab === 'history' && <HistoryScreen records={records} onDelete={removeRecord} onClear={removeAllRecords} onScan={() => setTab('scan')}/>}
      {tab === 'settings' && <SettingsScreen/>}
    </View>
    <View style={styles.nav}>
      {tabs.map((item) => {
        const active = tab === item.id;
        return <Pressable key={item.id} onPress={() => setTab(item.id)} style={styles.navItem} accessibilityRole="tab" accessibilityState={{ selected: active }}>
          <View style={[styles.navIcon, active && styles.navIconActive]}><Ionicons name={item.icon} size={19} color={active ? COLORS.white : COLORS.muted}/></View>
          <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
        </Pressable>;
      })}
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: COLORS.cream }, screen: { flex: 1 }, nav: { minHeight: 62, backgroundColor: COLORS.white, borderTopColor: COLORS.line, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingTop: 4 }, navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 }, navIcon: { width: 35, height: 28, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, navIconActive: { backgroundColor: COLORS.forest }, navLabel: { color: COLORS.muted, fontSize: 9, fontWeight: '600', marginTop: 2 }, navLabelActive: { color: COLORS.forest, fontWeight: '800' } });
