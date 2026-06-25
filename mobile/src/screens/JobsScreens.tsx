import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Button, ActivityIndicator, Alert } from 'react-native';
import { api } from '../services/api';

// 1. Assigned Jobs Screen
export function AssignedJobsScreen({ route, navigation }: any) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getJobs();
        if (!cancelled) setJobs(data);
      } catch (err) {
        console.warn('Failed to load jobs:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const priorityColor = (p: string) => {
    switch (p) {
      case 'HIGH': return '#f44336';
      case 'MEDIUM': return '#ff9800';
      case 'LOW': return '#4caf50';
      default: return '#888';
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'ASSIGNED': return '#42a5f5';
      case 'IN_PROGRESS': return '#ff9800';
      case 'COMPLETED': return '#66bb6a';
      default: return '#888';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Assigned Jobs</Text>
      {loading ? (
        <ActivityIndicator color="#1a3480" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('jobDetails', { jobId: item.id, job: item })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.job_number || `JOB-${item.id}`}</Text>
              </View>
              <View style={styles.tagRow}>
                <Text style={[styles.tag, { backgroundColor: priorityColor(item.priority || 'MEDIUM') }]}>
                  {item.priority || 'MEDIUM'}
                </Text>
                <Text style={[styles.tag, { backgroundColor: statusColor(item.status || 'ASSIGNED') }]}>
                  {item.status || 'ASSIGNED'}
                </Text>
              </View>
              {item.customer && (
                <Text style={styles.cardSubtitle}>{item.customer.customer_name}</Text>
              )}
              {item.customer?.address && (
                <Text style={styles.cardAddress} numberOfLines={1}>
                  {item.customer.address}
                </Text>
              )}
              {item.problem_description && (
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {item.problem_description}
                </Text>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No jobs assigned yet</Text>
          }
        />
      )}
    </View>
  );
}

// 2. Job Details Screen
export function JobDetailsScreen({ route, navigation }: any) {
  const { jobId, job: initialJob } = route?.params || { job: null };
  const [job, setJob] = useState<any>(initialJob);
  const [loading, setLoading] = useState(!initialJob);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialJob && initialJob.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const allJobs = await api.getJobs();
        if (cancelled) return;
        const found = allJobs.find((j: any) => String(j.id) === String(jobId));
        if (found) setJob(found);
      } catch (err) {
        console.warn(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [jobId, initialJob]);

  const handleComplete = async () => {
    if (!job || !job.visits || job.visits.length === 0) {
      Alert.alert('Error', 'No visit found. Check in first.');
      return;
    }
    setSubmitting(true);
    try {
      await api.completeVisit(job.visits[0].id, 'Completed on site', '', []);
      Alert.alert('Success', 'Visit completed', [{ text: 'OK', onPress: () => navigation.navigate('assignedJobs') }]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const visitId = job?.visits?.[0]?.id;

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#1a3480" style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{job?.job_number || `Job #${jobId}`}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Status</Text>
        <Text style={[styles.value, { color: '#42a5f5' }]}>{job?.status || 'N/A'}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Priority</Text>
        <Text style={[styles.value, { color: '#f44336' }]}>{job?.priority || 'MEDIUM'}</Text>
      </View>
      {job?.customer && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Customer</Text>
            <Text style={styles.value}>{job.customer.customer_name}</Text>
            {job.customer.phone && <Text style={styles.subValue}>{job.customer.phone}</Text>}
          </View>
          {job.customer.address && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Address</Text>
              <Text style={styles.value}>{job.customer.address}</Text>
            </View>
          )}
        </>
      )}
      {job?.problem_description && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Problem</Text>
          <Text style={styles.value}>{job.problem_description}</Text>
        </View>
      )}

      <View style={styles.actionGroup}>
        <Button title="GPS Check-In" onPress={() => navigation.navigate('gpsCheckIn', { jobId, visitId })} />
        <Button title="GPS Check-Out" onPress={() => navigation.navigate('gpsCheckOut', { jobId, visitId })} />
        <Button title="Parts" onPress={() => navigation.navigate('partsConsumption', { jobId })} />
        <Button title="Signature" onPress={() => navigation.navigate('signatureCapture', { jobId, visitId })} />
        <Button title="Photos" onPress={() => navigation.navigate('photoUpload', { jobId, visitId })} />
        <Button title="Complete Visit" onPress={handleComplete} />
      </View>
    </View>
  );
}

// 3. Customer Details Screen
export function CustomerDetailsScreen({ route }: any) {
  const { jobId } = route?.params || {};
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Customer Information</Text>
      <Text style={styles.label}>Job ID: {jobId}</Text>
      <Text style={styles.label}>Tap a job to see full details with customer info.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#121212' },
  title: { fontSize: 22, color: '#fff', fontWeight: 'bold', marginBottom: 15 },
  section: { marginBottom: 12, padding: 12, backgroundColor: '#1e1e1e', borderRadius: 8, borderColor: '#333', borderWidth: 1 },
  sectionLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  value: { fontSize: 16, color: '#fff' },
  subValue: { fontSize: 14, color: '#aaa', marginTop: 4 },
  tagRow: { flexDirection: 'row', gap: 8, marginVertical: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, color: '#fff', fontSize: 12, fontWeight: 'bold' },
  actionGroup: { gap: 8, marginTop: 20 },
  card: {
    padding: 14, backgroundColor: '#1e1e1e', borderRadius: 8, marginBottom: 10,
    borderColor: '#333', borderWidth: 1,
  },
  cardHeader: { marginBottom: 6 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cardSubtitle: { color: '#ccc', fontSize: 13, marginVertical: 2 },
  cardAddress: { color: '#888', fontSize: 12, marginVertical: 2 },
  cardDesc: { color: '#aaa', fontSize: 13, marginTop: 4 },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 30, fontSize: 16 },
  label: { color: '#fff', fontSize: 15, marginBottom: 8 },
});
