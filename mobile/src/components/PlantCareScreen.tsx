import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../constants/config';
import { analyzePlant, PlantApiError } from '../services/plantApi';
import type { Prediction, SelectedImage } from '../types/plant';

type Props = { onPredictionSaved?: (prediction: Prediction, image: SelectedImage) => void; onBackHome?: () => void; chooseGalleryOnOpen?: boolean; onGalleryRequestHandled?: () => void };

const descriptions: Record<string, string> = {
  Healthy: 'The model found no signs of the two potato blight classes it recognizes in this image.',
  'Early Blight': 'The model detected visual patterns associated with early blight. Image quality and other leaf conditions can affect this estimate.',
  'Late Blight': 'The model detected visual patterns associated with late blight. Image quality and other leaf conditions can affect this estimate.',
};

export default function PlantCareScreen({ onPredictionSaved, onBackHome, chooseGalleryOnOpen = false, onGalleryRequestHandled }: Props) {
  const [image, setImage] = useState<SelectedImage | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const requestController = useRef<AbortController | null>(null);
  useEffect(() => () => { mounted.current = false; requestController.current?.abort(); }, []);

  async function pickImage(source: 'camera' | 'gallery') {
    try {
      setError(null);
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(`${source === 'camera' ? 'Camera' : 'Photo'} access needed`, `Allow PlantCare AI to access your ${source === 'camera' ? 'camera' : 'photos'} to select a leaf image.`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try again', onPress: () => { void pickImage(source); } },
          ...(permission.canAskAgain ? [] : [{ text: 'Settings', onPress: () => { void Linking.openSettings(); } }]),
        ]);
        return;
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
      if (result.canceled) return;
      const asset = result.assets[0];
      const mimeType = asset?.mimeType?.toLowerCase();
      if (!asset || !mimeType || !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
        setError('Please choose a JPG, PNG, or WebP leaf photo.');
        return;
      }
      setImage({ uri: asset.uri, fileName: asset.fileName || `leaf-${Date.now()}.${mimeType.split('/')[1]}`, mimeType });
      setPrediction(null);
    } catch {
      setError(`Could not open the ${source === 'camera' ? 'camera' : 'photo library'}. Please check permissions and try again.`);
    }
  }

  useEffect(() => {
    if (chooseGalleryOnOpen) {
      onGalleryRequestHandled?.();
      void pickImage('gallery');
    }
  }, [chooseGalleryOnOpen]);

  async function runAnalysis() {
    if (!image || requestController.current) return;
    setBusy(true); setError(null); setPrediction(null);
    const controller = new AbortController();
    requestController.current = controller;
    try {
      const result = await analyzePlant(image, controller.signal);
      if (mounted.current) { setPrediction(result); onPredictionSaved?.(result, image); }
    } catch (cause) {
      if (mounted.current) setError(cause instanceof PlantApiError ? cause.message : 'Something went wrong. Please try again.');
    } finally { if (requestController.current === controller) requestController.current = null; if (mounted.current) setBusy(false); }
  }

  const isKnown = prediction && ['Healthy', 'Early Blight', 'Late Blight'].includes(prediction.class);
  const resultColor = prediction?.class === 'Healthy' ? COLORS.leaf : prediction ? COLORS.amber : COLORS.muted;

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topbar}>
        <View style={styles.brandIcon}><Ionicons name="leaf" size={22} color={COLORS.white} /></View>
        <Text style={styles.brand}>PlantCare <Text style={styles.brandAI}>AI</Text></Text>
        <View style={styles.online}><View style={styles.onlineDot}/><Text style={styles.onlineText}>AI READY</Text></View>
      </View>

      {prediction ? <>
        <View style={styles.eyebrowRow}><View style={styles.eyebrowLine}/><Text style={styles.eyebrow}>YOUR SCAN RESULT</Text></View>
        <Text style={styles.title}>Leaf analysis</Text>
        <Text style={styles.subtitle}>Here’s what the model noticed in your potato leaf.</Text>
        {image && <Image source={{ uri: image.uri }} style={styles.resultImage} resizeMode="cover" />}
        <View style={styles.resultCard}>
          <View style={[styles.resultIcon, { backgroundColor: prediction.class === 'Healthy' ? COLORS.paleGreen : '#FBF0DF' }]}>
            <Ionicons name={prediction.class === 'Healthy' ? 'checkmark-circle' : 'alert-circle'} size={24} color={resultColor} />
          </View>
          <View style={styles.resultText}><Text style={styles.resultLabel}>PREDICTED CLASS</Text><Text style={[styles.resultName, { color: resultColor }]}>{prediction.class}</Text></View>
          {!isKnown && <View style={styles.unknownPill}><Text style={styles.unknownText}>Unrecognized class</Text></View>}
          <Text style={styles.percent}>{(prediction.confidence * 100).toFixed(1)}%</Text>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${prediction.confidence * 100}%`, backgroundColor: resultColor }]} /></View>
          <Text style={styles.description}>{descriptions[prediction.class] || 'The model returned a class outside its three configured categories. Please review the result cautiously.'}</Text>
        </View>
        <View style={styles.noteCard}><Ionicons name="information-circle-outline" size={19} color={COLORS.leaf} /><Text style={styles.noteText}>This is an AI estimate, not a definitive diagnosis. Clear, well-lit photos usually help the model assess a leaf.</Text></View>
        <Pressable disabled={busy} onPress={() => { setPrediction(null); setImage(null); setError(null); }} style={styles.primary}><Ionicons name="scan-outline" size={20} color={COLORS.white}/><Text style={styles.primaryText}>Analyze another leaf</Text></Pressable>
        <Pressable onPress={() => { setPrediction(null); setError(null); onBackHome?.(); }} style={styles.secondary}><Text style={styles.secondaryText}>Back to home</Text></Pressable>
      </> : <>
        <View style={styles.heroPill}><Ionicons name="sparkles" size={13} color={COLORS.leaf}/><Text style={styles.heroPillText}>SMARTER PLANT CARE</Text></View>
        <Text style={styles.title}>Keep your plants{ '\n' }<Text style={styles.titleGreen}>healthy.</Text></Text>
        <Text style={styles.subtitle}>Get an AI-powered check for common potato leaf diseases in just a moment.</Text>

        <View style={styles.photoCard}>
          {image ? <>
            <Image source={{ uri: image.uri }} style={styles.preview} resizeMode="cover" />
            <View style={styles.fileRow}><Ionicons name="image-outline" size={16} color={COLORS.leaf}/><Text style={styles.fileName} numberOfLines={1}>{image.fileName}</Text><Pressable disabled={busy} onPress={() => { setImage(null); setError(null); }} hitSlop={10}><Ionicons name="close-circle" size={21} color={COLORS.muted}/></Pressable></View>
            <View style={styles.changeRow}>
              <Pressable style={styles.outlineAction} disabled={busy} onPress={() => void pickImage('camera')}><Ionicons name="camera-outline" size={17} color={COLORS.forest}/><Text style={styles.outlineText}>Retake</Text></Pressable>
              <Pressable style={styles.outlineAction} disabled={busy} onPress={() => void pickImage('gallery')}><Ionicons name="images-outline" size={17} color={COLORS.forest}/><Text style={styles.outlineText}>Change photo</Text></Pressable>
            </View>
          </> : <>
            <View style={styles.uploadIcon}><Ionicons name="leaf-outline" size={27} color={COLORS.leaf}/></View>
            <Text style={styles.photoTitle}>Add a leaf photo</Text>
            <Text style={styles.photoHint}>Choose a clear, close-up photo of a potato leaf</Text>
            <View style={styles.actions}>
              <Pressable style={styles.outlineAction} onPress={() => void pickImage('camera')}><Ionicons name="camera-outline" size={18} color={COLORS.forest}/><Text style={styles.outlineText}>Take Photo</Text></Pressable>
              <Pressable style={styles.outlineAction} onPress={() => void pickImage('gallery')}><Ionicons name="images-outline" size={18} color={COLORS.forest}/><Text style={styles.outlineText}>Gallery</Text></Pressable>
            </View>
          </>}
        </View>

        {busy ? <View style={styles.loadingCard}><ActivityIndicator color={COLORS.leaf} size="small"/><View style={{ flex: 1 }}><Text style={styles.loadingTitle}>Analyzing your leaf...</Text><Text style={styles.loadingHint}>The CNN model is checking the image.</Text></View></View> : null}
        {error ? <View style={styles.errorCard}><Ionicons name="warning-outline" size={19} color={COLORS.red}/><View style={{ flex: 1 }}><Text style={styles.errorText}>{error}</Text>{image && <Pressable onPress={() => void runAnalysis()} style={styles.retry}><Text style={styles.retryText}>Retry analysis</Text><Ionicons name="arrow-forward" size={15} color={COLORS.leaf}/></Pressable>}</View></View> : null}

        <Pressable disabled={!image || busy} onPress={() => void runAnalysis()} style={[styles.primary, (!image || busy) && styles.disabled]}>
          {busy ? <ActivityIndicator color={COLORS.white}/> : <Ionicons name="scan-outline" size={20} color={COLORS.white}/>}
          <Text style={styles.primaryText}>{busy ? 'Analyzing...' : 'Analyze Plant'}</Text>
          {!busy && <Ionicons name="arrow-forward" size={18} color={COLORS.white} style={{ marginLeft: 'auto' }}/ >}
        </Pressable>
        <View style={styles.privacy}><Ionicons name="lock-closed-outline" size={14} color={COLORS.muted}/><Text style={styles.privacyText}>Your selected image is sent securely to our analysis server for prediction.</Text></View>

        <View style={styles.supportSection}>
          <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>What we can detect</Text><Text style={styles.sectionSub}>3 potato leaf categories</Text></View>
          <View style={styles.classCard}><View style={[styles.classDot, { backgroundColor: COLORS.leaf }]}/><Text style={styles.className}>Healthy</Text><Ionicons name="checkmark-circle-outline" size={18} color={COLORS.leaf}/></View>
          <View style={styles.classCard}><View style={[styles.classDot, { backgroundColor: COLORS.amber }]}/><Text style={styles.className}>Early Blight</Text><Ionicons name="alert-circle-outline" size={18} color={COLORS.amber}/></View>
          <View style={styles.classCard}><View style={[styles.classDot, { backgroundColor: COLORS.red }]}/><Text style={styles.className}>Late Blight</Text><Ionicons name="alert-circle-outline" size={18} color={COLORS.red}/></View>
          <Text style={styles.disclaimer}>For learning purposes only. A model prediction is an estimate and should not replace expert advice.</Text>
        </View>
      </>}
      <Text style={styles.footer}>GROWN WITH CARE  ·  PLANTCARE AI</Text>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream }, content: { paddingHorizontal: 23, paddingBottom: 28 },
  topbar: { height: 58, flexDirection: 'row', alignItems: 'center', marginBottom: 24 }, brandIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.forest, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  brand: { color: COLORS.forest, fontSize: 18, fontWeight: '800', letterSpacing: -0.4 }, brandAI: { color: COLORS.leaf }, online: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.white, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 20 }, onlineDot: { width: 6, height: 6, borderRadius: 5, backgroundColor: COLORS.leaf }, onlineText: { color: COLORS.leaf, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  heroPill: { flexDirection: 'row', gap: 6, alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#EAF2E6', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 14 }, heroPillText: { color: COLORS.leaf, fontSize: 9, fontWeight: '800', letterSpacing: 1 }, title: { color: COLORS.forest, fontSize: 35, lineHeight: 41, fontWeight: '800', letterSpacing: -1.2 }, titleGreen: { color: COLORS.leaf }, subtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 22 },
  photoCard: { backgroundColor: COLORS.white, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: COLORS.line, shadowColor: '#183D2B', shadowOpacity: 0.05, shadowRadius: 13, shadowOffset: { width: 0, height: 5 }, elevation: 2, alignItems: 'center' }, uploadIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: COLORS.paleGreen, alignItems: 'center', justifyContent: 'center', marginTop: 2 }, photoTitle: { fontSize: 16, color: COLORS.ink, fontWeight: '700', marginTop: 12 }, photoHint: { color: COLORS.muted, fontSize: 12, marginTop: 5, textAlign: 'center' }, actions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 18 }, outlineAction: { flex: 1, minHeight: 45, borderRadius: 13, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, backgroundColor: COLORS.white, paddingHorizontal: 8 }, outlineText: { color: COLORS.forest, fontSize: 12, fontWeight: '700' }, preview: { width: '100%', height: 190, borderRadius: 15, backgroundColor: COLORS.cream }, fileRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 12 }, fileName: { flex: 1, fontSize: 12, color: COLORS.ink, fontWeight: '600' }, changeRow: { flexDirection: 'row', width: '100%', gap: 9, marginTop: 12 },
  primary: { marginTop: 15, minHeight: 54, borderRadius: 16, backgroundColor: COLORS.forest, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 17 }, primaryText: { color: COLORS.white, fontWeight: '700', fontSize: 15 }, disabled: { backgroundColor: '#AAB8AE' }, privacy: { flexDirection: 'row', justifyContent: 'center', gap: 7, alignItems: 'flex-start', paddingHorizontal: 8, marginTop: 11 }, privacyText: { color: COLORS.muted, fontSize: 10, lineHeight: 15, flex: 1 },
  supportSection: { marginTop: 28 }, sectionHeading: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 }, sectionTitle: { color: COLORS.forest, fontSize: 16, fontWeight: '800' }, sectionSub: { marginLeft: 'auto', color: COLORS.muted, fontSize: 10 }, classCard: { height: 47, backgroundColor: COLORS.white, borderRadius: 13, paddingHorizontal: 13, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.line }, classDot: { width: 8, height: 8, borderRadius: 5, marginRight: 10 }, className: { flex: 1, color: COLORS.ink, fontSize: 13, fontWeight: '600' }, disclaimer: { color: COLORS.muted, fontSize: 10, lineHeight: 15, marginTop: 3 }, footer: { textAlign: 'center', color: '#A5AEA6', fontSize: 8, letterSpacing: 1.5, fontWeight: '700', marginTop: 27 },
  loadingCard: { backgroundColor: COLORS.white, borderRadius: 15, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 14, borderWidth: 1, borderColor: COLORS.line }, loadingTitle: { fontSize: 13, color: COLORS.forest, fontWeight: '700' }, loadingHint: { fontSize: 11, color: COLORS.muted, marginTop: 3 }, errorCard: { backgroundColor: '#FFF1EE', borderRadius: 14, padding: 13, flexDirection: 'row', gap: 9, marginTop: 13, alignItems: 'flex-start' }, errorText: { color: '#873F36', fontSize: 12, lineHeight: 17 }, retry: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 }, retryText: { color: COLORS.leaf, fontSize: 12, fontWeight: '700' },
  eyebrowRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 9 }, eyebrowLine: { width: 19, height: 2, borderRadius: 2, backgroundColor: COLORS.leaf }, eyebrow: { color: COLORS.leaf, fontSize: 9, letterSpacing: 1.3, fontWeight: '800' }, resultImage: { width: '100%', height: 210, borderRadius: 20, marginBottom: 13, backgroundColor: COLORS.line }, resultCard: { backgroundColor: COLORS.white, borderRadius: 18, padding: 17, borderWidth: 1, borderColor: COLORS.line, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }, resultIcon: { height: 43, width: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 11 }, resultText: { flex: 1 }, resultLabel: { fontSize: 8, color: COLORS.muted, fontWeight: '800', letterSpacing: 1 }, resultName: { fontSize: 19, fontWeight: '800', marginTop: 3 }, percent: { color: COLORS.forest, fontWeight: '800', fontSize: 18 }, progressTrack: { height: 7, backgroundColor: '#EDF0EA', borderRadius: 6, width: '100%', marginTop: 15, overflow: 'hidden' }, progressFill: { height: '100%', borderRadius: 6 }, description: { width: '100%', color: COLORS.muted, lineHeight: 18, fontSize: 12, marginTop: 13 }, noteCard: { flexDirection: 'row', gap: 9, marginTop: 12, backgroundColor: '#EEF4E9', padding: 13, borderRadius: 14 }, noteText: { color: COLORS.forest, fontSize: 11, flex: 1, lineHeight: 16 }, secondary: { alignItems: 'center', paddingVertical: 15 }, secondaryText: { color: COLORS.forest, fontSize: 13, fontWeight: '700' }, unknownPill: { backgroundColor: '#F0F1ED', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10 }, unknownText: { color: COLORS.muted, fontSize: 9, fontWeight: '700' },
});
