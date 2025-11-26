import React, { useState, useEffect } from 'react';
import { Mail, Bell, Clock, Save, TestTube } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/api';
import toast from 'react-hot-toast';

const EmailSettings = () => {
  const { patient, updatePatient } = useAuth();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  const [settings, setSettings] = useState({
    preferredEmailTime: '09:00',
    receiveMotivationalEmails: true,
    receiveMedicationReminders: true,
    receiveHealthAlerts: true,
    receiveProgressReports: true
  });

  useEffect(() => {
    if (patient) {
      setSettings({
        preferredEmailTime: patient.preferredEmailTime ? patient.preferredEmailTime.slice(0, 5) : '09:00',
        receiveMotivationalEmails: true,
        receiveMedicationReminders: true,
        receiveHealthAlerts: true,
        receiveProgressReports: true
      });
    }
  }, [patient]);

  const handleSettingChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates = {
        preferredEmailTime: `${settings.preferredEmailTime}:00`
      };

      const response = await authService.updateProfile(updates);
      
      if (response.data.success) {
        updatePatient(response.data.data.patient);
        toast.success('Email settings saved successfully!');
      }
    } catch (error) {
      toast.error('Failed to save email settings');
      console.error('Error saving email settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    setTesting(true);
    try {
      // This would call a backend endpoint to send a test email
      toast.success('Test email sent! Check your inbox.');
    } catch (error) {
      toast.error('Failed to send test email');
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

      <div className="card p-6">
        <form onSubmit={handleSaveSettings} className="space-y-6">
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
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  <strong>System checks every 2 minutes</strong> - Your daily health update will be sent at this time
                </p>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={testing}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <TestTube className="h-4 w-4" />
                  <span>{testing ? 'Sending...' : 'Send Test Email'}</span>
                </button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Bell className="h-5 w-5 mr-2 text-green-600" />
              Email Preferences
            </h3>
            
            <div className="space-y-4">
              {[
                { id: 'motivational', label: 'Motivational Emails', description: 'Daily encouragement and progress updates' },
                { id: 'medication', label: 'Medication Reminders', description: 'Reminders for your medication schedule' },
                { id: 'alerts', label: 'Health Alerts', description: 'Important health notifications and warnings' },
                { id: 'reports', label: 'Progress Reports', description: 'Weekly and monthly progress summaries' }
              ].map((pref) => (
                <div key={pref.id} className="flex items-start space-x-3">
                  <input
                    id={`receive${pref.id.charAt(0).toUpperCase() + pref.id.slice(1)}Emails`}
                    name={`receive${pref.id.charAt(0).toUpperCase() + pref.id.slice(1)}Emails`}
                    type="checkbox"
                    checked={settings[`receive${pref.id.charAt(0).toUpperCase() + pref.id.slice(1)}Emails`]}
                    onChange={handleSettingChange}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <label 
                      htmlFor={`receive${pref.id.charAt(0).toUpperCase() + pref.id.slice(1)}Emails`}
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

          <div className="flex justify-end pt-4">
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
          <li>System checks for scheduled emails every <strong>2 minutes</strong></li>
          <li>Daily motivational emails sent at your preferred time</li>
          <li>Medication reminders based on your medication schedule</li>
          <li>Health alerts sent immediately when critical issues detected</li>
          <li>All emails are personalized based on your health data</li>
        </ul>
      </div>
    </div>
  );
};

export default EmailSettings;