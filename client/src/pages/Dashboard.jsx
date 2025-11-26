import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Heart, 
  Pill, 
  Target, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  Brain,
  RefreshCw
} from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { useAuth } from '../contexts/AuthContext';
import { patientService, aiAnalysisService } from '../services/api';
import { MOTIVATION_LEVELS, formatDate, formatHealthValue } from '../utils';
import toast from 'react-hot-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Dashboard = () => {
  const { patient } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (patient?.id) {
      loadDashboardData();
      loadAIInsights();
    }
  }, [patient?.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading dashboard data for patient:', patient?.id);
      
      const response = await patientService.getDashboard(patient.id);
      console.log('Dashboard API response:', response.data);
      
      if (response.data.success) {
        setDashboardData(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setError('Failed to load dashboard data. Please try again.');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadAIInsights = async () => {
    try {
      const response = await aiAnalysisService.getMotivationalInsights(patient.id);
      if (response.data.success) {
        setAiInsights(response.data.data);
      }
    } catch (error) {
      console.error('Error loading AI insights:', error);
      // Don't show toast for this as it's non-critical
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadDashboardData();
    await loadAIInsights();
    setRefreshing(false);
    toast.success('Dashboard refreshed!');
  };

  // Safe data access functions with fallbacks
  const getRecentHealthData = () => {
    return dashboardData?.recentHealthData || [];
  };

  const getMedications = () => {
    return dashboardData?.medications || [];
  };

  const getGoals = () => {
    return dashboardData?.goals || [];
  };

  const getFeedback = () => {
    return dashboardData?.feedback || [];
  };

  const getMotivationData = () => {
    return dashboardData?.motivation || {
      motivationLevel: 'medium',
      adherenceScore: 0,
      activityScore: 0
    };
  };

  // Prepare chart data safely
  const bloodPressureData = {
    labels: getRecentHealthData()
      .filter(d => d.dataType === 'blood_pressure')
      .slice(0, 7)
      .map(d => formatDate(d.recordedAt, 'MMM dd'))
      .reverse(),
    datasets: [
      {
        label: 'Systolic',
        data: getRecentHealthData()
          .filter(d => d.dataType === 'blood_pressure')
          .slice(0, 7)
          .map(d => {
            try {
              const bp = typeof d.value === 'string' ? JSON.parse(d.value) : d.value;
              return bp.systolic || 0;
            } catch {
              return 0;
            }
          })
          .reverse(),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Diastolic',
        data: getRecentHealthData()
          .filter(d => d.dataType === 'blood_pressure')
          .slice(0, 7)
          .map(d => {
            try {
              const bp = typeof d.value === 'string' ? JSON.parse(d.value) : d.value;
              return bp.diastolic || 0;
            } catch {
              return 0;
            }
          })
          .reverse(),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const motivation = getMotivationData();
  const adherenceData = {
    labels: ['Adherence', 'Remaining'],
    datasets: [
      {
        data: [motivation.adherenceScore || 0, Math.max(0, 100 - (motivation.adherenceScore || 0))],
        backgroundColor: [
          (motivation.adherenceScore || 0) >= 80 ? '#10b981' : 
          (motivation.adherenceScore || 0) >= 60 ? '#f59e0b' : '#ef4444',
          '#e5e7eb'
        ],
        borderWidth: 0,
      },
    ],
  };

  const motivationInfo = MOTIVATION_LEVELS[motivation.motivationLevel || 'medium'];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading dashboard</h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <button
          onClick={loadDashboardData}
          className="mt-4 btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Your health overview and insights</p>
        </div>
        <button
          onClick={refreshData}
          disabled={refreshing}
          className="btn-secondary flex items-center space-x-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back, {patient?.firstName || 'there'}!
            </h1>
            <p className="text-blue-100 mt-1">
              {aiInsights?.messages?.[0] || "Your health journey matters. Let's make today count!"}
            </p>
          </div>
          <Brain className="h-12 w-12 text-blue-200" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Activity className="h-6 w-6" />}
          title="Motivation Level"
          value={motivationInfo.label}
          description={motivationInfo.message}
          color={motivationInfo.color}
        />
        <StatCard
          icon={<Heart className="h-6 w-6" />}
          title="Medication Adherence"
          value={`${Math.round(motivation.adherenceScore || 0)}%`}
          description="This week's adherence"
          color={(motivation.adherenceScore || 0) >= 80 ? 'green' : (motivation.adherenceScore || 0) >= 60 ? 'yellow' : 'red'}
        />
        <StatCard
          icon={<Pill className="h-6 w-6" />}
          title="Active Medications"
          value={getMedications().length}
          description="Currently taking"
          color="purple"
        />
        <StatCard
          icon={<Target className="h-6 w-6" />}
          title="Active Goals"
          value={getGoals().length}
          description="In progress"
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blood Pressure Chart - Only show if we have data */}
        {getRecentHealthData().filter(d => d.dataType === 'blood_pressure').length > 0 && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-red-500" />
              Blood Pressure Trend
            </h3>
            <Line 
              data={bloodPressureData} 
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  title: {
                    display: true,
                    text: 'Last 7 Readings'
                  }
                },
              }}
            />
          </div>
        )}

        {/* Adherence Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
            Medication Adherence
          </h3>
          <div className="h-64 flex items-center justify-center">
            <Doughnut 
              data={adherenceData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        return `${context.label}: ${context.parsed}%`;
                      }
                    }
                  }
                },
              }}
            />
          </div>
          <p className="text-center text-sm text-gray-600 mt-2">
            Based on {getMedications().length} active medications
          </p>
        </div>
      </div>

      {/* Recent Goals */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Your Goals</h3>
        <div className="space-y-4">
          {getGoals().slice(0, 3).map(goal => (
            <div key={goal.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-900">{goal.title}</h4>
                <span className="text-sm font-medium text-gray-500">{goal.progress || 0}%</span>
              </div>
              {goal.description && (
                <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
              )}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${goal.progress || 0}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{goal.currentValue || 0} {goal.unit}</span>
                <span>Target: {goal.targetValue} {goal.unit}</span>
              </div>
            </div>
          ))}
          {getGoals().length === 0 && (
            <div className="text-center py-8">
              <Target className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No active goals</h3>
              <p className="mt-1 text-sm text-gray-500">Create your first goal to get started!</p>
            </div>
          )}
        </div>
      </div>

      {/* Active Medications */}
      {getMedications().length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Active Medications</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getMedications().slice(0, 4).map(medication => (
              <div key={medication.id} className="border rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Pill className="h-5 w-5 text-blue-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">{medication.name}</h4>
                    <p className="text-sm text-gray-600">{medication.dosage} • {medication.frequency}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Insights */}
      {aiInsights && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Brain className="h-5 w-5 mr-2 text-purple-500" />
            AI Health Insights
          </h3>
          <div className="space-y-4">
            {aiInsights.messages?.map((message, index) => (
              <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">{message}</p>
              </div>
            ))}
            {aiInsights.suggestions && aiInsights.suggestions.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Suggestions:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  {aiInsights.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, title, value, description, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
  };

  return (
    <div className={`border rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <p className="text-xs opacity-75 mt-1">{description}</p>
        </div>
        <div className="p-2 bg-white rounded-full">{icon}</div>
      </div>
    </div>
  );
};

export default Dashboard;