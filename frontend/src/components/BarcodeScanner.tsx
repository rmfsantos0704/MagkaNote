import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Called once per successful scan with the raw barcode digits. */
  onScanned: (code: string) => void;
}

/**
 * Full-screen EAN-13 barcode scanner. Requires:
 *   npx expo install expo-camera
 * and, on a real device build (not just Expo Go), camera permission strings
 * in app.json — see the setup note in the chat reply.
 */
export function BarcodeScanner({ visible, onClose, onScanned }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false); // debounce: one scan per open

  const handleScan = ({ data }: { data: string }) => {
    if (locked) return;
    setLocked(true);
    onScanned(data);
  };

  // Reset the lock each time the scanner is (re)opened
  React.useEffect(() => {
    if (visible) setLocked(false);
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        {!permission ? (
          <View style={styles.center} />
        ) : !permission.granted ? (
          <SafeAreaView style={styles.center}>
            <Text style={styles.permissionTitle}>Camera access needed</Text>
            <Text style={styles.permissionBody}>
              MagkaNote needs your camera to scan a product's barcode.
            </Text>
            <Pressable onPress={requestPermission} style={styles.permissionButton}>
              <Text style={styles.permissionButtonText}>Allow Camera</Text>
            </Pressable>
            <Pressable onPress={onClose} style={styles.cancelLink}>
              <Text style={styles.cancelLinkText}>Cancel</Text>
            </Pressable>
          </SafeAreaView>
        ) : (
          <>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['ean13'] }}
              onBarcodeScanned={handleScan}
            />
            <View style={styles.overlay} pointerEvents="none">
              <View style={styles.frame} />
              <Text style={styles.hint}>Line up the barcode inside the frame</Text>
            </View>
            <SafeAreaView edges={['top']} style={styles.topBar}>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
            </SafeAreaView>
          </>
        )}
      </View>
    </Modal>
  );
}

const FRAME_SIZE = 260;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  permissionTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.cream, textAlign: 'center' },
  permissionBody: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: 'center' },
  permissionButton: {
    marginTop: 10,
    backgroundColor: colors.accent,
    borderRadius: radius,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  permissionButtonText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.onAccent },
  cancelLink: { marginTop: 4, padding: 10 },
  cancelLinkText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },

  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE * 0.6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: 'rgba(232,160,26,0.06)',
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.cream,
    backgroundColor: 'rgba(12,26,16,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  topBar: { position: 'absolute', top: 0, right: 0, left: 0, alignItems: 'flex-end', padding: 14 },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(12,26,16,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: { color: colors.cream, fontSize: 16 },
});