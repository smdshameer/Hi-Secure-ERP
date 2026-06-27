import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { api, setToken } from '../services/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface CircuitTraceProps {
  startX: number;
  startY: number;
  path: { x: number; y: number }[];
  color: string;
  delay: number;
}

// Custom vector icons using primitive Views
const UserIcon = ({ color }: { color: string }) => (
  <View style={styles.iconContainer}>
    {/* Head */}
    <View style={[styles.userHead, { backgroundColor: color }]} />
    {/* Body */}
    <View style={[styles.userBody, { backgroundColor: color }]} />
  </View>
);

const LockIcon = ({ color }: { color: string }) => (
  <View style={styles.iconContainer}>
    {/* Shackle */}
    <View style={[styles.lockShackle, { borderColor: color }]} />
    {/* Body */}
    <View style={[styles.lockBody, { backgroundColor: color }]} />
  </View>
);

const ShieldIcon = ({ color }: { color: string }) => (
  <View style={styles.shieldWrapper}>
    {/* Shield outer outline */}
    <View style={[styles.shieldOuter, { borderColor: color }]}>
      {/* Glow dot / check in center */}
      <View style={[styles.shieldInner, { backgroundColor: color }]} />
    </View>
  </View>
);

const AlertIcon = ({ color }: { color: string }) => (
  <View style={styles.alertContainer}>
    <View style={[styles.alertTriangle, { borderBottomColor: color }]} />
    <Text style={styles.alertTextChar}>!</Text>
  </View>
);

