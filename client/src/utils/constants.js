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