import React, { useState, useEffect } from 'react';
import { Plus, Pill, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { medicationService } from '../services/api';
import { formatDate, formatTime } from '../utils';
import toast from 'react-hot-toast';

const Medications = () => {
  const { patient } = useAuth();
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: '',
    purpose: '',
    schedule: {
      times: ['08:00'],
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }
  });

  useEffect(() => {
    loadMedications();
  }, [patient?.id]);

  const loadMedications = async () => {
    try {
      const response = await medicationService.getPatientMedications(patient.id);
      setMedications(response.data.data);
    } catch (error) {
      toast.error('Failed to load medications');
      console.error('Error loading medications:', error);
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
  };

  const handleScheduleTimeChange = (index, time) => {
    const newTimes = [...formData.schedule.times];
    newTimes[index] = time;
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        times: newTimes
      }
    }));
  };

  const addScheduleTime = () => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        times: [...prev.schedule.times, '12:00']
      }
    }));
  };

  const removeScheduleTime = (index) => {
    if (formData.schedule.times.length > 1) {
      const newTimes = formData.schedule.times.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        schedule: {
          ...prev.schedule,
          times: newTimes
        }
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const submissionData = {
        patientId: patient.id,
        ...formData
      };

      const response = await medicationService.addMedication(submissionData);
      
      if (response.data.success) {
        toast.success('Medication added successfully!');
        setShowAddForm(false);
        setFormData({
          name: '',
          dosage: '',
          frequency: '',
          purpose: '',
          schedule: {
            times: ['08:00'],
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
          }
        });
        loadMedications();
      }
    } catch (error) {
      toast.error('Failed to add medication');
      console.error('Error adding medication:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAsTaken = async (medicationId) => {
    try {
      await medicationService.markAsTaken(medicationId, {
        takenAt: new Date().toISOString()
      });
      toast.success('Medication marked as taken!');
      loadMedications();
    } catch (error) {
      toast.error('Failed to mark medication as taken');
      console.error('Error marking medication:', error);
    }
  };

  const getAdherenceColor = (adherence) => {
    if (adherence >= 80) return 'text-green-600';
    if (adherence >= 60) return 'text-yellow-600';
    return 'text-red-600';
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
          <h1 className="text-2xl font-bold text-gray-900">Medications</h1>
          <p className="text-gray-600">Manage your medication schedule and tracking</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Medication</span>
        </button>
      </div>

      {/* Add Medication Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add New Medication</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medication Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="e.g., Metformin"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dosage *
                  </label>
                  <input
                    type="text"
                    name="dosage"
                    value={formData.dosage}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="e.g., 500mg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency *
                  </label>
                  <input
                    type="text"
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="e.g., Once daily"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purpose
                  </label>
                  <input
                    type="text"
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="e.g., Blood sugar control"
                  />
                </div>
              </div>

              {/* Schedule Times */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule Times *
                </label>
                <div className="space-y-2">
                  {formData.schedule.times.map((time, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => handleScheduleTimeChange(index, e.target.value)}
                        className="input-field flex-1"
                        required
                      />
                      {formData.schedule.times.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeScheduleTime(index)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addScheduleTime}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    + Add another time
                  </button>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Medication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Medications Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {medications.map((medication) => (
          <div key={medication.id} className="card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Pill className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{medication.name}</h3>
                  <p className="text-sm text-gray-600">{medication.dosage}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-medium ${getAdherenceColor(medication.adherence)}`}>
                  {medication.adherence}% adherence
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Frequency:</strong> {medication.frequency}</p>
              {medication.purpose && (
                <p><strong>Purpose:</strong> {medication.purpose}</p>
              )}

              <div className="mt-3">
                <p className="font-medium text-gray-900 mb-2">Schedule:</p>
                <div className="space-y-1">
                  {medication.schedule?.times?.map((time, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{formatTime(time)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {medication.lastTaken && (
                <div className="flex items-center space-x-1 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Last taken: {formatDate(medication.lastTaken, 'MMM dd, HH:mm')}</span>
                </div>
              )}

              <div className="pt-3">
                <button
                  onClick={() => handleMarkAsTaken(medication.id)}
                  className="w-full btn-primary flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Mark as Taken</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {medications.length === 0 && (
        <div className="text-center py-12">
          <Pill className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No medications</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding your first medication.</p>
        </div>
      )}
    </div>
  );
};

export default Medications;