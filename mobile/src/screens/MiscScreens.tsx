import React from 'react';
import { View, Text, StyleSheet, FlatList, Button, Alert } from 'react-native';

// 1. Sync Queue Screen
export function SyncQueueScreen() {
  const syncItems = [
    { id: '1', type: 'Parts Consumption', status: 'PENDING', time: '10 mins ago' },
    { id: '2', type: 'GPS Check-In', status: 'SYNCED', time: '1 hour ago' }
  ];

  const triggerSync = () => {
    Alert.alert('Offline Sync', 'Syncing pending mutations to backend...');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Offline Sync Queue</Text>
      <Button title="Sync Now" onPress={triggerSync} />
      <FlatList
        data={syncItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.type}</Text>
            <Text style={[styles.status, item.status === 'PENDING' ? styles.pending : styles.synced]}>
              Status: {item.status}
            </Text>
            <Text style={styles.time}>{item.time}</Text>
          </View>
        )}
      />
    </View>
  );
}

// 2. Notifications Screen
export function NotificationsScreen() {
  const notifications = [
    { id: '1', title: 'New Job Assigned', body: 'You have been assigned job JOB-2026-003.', time: '2 hours ago' },
    { id: '2', title: 'SLA Warning', body: 'Job JOB-2026-001 is nearing SLA breach.', time: '4 hours ago' }
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.time}>{item.time}</Text>
          </View>
        )}
      />
    </View>
  );
}

// 3. Profile Screen
export function ProfileScreen({ navigation }: any) {
  const handleLogout = () => {
    Alert.alert('Logout', 'Logging out and blacklisting token...');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Profile</Text>
      <View style={styles.profileBox}>
        <Text style={styles.label}>Name: John Technician</Text>
        <Text style={styles.label}>Username: john_tech</Text>
        <Text style={styles.label}>Role: FIELD_TECHNICIAN</Text>
        <Text style={styles.label}>Service Center: Bengaluru HQ</Text>
      </View>
      <Button title="Logout" color="#d32f2f" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#121212' },
  title: { fontSize: 22, color: '#fff', fontWeight: 'bold', marginBottom: 15 },
  card: { padding: 15, backgroundColor: '#1e1e1e', borderRadius: 8, marginBottom: 10, borderColor: '#333', borderWidth: 1 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  status: { fontSize: 14, fontWeight: 'bold', marginTop: 5 },
  pending: { color: '#ffeb3b' },
  synced: { color: '#00e676' },
  time: { color: '#666', fontSize: 12, marginTop: 5 },
  body: { color: '#ccc', fontSize: 14, marginTop: 4 },
  profileBox: { padding: 20, backgroundColor: '#1e1e1e', borderRadius: 8, marginBottom: 25, borderColor: '#333', borderWidth: 1 },
  label: { color: '#fff', fontSize: 15, marginBottom: 10 }
});
