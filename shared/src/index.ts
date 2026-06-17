// Auth Types
export interface LoginRequest {
  username: string;
  password?: string;
}

export interface LoginResponse {
  token: string;
  user: {
    user_id: number;
    username: string;
    full_name: string;
    role: string;
    email: string;
  };
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password?: string;
}

// Field Service Types
export interface GPSTrackingPayload {
  visit_id: number;
  latitude: number;
  longitude: number;
}

export interface VisitCompleteRequest {
  visit_id: number;
  findings: string;
  signature_url?: string;
  photos?: {
    file_name: string;
    file_url: string;
    file_size?: number;
    latitude?: number;
    longitude?: number;
  }[];
}

export interface PartsConsumeRequest {
  job_id: number;
  part_id: number;
  location_id: number;
  quantity: number;
}

// Offline Sync Types
export interface OfflineMutation {
  entity_type: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  timestamp: string;
}

export interface SyncRequestPayload {
  device_id: string;
  mutations: OfflineMutation[];
}

// Customer Portal Types
export interface ComplaintRegistrationRequest {
  title: string;
  description: string;
  category?: string;
}

// Shared Validation Helper Stub
export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}
