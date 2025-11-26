import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Calendar, Shield, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/api';
import { formatDate, formatTime } from '../utils';
import toast from 'react-hot-toast';

const Profile = () => {
  const { patient, updatePatient } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dateOfBirth: '',
    gender: '',
    chronicConditions: [],
    preferredEmailTime: '',
    phoneNumber: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    }
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const chronicConditionsOptions = [
    'Diabetes',
    'Hypertension',
    'Heart Disease',
    'Asthma',
    'COPD',
    'Arthritis',
    'Chronic Kidney Disease',
    'Other'
  ];

  useEffect(() => {
    if (patient) {
      setProfileData({
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        email: patient.email || '',
        dateOfBirth: patient.dateOfBirth ? formatDate(patient.dateOfBirth, 'yyyy-MM-dd') : '',
        gender: patient.gender || '',
        chronicConditions: patient.chronicConditions || [],
        preferredEmailTime: patient.preferredEmailTime ? patient.preferredEmailTime.slice(0, 5) : '09:00',
        phoneNumber: patient.phoneNumber || '',
        emergencyContact: patient.emergencyContact || {
          name: '',
          phone: '',
          relationship: ''
        }
      });
    }
  }, [patient]);

  const handleProfileChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setProfileData(prev => ({
        ...prev,
        chronicConditions: checked
          ? [...prev.chronicConditions, value]
          : prev.chronicConditions.filter(condition => condition !== value)
      }));
    } else if (name.startsWith('emergencyContact.')) {
      const field = name.split('.')[1];
      setProfileData(prev => ({
        ...prev,
        emergencyContact: {
          ...prev.emergencyContact,
          [field]: value
        }
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert preferredEmailTime to proper format
      const submissionData = {
        ...profileData,
        preferredEmailTime: `${profileData.preferredEmailTime}:00`
      };

      const response = await authService.updateProfile(submissionData);
      
      if (response.data.success) {
        updatePatient(response.data.data.patient);
        toast.success('Profile updated successfully!');
      }
    } catch (error) {
      toast.error('Failed to update profile');
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      setLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const response = await authService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      
      if (response.data.success) {
        toast.success('Password changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
      console.error('Error changing password:', error);
    } finally {
      setLoading(false);
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
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600">Manage your account information and preferences</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <User className="h-4 w-4 inline mr-2" />
            Profile Information
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Shield className="h-4 w-4 inline mr-2" />
            Security
          </button>
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card p-6">
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
                
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={profileData.firstName}
                    onChange={handleProfileChange}
                    className="mt-1 input-field"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={profileData.lastName}
                    onChange={handleProfileChange}
                    className="mt-1 input-field"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={profileData.email}
                      onChange={handleProfileChange}
                      className="input-field pl-10"
                      required
                    />
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
                    Date of Birth
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      value={profileData.dateOfBirth}
                      onChange={handleProfileChange}
                      className="input-field pl-10"
                      required
                    />
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                    Gender
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={profileData.gender}
                    onChange={handleProfileChange}
                    className="mt-1 input-field"
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Health & Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Health & Contact</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chronic Conditions
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {chronicConditionsOptions.map((condition) => (
                      <label key={condition} className="flex items-center">
                        <input
                          type="checkbox"
                          value={condition}
                          checked={profileData.chronicConditions.includes(condition)}
                          onChange={handleProfileChange}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{condition}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      value={profileData.phoneNumber}
                      onChange={handleProfileChange}
                      className="input-field pl-10"
                    />
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label htmlFor="preferredEmailTime" className="block text-sm font-medium text-gray-700">
                    Preferred Email Time *
                  </label>
                  <input
                    id="preferredEmailTime"
                    name="preferredEmailTime"
                    type="time"
                    value={profileData.preferredEmailTime}
                    onChange={handleProfileChange}
                    className="mt-1 input-field"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Choose when you'd like to receive daily health updates (system checks every 2 minutes)
                  </p>
                </div>

                {/* Emergency Contact */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Emergency Contact</h4>
                  
                  <input
                    name="emergencyContact.name"
                    type="text"
                    placeholder="Full Name"
                    value={profileData.emergencyContact.name}
                    onChange={handleProfileChange}
                    className="input-field"
                  />
                  
                  <input
                    name="emergencyContact.phone"
                    type="tel"
                    placeholder="Phone Number"
                    value={profileData.emergencyContact.phone}
                    onChange={handleProfileChange}
                    className="input-field"
                  />
                  
                  <input
                    name="emergencyContact.relationship"
                    type="text"
                    placeholder="Relationship"
                    value={profileData.emergencyContact.relationship}
                    onChange={handleProfileChange}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{loading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="card p-6">
          <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-md">
            <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
            
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                Current Password
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className="mt-1 input-field"
                required
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="mt-1 input-field"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="mt-1 input-field"
                required
              />
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center space-x-2"
              >
                <Shield className="h-4 w-4" />
                <span>{loading ? 'Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Profile;