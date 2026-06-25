import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator } from 'react-native';
import { api } from '../services/api';

export default function DashboardScreen({ navigation }: any) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [techName, setTechName] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getJobs();
        if (cancelled) return;
        setJobs(data);
        if (data.length > 0 && data[0].customer) {
          setTechName(data[0].customer.customer_name || 'Technician');
        }
      } catch (err) {
        if (!cancelled) console.warn('Failed to load jobs:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Technician Dashboard</Text>
      <Text style={styles.subtitle}>Welcome, {techName}</Text>

      {loading ? (
        <ActivityIndicator color="#1a3480" style={{ marginTop: 20 }} />
      ) : (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{jobs.length}</Text>
            <Text style={styles.statLabel}>Assigned Jobs</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {jobs.filter((j: any) => j.status === 'IN_PROGRESS').length}
            </Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <Button title="View Assigned Jobs" onPress={() => navigation.navigate('AssignedJobs')} />
        <Button title="Notifications" onPress={() => navigation.navigate('Notifications')} />
        <Button title="My Profile" onPress={() => navigation.navigate('Profile')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#121212', justifyContent: 'center' },
  title: { fontSize: 26, color: '#fff', fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#aaa', marginBottom: 30, textAlign: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 30 },
  statBox: {
    backgroundColor: '#1a3480', padding: 20, borderRadius: 10,
    alignItems: 'center', minWidth: 120,
  },
  statNumber: { fontSize: 32, color: '#fff', fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: '#aab', marginTop: 4, textAlign: 'center' },
  buttonContainer: { gap: 15 },
});
