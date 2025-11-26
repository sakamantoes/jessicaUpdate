// src/utils/index.js

// Health data types and units
export const HEALTH_DATA_TYPES = {
  blood_pressure: 'Blood Pressure',
  blood_sugar: 'Blood Sugar',
  heart_rate: 'Heart Rate',
  weight: 'Weight',
  cholesterol: 'Cholesterol',
  oxygen_saturation: 'Oxygen Saturation',
  activity_level: 'Activity Level',
  sleep_quality: 'Sleep Quality'
};

export const HEALTH_UNITS = {
  blood_pressure: 'mmHg',
  blood_sugar: 'mg/dL',
  heart_rate: 'bpm',
  weight: 'kg',
  cholesterol: 'mg/dL',
  oxygen_saturation: '%',
  activity_level: 'minutes',
  sleep_quality: 'hours'
};

export const RISK_LEVELS = {
  low: { color: 'green', label: 'Low' },
  moderate: { color: 'yellow', label: 'Moderate' },
  high: { color: 'orange', label: 'High' },
  critical: { color: 'red', label: 'Critical' }
};

export const MOTIVATION_LEVELS = {
  low: { color: 'red', label: 'Low', message: 'Let\'s build some momentum!' },
  medium: { color: 'yellow', label: 'Medium', message: 'You\'re making good progress!' },
  high: { color: 'green', label: 'High', message: 'Excellent work! Keep it up!' }
};

// Date formatting utilities
export const formatDate = (dateString, formatStr = 'MMM dd, yyyy') => {
  if (!dateString) return '';
  try {
    // Simple date formatting without date-fns dependency
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    
    if (formatStr === 'MMM dd, yyyy') {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } else if (formatStr === 'yyyy-MM-dd') {
      return date.toISOString().split('T')[0];
    } else if (formatStr === 'MMM dd, yyyy HH:mm') {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    return date.toLocaleDateString('en-US', options);
  } catch {
    return 'Invalid Date';
  }
};

export const formatTime = (timeString) => {
  if (!timeString) return '';
  try {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch {
    return timeString;
  }
};

export const formatHealthValue = (dataType, value) => {
  if (!value) return 'N/A';
  
  if (dataType === 'blood_pressure') {
    try {
      if (typeof value === 'string') {
        const bp = JSON.parse(value);
        return `${bp.systolic}/${bp.diastolic}`;
      } else if (typeof value === 'object') {
        return `${value.systolic}/${value.diastolic}`;
      }
      return value;
    } catch {
      return value;
    }
  }
  return value;
};

// Validation utilities
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  return password.length >= 6;
};

export const validateBloodPressure = (value) => {
  try {
    const [systolic, diastolic] = value.split('/').map(v => parseInt(v.trim()));
    return !isNaN(systolic) && !isNaN(diastolic);
  } catch {
    return false;
  }
};

// Number formatting
export const formatNumber = (num, decimals = 1) => {
  if (num === null || num === undefined) return '0';
  return parseFloat(num).toFixed(decimals);
};

export const calculatePercentage = (part, total) => {
  if (!total || total === 0) return 0;
  return Math.round((part / total) * 100);
};

// Local storage utilities
export const getFromStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const setToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export const removeFromStorage = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

// API error handling
export const handleApiError = (error) => {
  if (error.response) {
    return error.response.data?.message || 'Server error occurred';
  } else if (error.request) {
    return 'Network error - please check your connection';
  } else {
    return error.message || 'An unexpected error occurred';
  }
};

// Health data utilities
export const getNormalRange = (dataType) => {
  const ranges = {
    blood_pressure: { min: '90/60', max: '120/80' },
    blood_sugar: { min: '70', max: '100' },
    heart_rate: { min: '60', max: '100' },
    cholesterol: { min: '0', max: '200' },
    weight: { min: '18.5', max: '24.9' } // BMI range
  };
  return ranges[dataType] || { min: 'N/A', max: 'N/A' };
};

export const getRiskLevel = (dataType, value) => {
  if (!value) return 'low';
  
  try {
    switch (dataType) {
      case 'blood_pressure':
        const bp = typeof value === 'string' ? JSON.parse(value) : value;
        if (bp.systolic > 180 || bp.diastolic > 120) return 'critical';
        if (bp.systolic > 140 || bp.diastolic > 90) return 'high';
        if (bp.systolic > 130 || bp.diastolic > 85) return 'moderate';
        return 'low';
        
      case 'blood_sugar':
        const sugar = parseFloat(value);
        if (sugar > 240) return 'critical';
        if (sugar > 180) return 'high';
        if (sugar > 140) return 'moderate';
        return 'low';
        
      case 'heart_rate':
        const hr = parseFloat(value);
        if (hr > 120 || hr < 50) return 'high';
        if (hr > 100 || hr < 60) return 'moderate';
        return 'low';
        
      default:
        return 'low';
    }
  } catch {
    return 'low';
  }
};

// Progress calculation
export const calculateGoalProgress = (current, target) => {
  if (!target || target === 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
};

// Time utilities
export const getTimeAgo = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return formatDate(dateString);
};

export const isToday = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

// Medication utilities
export const getNextMedicationTime = (schedule) => {
  if (!schedule?.times || schedule.times.length === 0) return null;
  
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  
  // Find the next scheduled time today
  const nextTime = schedule.times
    .sort()
    .find(time => time > currentTime);
  
  if (nextTime) {
    return `${nextTime} today`;
  }
  
  // If no more times today, return first time tomorrow
  return `${schedule.times[0]} tomorrow`;
};

// Export all utilities
export default {
  HEALTH_DATA_TYPES,
  HEALTH_UNITS,
  RISK_LEVELS,
  MOTIVATION_LEVELS,
  formatDate,
  formatTime,
  formatHealthValue,
  validateEmail,
  validatePassword,
  validateBloodPressure,
  formatNumber,
  calculatePercentage,
  getFromStorage,
  setToStorage,
  removeFromStorage,
  handleApiError,
  getNormalRange,
  getRiskLevel,
  calculateGoalProgress,
  getTimeAgo,
  isToday,
  getNextMedicationTime
};