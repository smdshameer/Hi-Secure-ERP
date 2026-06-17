import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Button } from 'react-native';

// 1. Assigned Jobs Screen
export function AssignedJobsScreen({ navigation }: any) {
  const mockJobs = [
    { id: '1', job_number: 'JOB-2026-001', status: 'ASSIGNED', customer: 'Acme Corp' },
    { id: '2', job_number: 'JOB-2026-002', status: 'IN_PROGRESS', customer: 'Nexus Ltd' }
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Assigned Jobs</Text>
      <FlatList
        data={mockJobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('JobDetails', { jobId: item.id })}
          >
            <Text style={styles.cardTitle}>{item.job_number}</Text>
            <Text style={styles.cardSubtitle}>Status: {item.status}</Text>
            <Text style={styles.cardSubtitle}>Customer: {item.customer}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// 2. Job Details Screen
export function JobDetailsScreen({ route, navigation }: any) {
  const { jobId } = route?.params || { jobId: '1' };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Job Details (ID: {jobId})</Text>
      <Text style={styles.label}>Job Number: JOB-2026-001</Text>
      <Text style={styles.label}>Priority: HIGH</Text>
      <Text style={styles.label}>Problem: AC leak and compressor replacement required.</Text>
      
      <View style={styles.actionGroup}>
        <Button title="View Customer Details" onPress={() => navigation.navigate('CustomerDetails', { jobId })} />
        <Button title="GPS Check-In" onPress={() => navigation.navigate('GPSCheckIn', { jobId })} />
        <Button title="GPS Check-Out" onPress={() => navigation.navigate('GPSCheckOut', { jobId })} />
        <Button title="Consume Parts" onPress={() => navigation.navigate('PartsConsumption', { jobId })} />
        <Button title="Capture Customer Signature" onPress={() => navigation.navigate('SignatureCapture', { jobId })} />
        <Button title="Upload Photo Attachments" onPress={() => navigation.navigate('PhotoUpload', { jobId })} />
      </View>
    </View>
  );
}

// 3. Customer Details Screen
export function CustomerDetailsScreen({ route }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Customer Information</Text>
      <Text style={styles.label}>Name: Acme Corp</Text>
      <Text style={styles.label}>Contact Person: John Doe</Text>
      <Text style={styles.label}>Phone: +91 98765 43210</Text>
      <Text style={styles.label}>Address: 123 Industrial Area, Phase II, Bangalore, Karnataka</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#121212' },
  title: { fontSize: 22, color: '#fff', fontWeight: 'bold', marginBottom: 15 },
  card: { padding: 15, backgroundColor: '#1e1e1e', borderRadius: 8, marginBottom: 10, borderColor: '#333', borderWidth: 1 },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cardSubtitle: { color: '#aaa', fontSize: 14, marginTop: 4 },
  label: { color: '#fff', fontSize: 16, marginBottom: 8 },
  actionGroup: { gap: 10, marginTop: 20 }
});
