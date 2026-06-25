import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import { AssignedJobsScreen, JobDetailsScreen, CustomerDetailsScreen } from './src/screens/JobsScreens';
import {
  GPSCheckInScreen, GPSCheckOutScreen, PartsConsumptionScreen,
  SignatureCaptureScreen, PhotoUploadScreen
} from './src/screens/WorkflowScreens';
import { SyncQueueScreen, NotificationsScreen, ProfileScreen } from './src/screens/MiscScreens';

type ScreenName =
  | 'login'
  | 'dashboard'
  | 'assignedJobs'
  | 'jobDetails'
  | 'customerDetails'
  | 'gpsCheckIn'
  | 'gpsCheckOut'
  | 'partsConsumption'
  | 'signatureCapture'
  | 'photoUpload'
  | 'syncQueue'
  | 'notifications'
  | 'profile';

interface NavState {
  screen: ScreenName;
  params?: Record<string, any>;
}

export default function App() {
  const [nav, setNav] = useState<NavState>({ screen: 'login' });

  const navigate = useCallback((screen: ScreenName, params?: Record<string, any>) => {
    setNav({ screen, params });
  }, []);

  const goBack = useCallback(() => {
    setNav({ screen: 'dashboard' });
  }, []);

  const navigation = { navigate, goBack, replace: navigate };

  const renderScreen = () => {
    switch (nav.screen) {
      case 'login':
        return <LoginScreen navigation={navigation} />;
      case 'dashboard':
        return <DashboardScreen navigation={navigation} />;
      case 'assignedJobs':
        return <AssignedJobsScreen navigation={navigation} route={{ params: nav.params }} />;
      case 'jobDetails':
        return <JobDetailsScreen navigation={navigation} route={{ params: nav.params }} />;
      case 'customerDetails':
        return <CustomerDetailsScreen navigation={navigation} route={{ params: nav.params }} />;
      case 'gpsCheckIn':
        return <GPSCheckInScreen navigation={navigation} route={{ params: nav.params }} />;
      case 'gpsCheckOut':
        return <GPSCheckOutScreen navigation={navigation} route={{ params: nav.params }} />;
      case 'partsConsumption':
        return <PartsConsumptionScreen navigation={navigation} route={{ params: nav.params }} />;
      case 'signatureCapture':
        return <SignatureCaptureScreen navigation={navigation} route={{ params: nav.params }} />;
      case 'photoUpload':
        return <PhotoUploadScreen navigation={navigation} route={{ params: nav.params }} />;
      case 'syncQueue':
        return <SyncQueueScreen navigation={navigation} route={{ params: nav.params }} />;
      case 'notifications':
        return <NotificationsScreen navigation={navigation} route={{ params: nav.params }} />;
      case 'profile':
        return <ProfileScreen navigation={navigation} route={{ params: nav.params }} />;
      default:
        return <LoginScreen navigation={navigation} />;
    }
  };

  return <View style={styles.container}>{renderScreen()}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
});
