import React, { useState, useEffect } from 'react';
import { Plus, Target, TrendingUp, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { goalService } from '../services/api';
import { formatDate } from '../utils';
import toast from 'react-hot-toast';

const Goals = () => {
  const { patient } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingProgress, setUpdatingProgress] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'medication_adherence',
    targetValue: '',
    unit: '',
    deadline: ''
  });

  const goalCategories = {
    medication_adherence: 'Medication Adherence',
    blood_pressure: 'Blood Pressure',
    blood_sugar: 'Blood Sugar',
    weight: 'Weight',
    exercise: 'Exercise',
    diet: 'Diet'
  };

  useEffect(() => {
    loadGoals();
  }, [patient?.id]);

  const loadGoals = async () => {
    try {
      const response = await goalService.getPatientGoals(patient.id);
      setGoals(response.data.data);
    } catch (error) {
      toast.error('Failed to load goals');
      console.error('Error loading goals:', error);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const submissionData = {
        patientId: patient.id,
        ...formData,
        targetValue: parseFloat(formData.targetValue)
      };

      const response = await goalService.createGoal(submissionData);
      
      if (response.data.success) {
        toast.success('Goal created successfully!');
        setShowAddForm(false);
        setFormData({
          title: '',
          description: '',
          category: 'medication_adherence',
          targetValue: '',
          unit: '',
          deadline: ''
        });
        loadGoals();
      }
    } catch (error) {
      toast.error('Failed to create goal');
      console.error('Error creating goal:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProgress = async (goalId, currentValue) => {
    setUpdatingProgress(goalId);
    try {
      await goalService.updateProgress(goalId, { currentValue: parseFloat(currentValue) });
      toast.success('Progress updated!');
      loadGoals();
    } catch (error) {
      toast.error('Failed to update progress');
      console.error('Error updating progress:', error);
    } finally {
      setUpdatingProgress(null);
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const activeGoals = goals.filter(goal => !goal.isAchieved);
  const achievedGoals = goals.filter(goal => goal.isAchieved);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Health Goals</h1>
          <p className="text-gray-600">Set and track your health objectives</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Add Goal Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-xl font-bold mb-4">Create New Goal</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Goal Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="e.g., Improve medication adherence"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  >
                    {Object.entries(goalCategories).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Value *
                  </label>
                  <input
                    type="number"
                    name="targetValue"
                    value={formData.targetValue}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="e.g., 100"
                    step="0.1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit *
                  </label>
                  <input
                    type="text"
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="e.g., %, mg/dL, kg"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="input-field"
                    placeholder="Describe your goal and why it's important..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deadline (Optional)
                  </label>
                  <input
                    type="date"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleInputChange}
                    className="input-field"
                  />
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
                  {submitting ? 'Creating...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Goals */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Goals</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeGoals.map((goal) => (
            <div key={goal.id} className="card p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Target className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{goal.title}</h3>
                    <p className="text-sm text-gray-600 capitalize">
                      {goalCategories[goal.category]}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-500">
                  {goal.progress}%
                </span>
              </div>

              {goal.description && (
                <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
              )}

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{goal.currentValue} / {goal.targetValue} {goal.unit}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(goal.progress)}`}
                      style={{ width: `${Math.min(goal.progress, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {goal.deadline && (
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Deadline: {formatDate(goal.deadline)}</span>
                  </div>
                )}

                <div className="flex space-x-2">
                  <input
                    type="number"
                    placeholder="Current value"
                    className="input-field flex-1 text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleUpdateProgress(goal.id, e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.target.previousSibling;
                      handleUpdateProgress(goal.id, input.value);
                      input.value = '';
                    }}
                    disabled={updatingProgress === goal.id}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {updatingProgress === goal.id ? '...' : 'Update'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {activeGoals.length === 0 && (
          <div className="text-center py-8">
            <Target className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No active goals</h3>
            <p className="mt-1 text-sm text-gray-500">Create your first goal to get started.</p>
          </div>
        )}
      </div>

      {/* Achieved Goals */}
      {achievedGoals.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Achieved Goals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {achievedGoals.map((goal) => (
              <div key={goal.id} className="card p-4 border-green-200 bg-green-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{goal.title}</h3>
                      <p className="text-sm text-gray-600 capitalize">
                        {goalCategories[goal.category]}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-green-600">
                    Completed!
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Achieved:</strong> {goal.targetValue} {goal.unit}</p>
                  {goal.deadline && (
                    <p><strong>Completed on:</strong> {formatDate(goal.updatedAt)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;