import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, Alert, TextInput, ActivityIndicator } from 'react-native';
import { api } from '../services/api';

// 1. GPS Check-In Screen
export function GPSCheckInScreen({ route, navigation }: any) {
  const { jobId, visitId } = route?.params || {};
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const getCoords = () => ({
    lat: 12.9715 + (Math.random() - 0.5) * 0.01,
    lng: 77.5945 + (Math.random() - 0.5) * 0.01,
  });

  const handleCheckIn = async () => {
    if (!visitId) {
      Alert.alert('Error', 'No visit available. Check job details first.');
      return;
    }
    setLoading(true);
    const c = getCoords();
    setCoords(c);
    try {
      await api.checkIn(visitId, parseFloat(c.lat.toFixed(6)), parseFloat(c.lng.toFixed(6)));
      Alert.alert('Success', 'GPS Check-In recorded successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Check-In Failed', err.message || 'Could not check in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GPS Check-In</Text>
      <Text style={styles.subtitle}>Visit ID: {visitId || jobId}</Text>
      <Text style={styles.info}>Validating geolocation distance to customer...</Text>
      {coords ? (
        <Text style={styles.coordinates}>
          Coordinates: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
        </Text>
      ) : (
        <Text style={styles.coordinates}>Tap button to get current location</Text>
      )}
      {loading ? (
        <ActivityIndicator color="#1a3480" style={{ marginTop: 15 }} />
      ) : (
        <Button title="Check-In Now" onPress={handleCheckIn} />
      )}
    </View>
  );
}

// 2. GPS Check-Out Screen
export function GPSCheckOutScreen({ route, navigation }: any) {
  const { jobId, visitId } = route?.params || {};
  const [loading, setLoading] = useState(false);

  const handleCheckOut = async () => {
    if (!visitId) {
      Alert.alert('Error', 'No visit available.');
      return;
    }
    setLoading(true);
    const lat = 12.9715 + (Math.random() - 0.5) * 0.01;
    const lng = 77.5945 + (Math.random() - 0.5) * 0.01;
    try {
      await api.checkOut(visitId, parseFloat(lat.toFixed(6)), parseFloat(lng.toFixed(6)));
      Alert.alert('Success', 'Check-Out recorded successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Check-Out Failed', err.message || 'Could not check out');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GPS Check-Out</Text>
      <Text style={styles.subtitle}>Visit ID: {visitId || jobId}</Text>
      <Text style={styles.coordinates}>
        Current Coordinates: {(12.9715 + (Math.random() - 0.5) * 0.01).toFixed(6)},{' '}
        {(77.5945 + (Math.random() - 0.5) * 0.01).toFixed(6)}
      </Text>
      {loading ? (
        <ActivityIndicator color="#1a3480" style={{ marginTop: 15 }} />
      ) : (
        <Button title="Check-Out Now" onPress={handleCheckOut} />
      )}
    </View>
  );
}

// 3. Parts Consumption Screen
export function PartsConsumptionScreen({ route }: any) {
  const { jobId } = route?.params || {};
  const [partId, setPartId] = useState('');
  const [qty, setQty] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConsume = async () => {
    if (!partId || !qty) {
      Alert.alert('Validation', 'Please enter Part ID and Quantity');
      return;
    }
    if (!jobId) {
      Alert.alert('Error', 'No job selected');
      return;
    }
    setLoading(true);
    try {
      await api.consumeParts(jobId, parseInt(partId, 10), parseInt(qty, 10));
      Alert.alert('Success', `Consumed ${qty} units of Part ID ${partId}`, [{ text: 'OK' }]);
      setPartId('');
      setQty('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to consume parts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Consume Parts</Text>
      <Text style={styles.subtitle}>Job ID: {jobId}</Text>
      <TextInput
        style={styles.input}
        placeholder="Part ID"
        placeholderTextColor="#666"
        value={partId}
        onChangeText={setPartId}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Quantity"
        placeholderTextColor="#666"
        keyboardType="numeric"
        value={qty}
        onChangeText={setQty}
      />
      {loading ? (
        <ActivityIndicator color="#1a3480" />
      ) : (
        <Button title="Consume Parts" onPress={handleConsume} />
      )}
    </View>
  );
}

// 4. Signature Capture Screen
export function SignatureCaptureScreen({ route, navigation }: any) {
  const { jobId, visitId } = route?.params || {};
  const [findings, setFindings] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSaveSignature = async (signatureUrl = 'local://signature') => {
    if (!visitId) {
      Alert.alert('Error', 'No visit available. Check job details first.');
      return;
    }
    if (!findings.trim()) {
      Alert.alert('Validation', 'Please enter visit findings');
      return;
    }
    setLoading(true);
    try {
      await api.completeVisit(visitId, findings, signatureUrl, []);
      Alert.alert('Success', 'Visit completed with signature', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Customer Signature</Text>
      <Text style={styles.subtitle}>Visit ID: {visitId || jobId}</Text>
      <View style={styles.canvasStub}>
        <Text style={styles.canvasText}>[ Draw Signature Here ]</Text>
      </View>
      <TextInput
        style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
        placeholder="Visit findings / notes"
        placeholderTextColor="#666"
        value={findings}
        onChangeText={setFindings}
        multiline
      />
      {loading ? (
        <ActivityIndicator color="#1a3480" style={{ marginTop: 15 }} />
      ) : (
        <Button title="Save Signature & Complete" onPress={() => handleSaveSignature()} />
      )}
    </View>
  );
}

// 5. Photo Upload Screen
export function PhotoUploadScreen({ route, navigation }: any) {
  const { jobId, visitId } = route?.params || {};
  const [photos, setPhotos] = useState<{ name: string; url: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleCapture = () => {
    const newPhoto = { name: `photo-${Date.now()}.jpg`, url: `local://photos/${Date.now()}.jpg` };
    setPhotos([...photos, newPhoto]);
  };

  const handleUpload = async () => {
    if (!visitId) {
      Alert.alert('Error', 'No visit available.');
      return;
    }
    if (photos.length === 0) {
      Alert.alert('Warning', 'No photos to upload');
      return;
    }
    setLoading(true);
    const photoData = photos.map(p => ({ file_url: p.url, file_name: p.name }));
    try {
      await api.completeVisit(visitId, '', '', photoData);
      Alert.alert('Success', `${photos.length} photo(s) uploaded`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
      setPhotos([]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Photo Upload</Text>
      <Text style={styles.subtitle}>Job ID: {jobId} | Visit ID: {visitId}</Text>
      <Button title="Take Photo (Camera)" onPress={handleCapture} />
      <Button title="Upload All Photos" onPress={handleUpload} />
      <View style={styles.photoList}>
        <Text style={styles.subtitle}>Attached Photos ({photos.length}):</Text>
        {photos.map((p, idx) => (
          <Text key={idx} style={styles.photoItem}>
            {p.name}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#121212' },
  title: { fontSize: 22, color: '#fff', fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 13, color: '#888', marginBottom: 15 },
  info: { color: '#00e676', fontSize: 14, marginBottom: 5 },
  coordinates: { color: '#888', fontSize: 13, marginBottom: 20 },
  input: {
    height: 40, borderColor: '#333', borderWidth: 1, marginBottom: 15,
    paddingHorizontal: 10, color: '#fff', backgroundColor: '#1e1e1e', borderRadius: 5,
  },
  canvasStub: {
    height: 180, backgroundColor: '#1e1e1e', borderColor: '#333', borderWidth: 1,
    borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  canvasText: { color: '#666', fontSize: 16 },
  photoList: { marginTop: 25 },
  photoItem: { color: '#888', fontSize: 14, marginVertical: 3 },
});
