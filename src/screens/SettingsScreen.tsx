import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { API_BASE_URL, COLORS } from '../constants/config';

type Status = 'unchecked' | 'checking' | 'online' | 'offline';

export default function SettingsScreen() {
  const [status, setStatus] = useState<Status>('unchecked');
  const [statusMessage, setStatusMessage] = useState('Not checked yet');
  const active = useRef(true);
  const currentRequest = useRef<AbortController | null>(null);
  useEffect(() => () => { active.current = false; currentRequest.current?.abort(); }, []);

  async function checkBackend() {
    setStatus('checking'); setStatusMessage('Checking the analysis server…');
    const controller = new AbortController();
    currentRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`${API_BASE_URL}/ping`, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (active.current) { setStatus('online'); setStatusMessage('Server responded successfully'); }
    } catch {
      if (active.current) { setStatus('offline'); setStatusMessage(controller.signal.aborted ? 'Check timed out. The service may be starting.' : 'Could not reach the server. Check your connection.'); }
    } finally { clearTimeout(timeout); if (currentRequest.current === controller) currentRequest.current = null; }
  }

  const statusColor = status === 'online' ? COLORS.leaf : status === 'offline' ? COLORS.red : COLORS.muted;
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.kicker}>PREFERENCES & INFORMATION</Text><Text style={styles.title}>Settings</Text><Text style={styles.subtitle}>A little more about how PlantCare AI works.</Text>
    <Text style={styles.section}>CONNECTION</Text><View style={styles.card}><View style={styles.statusHead}><View style={[styles.statusDot, { backgroundColor: statusColor }]} /><Text style={styles.cardTitle}>Analysis server</Text><Text style={[styles.statusLabel, { color: statusColor }]}>{status === 'unchecked' ? 'NOT CHECKED' : status.toUpperCase()}</Text></View><Text style={styles.detail}>{statusMessage}</Text><Pressable disabled={status === 'checking'} onPress={() => void checkBackend()} style={styles.checkButton}>{status === 'checking' ? <ActivityIndicator color={COLORS.forest} size="small"/> : <Ionicons name="refresh-outline" size={16} color={COLORS.forest}/>}<Text style={styles.checkText}>{status === 'checking' ? 'Checking…' : status === 'unchecked' ? 'Check connection' : 'Check again'}</Text></Pressable></View>
    <Text style={styles.section}>SUPPORTED CLASSES</Text><View style={styles.card}>{[['Healthy', COLORS.leaf], ['Early Blight', COLORS.amber], ['Late Blight', COLORS.red]].map(([label, color]) => <View key={label as string} style={styles.classRow}><View style={[styles.dot, { backgroundColor: color as string }]} /><Text style={styles.classText}>{label as string}</Text></View>)}</View>
    <Text style={styles.section}>PRIVACY</Text><View style={styles.card}><View style={styles.iconText}><View style={styles.iconBox}><Ionicons name="lock-closed-outline" size={17} color={COLORS.leaf}/></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>Your photos</Text><Text style={styles.detail}>The selected image is sent to the configured analysis server for a prediction. Recent scan labels, confidence values, dates, and small thumbnails are stored locally on this device.</Text></View></View><View style={styles.divider}/><Text style={styles.detail}>No account is required. Scan history is not uploaded to a separate database or service.</Text></View>
    <Text style={styles.section}>ABOUT</Text><View style={styles.card}><View style={styles.aboutRow}><Text style={styles.cardTitle}>PlantCare AI</Text><Text style={styles.version}>Version {Constants.expoConfig?.version ?? '1.0.0'}</Text></View><Text style={styles.detail}>AI-assisted potato leaf screening for educational use. Results are estimates and can be affected by image quality.</Text><Text style={styles.endpoint}>{API_BASE_URL}</Text></View>
    <Text style={styles.footer}>GROWN WITH CARE  ·  PLANTCARE AI</Text>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: COLORS.cream }, page: { padding: 22, paddingBottom: 30 }, kicker: { color: COLORS.leaf, fontSize: 9, letterSpacing: 1.2, fontWeight: '800', marginTop: 15 }, title: { fontSize: 29, color: COLORS.forest, fontWeight: '800', marginTop: 5 }, subtitle: { color: COLORS.muted, fontSize: 12, marginTop: 5, marginBottom: 21 }, section: { fontSize: 9, letterSpacing: 1.3, color: COLORS.muted, fontWeight: '800', marginTop: 17, marginBottom: 8 }, card: { backgroundColor: COLORS.white, padding: 15, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line }, statusHead: { flexDirection: 'row', alignItems: 'center', gap: 8 }, statusDot: { width: 8, height: 8, borderRadius: 5 }, cardTitle: { color: COLORS.forest, fontSize: 13, fontWeight: '800', flex: 1 }, statusLabel: { fontSize: 8, letterSpacing: 0.6, fontWeight: '800' }, detail: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 7 }, checkButton: { minHeight: 39, borderRadius: 11, backgroundColor: COLORS.paleGreen, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, checkText: { color: COLORS.forest, fontWeight: '700', fontSize: 11 }, classRow: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 9 }, dot: { height: 8, width: 8, borderRadius: 5 }, classText: { color: COLORS.ink, fontSize: 12, fontWeight: '600' }, iconText: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' }, iconBox: { width: 34, height: 34, borderRadius: 11, backgroundColor: COLORS.paleGreen, alignItems: 'center', justifyContent: 'center' }, divider: { height: 1, backgroundColor: COLORS.line, marginVertical: 12 }, aboutRow: { flexDirection: 'row', alignItems: 'center' }, version: { color: COLORS.muted, fontSize: 10 }, endpoint: { color: COLORS.leaf, fontSize: 10, marginTop: 11 }, footer: { textAlign: 'center', color: '#A5AEA6', fontSize: 8, letterSpacing: 1.4, fontWeight: '700', marginTop: 25 } });