// Background Neon Circuit Trace Component
function CircuitTrace({ startX, startY, path, color, delay }: CircuitTraceProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(progress, {
          toValue: 1,
          duration: 4000 + Math.random() * 3000,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  // Interpolate position along the multi-point path
  const translateX = progress.interpolate({
    inputRange: path.map((_, i) => i / (path.length - 1)),
    outputRange: path.map(p => p.x),
  });

  const translateY = progress.interpolate({
    inputRange: path.map((_, i) => i / (path.length - 1)),
    outputRange: path.map(p => p.y),
  });

  return (
    <>
      {/* Background wire path lines */}
      {path.map((p, idx) => {
        if (idx === 0) return null;
        const prev = path[idx - 1];
        const isHorizontal = prev.y === p.y;
        return (
          <View
            key={idx}
            style={{
              position: 'absolute',
              left: Math.min(prev.x, p.x),
              top: Math.min(prev.y, p.y),
              width: isHorizontal ? Math.abs(p.x - prev.x) + 1 : 1,
              height: isHorizontal ? 1 : Math.abs(p.y - prev.y) + 1,
              backgroundColor: 'rgba(255, 255, 255, 0.035)',
            }}
          />
        );
      })}
      
      {/* Moving Pulse Dot */}
      <Animated.View
        style={{
          position: 'absolute',
          left: Animated.subtract(translateX, 2.5),
          top: Animated.subtract(translateY, 2.5),
          width: 5,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 6,
          elevation: 4,
        }}
      />
    </>
  );
}

export default function LoginScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Input Focus States for Neon Borders
  const [userFocused, setUserFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  // Generate static layout for paths
  const traces = useRef<CircuitTraceProps[]>([
    {
      startX: 0,
      startY: 50,
      path: [{ x: 0, y: 50 }, { x: screenWidth * 0.4, y: 50 }, { x: screenWidth * 0.5, y: 120 }, { x: screenWidth * 0.5, y: 250 }],
      color: '#06b6d4',
      delay: 0,
    },
    {
      startX: screenWidth,
      startY: 120,
      path: [{ x: screenWidth, y: 120 }, { x: screenWidth * 0.7, y: 120 }, { x: screenWidth * 0.6, y: 180 }, { x: screenWidth * 0.6, y: 350 }],
      color: '#3b82f6',
      delay: 1500,
    },
    {
      startX: 40,
      startY: screenHeight,
      path: [{ x: 40, y: screenHeight }, { x: 40, y: screenHeight - 150 }, { x: screenWidth * 0.3, y: screenHeight - 220 }, { x: screenWidth * 0.3, y: screenHeight - 380 }],
      color: '#6366f1',
      delay: 800,
    },
    {
      startX: screenWidth - 40,
      startY: screenHeight - 50,
      path: [{ x: screenWidth - 40, y: screenHeight - 50 }, { x: screenWidth - 120, y: screenHeight - 50 }, { x: screenWidth - 180, y: screenHeight - 180 }, { x: 100, y: screenHeight - 180 }],
      color: '#10b981',
      delay: 2200,
    },
    {
      startX: 0,
      startY: screenHeight * 0.4,
      path: [{ x: 0, y: screenHeight * 0.4 }, { x: screenWidth * 0.2, y: screenHeight * 0.4 }, { x: screenWidth * 0.2, y: screenHeight * 0.6 }, { x: screenWidth, y: screenHeight * 0.6 }],
      color: '#06b6d4',
      delay: 3000,
    },
  ]).current;

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please fill all fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.login(username, password);
      setToken(res.token);
      navigation.navigate('dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Ambient Neon Background Glows */}
        <View style={styles.ambientCyan} />
        <View style={styles.ambientBlue} />

        {/* Circuit Traces */}
        {traces.map((trace, i) => (
          <CircuitTrace
            key={i}
            startX={trace.startX}
            startY={trace.startY}
            path={trace.path}
            color={trace.color}
            delay={trace.delay}
          />
        ))}

        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.cardContainer}>
            {/* Logo and Title */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <ShieldIcon color="#06b6d4" />
              </View>
              <Text style={styles.title}>
                Hi Secure <Text style={styles.titleHighlight}>ERP</Text>
              </Text>
              <Text style={styles.subtitle}>Enterprise Resources Console</Text>
            </View>

            {/* Error Message */}
            {!!error && (
              <View style={styles.errorBox}>
                <AlertIcon color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Form */}
            <View style={styles.form}>
              {/* Username field */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Username</Text>
                <View style={[
                  styles.inputWrapper,
                  userFocused && styles.inputWrapperFocused
                ]}>
                  <UserIcon color={userFocused ? '#06b6d4' : 'rgba(255,255,255,0.4)'} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter console username"
                    placeholderTextColor="rgba(255, 255, 255, 0.25)"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    onFocus={() => setUserFocused(true)}
                    onBlur={() => setUserFocused(false)}
                  />
                </View>
              </View>

              {/* Password field */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={[
                  styles.inputWrapper,
                  passFocused && styles.inputWrapperFocused
                ]}>
                  <LockIcon color={passFocused ? '#06b6d4' : 'rgba(255,255,255,0.4)'} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter console password"
                    placeholderTextColor="rgba(255, 255, 255, 0.25)"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setPassFocused(true)}
                    onBlur={() => setPassFocused(false)}
                  />
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.button}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Validating Console...</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Access console</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>© 2026 Hi Secure Solutions.</Text>
              <Text style={styles.footerText}>All rights reserved.</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05070f',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  ambientCyan: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    opacity: 0.8,
  },
  ambientBlue: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    opacity: 0.8,
  },
  cardContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  titleHighlight: {
    color: '#06b6d4',
  },
  subtitle: {
    fontSize: 11.5,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  errorBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 11.5,
    flex: 1,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputWrapperFocused: {
    borderColor: '#06b6d4',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    height: '100%',
    paddingLeft: 10,
  },
  button: {
    height: 44,
    backgroundColor: '#0066cc',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
    gap: 2,
  },
  footerText: {
    fontSize: 10,
    color: '#64748b',
  },
  
  // Custom Icon Styles
  iconContainer: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userHead: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 2,
  },
  userBody: {
    width: 12,
    height: 5,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  lockShackle: {
    width: 8,
    height: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
  },
  lockBody: {
    width: 10,
    height: 7,
    borderRadius: 1.5,
    position: 'absolute',
    bottom: 1,
  },
  shieldWrapper: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldOuter: {
    width: 26,
    height: 30,
    borderWidth: 2,
    borderBottomLeftRadius: 13,
    borderBottomRightRadius: 13,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  alertContainer: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  alertTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 15,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  alertTextChar: {
    position: 'absolute',
    color: '#000',
    fontSize: 9,
    fontWeight: 'bold',
    top: 2,
  }
});
