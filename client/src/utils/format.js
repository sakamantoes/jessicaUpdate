import { format, parseISO } from 'date-fns';

export const formatDate = (dateString, formatStr = 'MMM dd, yyyy') => {
  if (!dateString) return '';
  try {
    return format(parseISO(dateString), formatStr);
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
  if (dataType === 'blood_pressure') {
    try {
      const bp = JSON.parse(value);
      return `${bp.systolic}/${bp.diastolic}`;
    } catch {
      return value;
    }
  }
  return value;
};