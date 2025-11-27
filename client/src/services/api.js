import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://jessicaupdate-production.up.railway.app/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Enhanced response interceptor to handle token expiration and errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('patient');
      window.location.href = '/login';
    }
    
    // Enhanced error logging
    console.error('API Error:', {
      status: error.response?.status,
      message: error.response?.data?.message,
      url: error.config?.url
    });
    
    return Promise.reject(error);
  }
);

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (patientData) => api.post('/auth/register', patientData),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (updates) => api.put('/auth/profile', updates),
  changePassword: (currentPassword, newPassword) => 
    api.post('/auth/change-password', { currentPassword, newPassword }),
  refreshToken: () => api.post('/auth/refresh-token'),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => 
    api.post('/auth/reset-password', { token, newPassword }),
};

export const patientService = {
  getProfile: (patientId) => api.get(`/patients/profile/${patientId}`),
  getDashboard: (patientId) => api.get(`/patients/${patientId}/dashboard`),
  updateProfile: (patientId, updates) => api.put(`/patients/profile/${patientId}`, updates),
};


export const healthService = {
  addData: (data) => {
    console.log('Sending health data:', data);
    return api.post('/health-data', data);
  },
  getPatientData: (patientId, params) => api.get(`/health-data/patient/${patientId}`, { params }),
  getTrends: (patientId, params) => api.get(`/health-data/patient/${patientId}/trends`, { params }),
};

export const medicationService = {
  addMedication: (data) => api.post('/medications', data),
  getPatientMedications: (patientId) => api.get(`/medications/patient/${patientId}`),
  markAsTaken: (medicationId, data) => api.post(`/medications/${medicationId}/taken`, data),
  updateMedication: (medicationId, updates) => api.put(`/medications/${medicationId}`, updates),
  deleteMedication: (medicationId) => api.delete(`/medications/${medicationId}`),
};

export const goalService = {
  createGoal: (data) => api.post('/goals', data),
  getPatientGoals: (patientId) => api.get(`/goals/patient/${patientId}`),
  updateProgress: (goalId, data) => api.patch(`/goals/${goalId}/progress`, data),
  deleteGoal: (goalId) => api.delete(`/goals/${goalId}`),
};

export const reminderService = {
  getPatientReminders: (patientId, params) => api.get(`/reminders/patient/${patientId}`, { params }),
  createReminder: (data) => api.post('/reminders', data),
  markComplete: (reminderId) => api.patch(`/reminders/${reminderId}/complete`),
  deleteReminder: (reminderId) => api.delete(`/reminders/${reminderId}`),
};

export const aiAnalysisService = {
  getComprehensiveAnalysis: (patientId) => api.get(`/ai-analysis/patient/${patientId}/comprehensive`),
  getRiskAssessment: (patientId) => api.get(`/ai-analysis/patient/${patientId}/risk-assessment`),
  getTrendAnalysis: (patientId, dataType, days) => 
    api.get(`/ai-analysis/patient/${patientId}/trends/${dataType}?days=${days}`),
  getMedicationInsights: (patientId) => api.get(`/ai-analysis/patient/${patientId}/medication-insights`),
  getMotivationalInsights: (patientId) => api.get(`/ai-analysis/patient/${patientId}/motivational-insights`),
  getPredictions: (patientId, dataType, forecastDays) => 
    api.post(`/ai-analysis/patient/${patientId}/predictions`, { dataType, forecastDays }),
  getRecommendations: (patientId) => api.get(`/ai-analysis/patient/${patientId}/recommendations`),
  getProgressReport: (patientId, period) => 
    api.get(`/ai-analysis/patient/${patientId}/progress-report?period=${period}`),
  analyzeHealthData: (patientId, healthData) => 
    api.post('/ai-analysis/analyze-health-data', { patientId, healthData }),
};

export default api;