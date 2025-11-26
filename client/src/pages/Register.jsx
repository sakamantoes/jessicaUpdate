import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, Calendar, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    chronicConditions: [],
    preferredEmailTime: '09:00',
    phoneNumber: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        chronicConditions: checked
          ? [...prev.chronicConditions, value]
          : prev.chronicConditions.filter(condition => condition !== value)
      }));
    } else if (name.startsWith('emergencyContact.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        emergencyContact: {
          ...prev.emergencyContact,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...submitData } = formData;
      
      // Convert preferredEmailTime to proper format
      submitData.preferredEmailTime = `${submitData.preferredEmailTime}:00`;

      const result = await register(submitData);
      
      if (result.success) {
        toast.success('Account created successfully!');
        navigate('/dashboard');
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center">
            <UserPlus className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
              
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name *
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="mt-1 input-field"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name *
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="mt-1 input-field"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 input-field"
                />
              </div>

              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
                  Date of Birth *
                </label>
                <input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  required
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="mt-1 input-field"
                />
              </div>

              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                  Gender *
                </label>
                <select
                  id="gender"
                  name="gender"
                  required
                  value={formData.gender}
                  onChange={handleChange}
                  className="mt-1 input-field"
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
                <div className="space-y-2">
                  {chronicConditionsOptions.map((condition) => (
                    <label key={condition} className="flex items-center">
                      <input
                        type="checkbox"
                        value={condition}
                        checked={formData.chronicConditions.includes(condition)}
                        onChange={handleChange}
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
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="mt-1 input-field"
                />
              </div>

              <div>
                <label htmlFor="preferredEmailTime" className="block text-sm font-medium text-gray-700">
                  Preferred Email Time
                </label>
                <input
                  id="preferredEmailTime"
                  name="preferredEmailTime"
                  type="time"
                  value={formData.preferredEmailTime}
                  onChange={handleChange}
                  className="mt-1 input-field"
                />
              </div>

              {/* Emergency Contact */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Emergency Contact</h4>
                
                <input
                  name="emergencyContact.name"
                  type="text"
                  placeholder="Full Name"
                  value={formData.emergencyContact.name}
                  onChange={handleChange}
                  className="input-field"
                />
                
                <input
                  name="emergencyContact.phone"
                  type="tel"
                  placeholder="Phone Number"
                  value={formData.emergencyContact.phone}
                  onChange={handleChange}
                  className="input-field"
                />
                
                <input
                  name="emergencyContact.relationship"
                  type="text"
                  placeholder="Relationship"
                  value={formData.emergencyContact.relationship}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          {/* Password Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Security</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password *
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="input-field pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password *
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="mt-1 input-field"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;