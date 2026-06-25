import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Button, Alert, ActivityIndicator } from 'react-native';
import { api, setToken } from '../services/api';

// 1. Sync Queue Screen
export function SyncQueueScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    try {
      const { database } = await import('../db');
      const collection = database.get('sync_queue');
      const records = await collection.query().fetch();
      setItems(records.map((r: any) => r._raw));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const triggerSync = async () => {
    try {
      const { database } = await import('../db');
      const collection = database.get('sync_queue');
      const records = await collection.query().fetch();
      for (const rec of records) {
        try {
          const payload = rec._raw;
          if (payload.operation === 'create') {
            if (payload.entity_type === 'visit') {
              await api.completeVisit(payload.payload.visit_id, payload.payload.findings || '', payload.payload.signature_url || '', payload.payload.photos || []);
            }
          }
          await collection.destroyPermanently(rec);
        } catch (e) {
          console.warn('Sync item failed:', e);
        }
      }
      await loadQueue();
      Alert.alert('Sync Complete', 'Pending items have been processed');
    } catch (err) {
      Alert.alert('Sync Failed', 'Could not sync pending items');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Offline Sync Queue</Text>
      <Button title="Sync Now" onPress={triggerSync} />
      {loading ? (
        <ActivityIndicator color="#1a3480" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => String(item.id || i)}
          ListEmptyComponent={<Text style={styles.emptyText}>No pending items</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.entity_type || 'Unknown'}</Text>
              <Text style={[styles.status, item.status === 'PENDING' ? styles.pending : styles.synced]}>
                Status: {item.status || 'PENDING'}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

// 2. Notifications Screen
export function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Connect to backend notifications API when available
    setNotifications([]);
    setLoading(false);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      {loading ? (
        <ActivityIndicator color="#1a3480" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item, i) => String(item.id || i)}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No new notifications</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.time}>{item.time}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

// 3. Profile Screen
export function ProfileScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.me();
        if (!cancelled) setUser(data);
      } catch (err) {
        console.warn('Failed to load profile:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleLogout = () => {
    setToken('');
    navigation.navigate('login');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#1a3480" style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Profile</Text>
      <View style={styles.profileBox}>
        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Username</Text>
          <Text style={styles.profileValue}>{user?.username || 'N/A'}</Text>
        </View>
        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Role</Text>
          <Text style={[styles.profileValue, { color: '#42a5f5' }]}>{user?.role || 'N/A'}</Text>
        </View>
        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>User ID</Text>
          <Text style={styles.profileValue}>{user?.user_id || 'N/A'}</Text>
        </View>
      </View>
      <Button title="Logout" color="#d32f2f" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#121212' },
  title: { fontSize: 22, color: '#fff', fontWeight: 'bold', marginBottom: 15 },
  card: {
    padding: 15, backgroundColor: '#1e1e1e', borderRadius: 8, marginBottom: 10,
    borderColor: '#333', borderWidth: 1,
  },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  status: { fontSize: 14, fontWeight: 'bold', marginTop: 5 },
  pending: { color: '#ffeb3b' },
  synced: { color: '#00e676' },
  time: { color: '#666', fontSize: 12, marginTop: 5 },
  body: { color: '#ccc', fontSize: 14, marginTop: 4 },
  profileBox: {
    padding: 20, backgroundColor: '#1e1e1e', borderRadius: 8, marginBottom: 25,
    borderColor: '#333', borderWidth: 1,
  },
  profileRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomColor: '#333', borderBottomWidth: 1,
  },
  profileLabel: { color: '#888', fontSize: 14 },
  profileValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 30, fontSize: 16 },
});
