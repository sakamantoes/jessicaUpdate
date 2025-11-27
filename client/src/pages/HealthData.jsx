import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { healthService, aiAnalysisService } from '../services/api';
import { HEALTH_DATA_TYPES, HEALTH_UNITS, formatDate, formatHealthValue } from '../utils';
import toast from 'react-hot-toast';

const HealthData = () => {
  const { patient } = useAuth();
  const [healthData, setHealthData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    dataType: 'blood_pressure',
    value: '',
    unit: HEALTH_UNITS['blood_pressure'],
    notes: ''
  });

  useEffect(() => {
    if (patient?.id) {
      loadHealthData();
    }
  }, [patient?.id]);

  const loadHealthData = async () => {
    try {
      const response = await healthService.getPatientData(patient.id, { limit: 50 });
      if (response.data.success) {
        setHealthData(response.data.data);
      } else {
        toast.error('Failed to load health data');
      }
    } catch (error) {
      console.error('Error loading health data:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load health data';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Set default unit when data type changes
    if (name === 'dataType') {
      setFormData(prev => ({
        ...prev,
        dataType: value,
        unit: HEALTH_UNITS[value] || '',
        value: '' // Reset value when type changes
      }));
    }
  };

  const validateForm = () => {
    if (!formData.value.trim()) {
      toast.error('Please enter a value');
      return false;
    }

    if (formData.dataType === 'blood_pressure') {
      const bpRegex = /^\d{2,3}\/\d{2,3}$/;
      if (!bpRegex.test(formData.value)) {
        toast.error('Please enter blood pressure in format: 120/80');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      let processedValue = formData.value;

      // Process blood pressure value
      if (formData.dataType === 'blood_pressure') {
        const [systolic, diastolic] = formData.value.split('/').map(v => parseInt(v.trim()));
        if (isNaN(systolic) || isNaN(diastolic)) {
          toast.error('Please enter blood pressure in format: 120/80');
          setSubmitting(false);
          return;
        }
        processedValue = JSON.stringify({ systolic, diastolic });
      }

      const submissionData = {
        patientId: patient.id,
        dataType: formData.dataType,
        value: processedValue,
        unit: formData.unit,
        notes: formData.notes,
        recordedAt: new Date().toISOString()
      };

      console.log('Submitting health data:', submissionData);

      const response = await healthService.addData(submissionData);
      
      if (response.data.success) {
        toast.success('Health data added successfully!');
        setShowAddForm(false);
        setFormData({
          dataType: 'blood_pressure',
          value: '',
          unit: HEALTH_UNITS['blood_pressure'],
          notes: ''
        });
        await loadHealthData(); // Reload data
      } else {
        toast.error(response.data.message || 'Failed to add health data');
      }
    } catch (error) {
      console.error('Error adding health data:', error);
      const errorMessage = error.response?.data?.message || 'Failed to add health data. Please try again.';
      toast.error(errorMessage);
      
      // Log detailed error for debugging
      if (error.response) {
        console.error('Server response:', error.response.data);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getRiskColor = (riskLevel) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      moderate: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[riskLevel] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Health Data</h1>
          <p className="text-gray-600">Track and monitor your health metrics</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Data</span>
        </button>
      </div>

      {/* Add Data Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Add Health Data</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Type
                </label>
                <select
                  name="dataType"
                  value={formData.dataType}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                >
                  {Object.entries(HEALTH_DATA_TYPES).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Value
                  {formData.dataType === 'blood_pressure' && (
                    <span className="text-gray-500 text-xs ml-1">(format: 120/80)</span>
                  )}
                </label>
                <input
                  type="text"
                  name="value"
                  value={formData.value}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder={
                    formData.dataType === 'blood_pressure' ? '120/80' : 
                    `Enter ${HEALTH_DATA_TYPES[formData.dataType]} value`
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="input-field"
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Health Data Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {healthData.map((data) => (
          <div key={data.id} className="card p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {HEALTH_DATA_TYPES[data.dataType]}
                </h3>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatHealthValue(data.dataType, data.value)} {data.unit}
                </p>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskColor(data.riskLevel)}`}>
                {data.riskLevel}
              </span>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(data.recordedAt, 'MMM dd, yyyy HH:mm')}</span>
              </div>
              
              {data.notes && (
                <p className="text-sm text-gray-600">{data.notes}</p>
              )}

              {data.aiAnalysis && (
                <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs text-blue-800">
                    <strong>AI Insight:</strong> {data.aiAnalysis.insights?.[0]}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {healthData.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No health data</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding your first health measurement.</p>
        </div>
      )}
    </div>
  );
};

export default HealthData;