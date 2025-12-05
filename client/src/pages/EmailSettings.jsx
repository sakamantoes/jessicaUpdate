import React, { useState, useEffect } from 'react';
import { Mail, Bell, Clock, Save, TestTube, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/api';
import toast from 'react-hot-toast';

const EmailSettings = () => {
  const { patient, updatePatient } = useAuth();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [schedulerInfo, setSchedulerInfo] = useState(null);

  const [settings, setSettings] = useState({
    preferredEmailTime: '09:00',
    emailNotifications: true,
    receiveMotivationalEmails: true,
    receiveMedicationReminders: true,
    receiveHealthAlerts: true,
    receiveProgressReports: true
  });

  useEffect(() => {
    if (patient) {
      setSettings({
        preferredEmailTime: patient.preferredEmailTime ? patient.preferredEmailTime.slice(0, 5) : '09:00',
        emailNotifications: patient.emailNotifications !== false, // Default to true
        receiveMotivationalEmails: true,
        receiveMedicationReminders: true,
        receiveHealthAlerts: true,
        receiveProgressReports: true
      });

      // Fetch scheduler status
      fetchSchedulerInfo();
    }
  }, [patient]);

  const fetchSchedulerInfo = async () => {
    try {
      // You would need to create this endpoint in your backend
      // const response = await authService.getSchedulerInfo();
      // setSchedulerInfo(response.data);
      
      // For now, use static info based on EmailScheduler implementation
      setSchedulerInfo({
        checkInterval: '5 minutes',
        dailyUpdateInterval: '30 minutes',
        operatingHours: '7 AM - 9 PM',
        lastCheck: new Date().toLocaleTimeString()
      });
    } catch (error) {
      console.error('Error fetching scheduler info:', error);
    }
  };

  const handleSettingChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    
    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(settings.preferredEmailTime)) {
      toast.error('Please enter a valid time in HH:MM format');
      return;
    }

    setLoading(true);

    try {
      const updates = {
        preferredEmailTime: `${settings.preferredEmailTime}:00`,
        emailNotifications: settings.emailNotifications,
        // Save all preferences - you might want to store these as JSON or separate fields
        emailPreferences: {
          motivational: settings.receiveMotivationalEmails,
          medication: settings.receiveMedicationReminders,
          alerts: settings.receiveHealthAlerts,
          reports: settings.receiveProgressReports
        }
      };

      const response = await authService.updateProfile(updates);
      
      if (response.data.success) {
        updatePatient(response.data.data.patient);
        toast.success('Email settings saved successfully!');
        
        // Trigger scheduler reload on backend
        try {
          await authService.reloadScheduler();
          console.log('Scheduler reload triggered');
        } catch (schedulerError) {
          console.log('Note: Scheduler reload not available');
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save email settings');
      console.error('Error saving email settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    setTesting(true);
    try {
      // Call backend test email endpoint
      const response = await authService.sendTestEmail();
      
      if (response.data.success) {
        toast.success('Test email sent! Check your inbox.');
      } else {
        toast.error(response.data.message || 'Failed to send test email');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send test email');
      console.error('Error sending test email:', error);
    } finally {
      setTesting(false);
    }
  };

  if (!patient) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Email Settings</h1>
        <p className="text-gray-600">Manage your email preferences and reminders</p>
      </div>

      {/* Scheduler Status Card */}
      {schedulerInfo && (
        <div className="card p-4 bg-blue-50 border border-blue-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-900">Email Scheduler Status</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                <div>
                  <span className="text-blue-700">Medication checks:</span>
                  <span className="font-semibold ml-1">{schedulerInfo.checkInterval}</span>
                </div>
                <div>
                  <span className="text-blue-700">Daily updates:</span>
                  <span className="font-semibold ml-1">{schedulerInfo.dailyUpdateInterval}</span>
                </div>
                <div>
                  <span className="text-blue-700">Operating hours:</span>
                  <span className="font-semibold ml-1">{schedulerInfo.operatingHours}</span>
                </div>
                <div>
                  <span className="text-blue-700">Last check:</span>
                  <span className="font-semibold ml-1">{schedulerInfo.lastCheck}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card p-6">
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Global Email Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Email Notifications</h4>
              <p className="text-sm text-gray-500">Enable or disable all email notifications</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="emailNotifications"
                checked={settings.emailNotifications}
                onChange={handleSettingChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Mail className="h-5 w-5 mr-2 text-blue-600" />
              Email Schedule
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="preferredEmailTime" className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Email Time
                </label>
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <input
                    id="preferredEmailTime"
                    name="preferredEmailTime"
                    type="time"
                    value={settings.preferredEmailTime}
                    onChange={handleSettingChange}
                    className="input-field"
                    required
                    disabled={!settings.emailNotifications}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  <strong>System checks every 5 minutes</strong> - Your daily health update will be sent at this time
                </p>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={testing || !settings.emailNotifications}
                  className="btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <TestTube className="h-4 w-4" />
                  <span>{testing ? 'Sending...' : 'Send Test Email'}</span>
                </button>
              </div>
            </div>
          </div>

          {settings.emailNotifications && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Bell className="h-5 w-5 mr-2 text-green-600" />
                Email Preferences
              </h3>
              
              <div className="space-y-4">
                {[
                  { 
                    id: 'motivational', 
                    name: 'receiveMotivationalEmails',
                    label: 'Motivational Emails', 
                    description: 'Daily encouragement and progress updates' 
                  },
                  { 
                    id: 'medication', 
                    name: 'receiveMedicationReminders',
                    label: 'Medication Reminders', 
                    description: 'Reminders for your medication schedule' 
                  },
                  { 
                    id: 'alerts', 
                    name: 'receiveHealthAlerts',
                    label: 'Health Alerts', 
                    description: 'Important health notifications and warnings' 
                  },
                  { 
                    id: 'reports', 
                    name: 'receiveProgressReports',
                    label: 'Progress Reports', 
                    description: 'Weekly and monthly progress summaries' 
                  }
                ].map((pref) => (
                  <div key={pref.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <input
                      id={pref.name}
                      name={pref.name}
                      type="checkbox"
                      checked={settings[pref.name]}
                      onChange={handleSettingChange}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={!settings.emailNotifications}
                    />
                    <div className="flex-1">
                      <label 
                        htmlFor={pref.name}
                        className="text-sm font-medium text-gray-700"
                      >
                        {pref.label}
                      </label>
                      <p className="text-sm text-gray-500">{pref.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Information Card */}
      <div className="card p-6 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-medium text-blue-900 mb-2">How Email Scheduling Works</h3>
        <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
          <li>System checks for medication reminders every <strong>5 minutes</strong></li>
          <li>Daily motivational emails checked every <strong>30 minutes</strong></li>
          <li>Emails are only sent between <strong>7 AM - 9 PM</strong> to respect your rest time</li>
          <li>Health alerts are sent immediately when critical issues detected</li>
          <li>Medication reminders based on your specific medication schedule</li>
          <li>All emails include personalized health insights and recommendations</li>
        </ul>
        <div className="mt-4 p-3 bg-white rounded border border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> After saving settings, it may take up to 5 minutes for changes to take effect.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailSettings;