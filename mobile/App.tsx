import React from 'react';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import {
  AssignedJobsScreen,
  JobDetailsScreen,
  CustomerDetailsScreen
} from './src/screens/JobsScreens';
import {
  GPSCheckInScreen,
  GPSCheckOutScreen,
  PartsConsumptionScreen,
  SignatureCaptureScreen,
  PhotoUploadScreen
} from './src/screens/WorkflowScreens';
import {
  SyncQueueScreen,
  NotificationsScreen,
  ProfileScreen
} from './src/screens/MiscScreens';

export default function App() {
  // Mock simple navigation shell
  return (
    <React.Fragment>
      <LoginScreen />
      <DashboardScreen />
      <AssignedJobsScreen />
      <JobDetailsScreen />
      <CustomerDetailsScreen />
      <GPSCheckInScreen />
      <GPSCheckOutScreen />
      <PartsConsumptionScreen />
      <SignatureCaptureScreen />
      <PhotoUploadScreen />
      <SyncQueueScreen />
      <NotificationsScreen />
      <ProfileScreen />
    </React.Fragment>
  );
}
