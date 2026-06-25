import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { api, setToken } from '../services/api';

export default function LoginScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await api.login(username, password);
      setToken(res.token);
      navigation.navigate('dashboard');
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>HiSecure Mobile ERP</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {loading ? (
        <ActivityIndicator color="#1a3480" style={{ marginTop: 15 }} />
      ) : (
        <Button title="Sign In" onPress={handleLogin} color="#1a3480" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#121212' },
  title: { fontSize: 24, color: '#fff', marginBottom: 30, textAlign: 'center', fontWeight: 'bold' },
  input: {
    height: 44, borderColor: '#333', borderWidth: 1, marginBottom: 15,
    paddingHorizontal: 14, color: '#fff', backgroundColor: '#1e1e1e', borderRadius: 6,
  },
});
