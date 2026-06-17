import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, Alert, TextInput } from 'react-native';

// 1. GPS Check-In Screen
export function GPSCheckInScreen({ route, navigation }: any) {
  const { jobId } = route?.params || { jobId: '1' };

  const handleCheckIn = () => {
    Alert.alert('GPS Check-In', 'Checked in successfully at Lat: 12.9715, Lng: 77.5945');
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GPS Check-In</Text>
      <Text style={styles.subtitle}>Job ID: {jobId}</Text>
      <Text style={styles.info}>Validating geolocation distance to customer...</Text>
      <Text style={styles.coordinates}>Current Coordinates: 12.971598, 77.594562</Text>
      <Button title="Check-In Now" onPress={handleCheckIn} />
    </View>
  );
}

// 2. GPS Check-Out Screen
export function GPSCheckOutScreen({ route, navigation }: any) {
  const { jobId } = route?.params || { jobId: '1' };

  const handleCheckOut = () => {
    Alert.alert('GPS Check-Out', 'Checked out successfully. Recording log...');
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GPS Check-Out</Text>
      <Text style={styles.subtitle}>Job ID: {jobId}</Text>
      <Text style={styles.coordinates}>Current Coordinates: 12.971598, 77.594562</Text>
      <Button title="Check-Out Now" onPress={handleCheckOut} />
    </View>
  );
}

// 3. Parts Consumption Screen
export function PartsConsumptionScreen({ route, navigation }: any) {
  const [partId, setPartId] = useState('');
  const [qty, setQty] = useState('');

  const handleConsume = () => {
    Alert.alert('Success', `Consumed ${qty} units of Part ID ${partId}`);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Consume Parts</Text>
      <TextInput
        style={styles.input}
        placeholder="Part ID"
        placeholderTextColor="#666"
        value={partId}
        onChangeText={setPartId}
      />
      <TextInput
        style={styles.input}
        placeholder="Quantity"
        placeholderTextColor="#666"
        keyboardType="numeric"
        value={qty}
        onChangeText={setQty}
      />
      <Button title="Consume Parts" onPress={handleConsume} />
    </View>
  );
}

// 4. Signature Capture Screen
export function SignatureCaptureScreen({ route, navigation }: any) {
  const handleSaveSignature = () => {
    Alert.alert('Signature Captured', 'Signature saved as visit signature asset.');
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Customer Signature</Text>
      <View style={styles.canvasStub}>
        <Text style={styles.canvasText}>[ Draw Signature Here ]</Text>
      </View>
      <Button title="Save Signature" onPress={handleSaveSignature} />
    </View>
  );
}

// 5. Photo Upload Screen
export function PhotoUploadScreen({ route, navigation }: any) {
  const [photos, setPhotos] = useState<string[]>([]);

  const handleCapture = () => {
    const newPhoto = `photo-${Date.now()}.jpg`;
    setPhotos([...photos, newPhoto]);
    Alert.alert('Camera', 'Photo captured and saved to offline queue.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Photo Upload</Text>
      <Button title="Take Photo (Camera)" onPress={handleCapture} />
      <View style={styles.photoList}>
        <Text style={styles.subtitle}>Attached Photos ({photos.length}):</Text>
        {photos.map((p, idx) => (
          <Text key={idx} style={styles.photoItem}>{p}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#121212' },
  title: { fontSize: 22, color: '#fff', fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#aaa', marginBottom: 15 },
  info: { color: '#00e676', fontSize: 14, marginBottom: 5 },
  coordinates: { color: '#888', fontSize: 13, marginBottom: 20 },
  input: { height: 40, borderColor: '#333', borderWidth: 1, marginBottom: 15, paddingHorizontal: 10, color: '#fff', backgroundColor: '#1e1e1e', borderRadius: 5 },
  canvasStub: { height: 180, backgroundColor: '#1e1e1e', borderColor: '#333', borderWidth: 1, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  canvasText: { color: '#666', fontSize: 16 },
  photoList: { marginTop: 25 },
  photoItem: { color: '#888', fontSize: 14, marginVertical: 3 }
});
