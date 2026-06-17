import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

export default function DashboardScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Technician Dashboard</Text>
      <Text style={styles.subtitle}>Welcome, Technician</Text>
      
      <View style={styles.buttonContainer}>
        <Button title="View Assigned Jobs" onPress={() => navigation.navigate('AssignedJobs')} />
        <Button title="Sync Queue Status" onPress={() => navigation.navigate('SyncQueue')} />
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
  buttonContainer: { gap: 15 }
});
