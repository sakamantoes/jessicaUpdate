const express = require('express');
const router = express.Router();
const { HealthData, Patient, Feedback, Medication, Goal } = require('../models');
const aiAnalysisService = require('../services/aiAnalysisService');
const authMiddleware = require('../middleware/auth');

// Get comprehensive AI analysis for patient
router.get('/patient/:patientId/comprehensive', authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Verify patient access
    if (req.patientId !== patientId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get recent health data (last 30 days)
    const recentHealthData = await HealthData.findAll({
      where: {
        patientId,
        recordedAt: {
          [require('sequelize').Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      order: [['recordedAt', 'DESC']]
    });

    // Get medications
    const medications = await Medication.findAll({
      where: { patientId, isActive: true }
    });

    // Get goals
    const goals = await Goal.findAll({
      where: { patientId, isAchieved: false }
    });

    // Perform comprehensive analysis
    const analysis = await performComprehensiveAnalysis(patient, recentHealthData, medications, goals);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error in comprehensive analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate comprehensive analysis'
    });
  }
});

// Get risk assessment
router.get('/patient/:patientId/risk-assessment', authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    if (req.patientId !== patientId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get recent health data with risk levels
    const recentHealthData = await HealthData.findAll({
      where: {
        patientId,
        recordedAt: {
          [require('sequelize').Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        },
        riskLevel: ['moderate', 'high', 'critical']
      },
      order: [['recordedAt', 'DESC']]
    });

    const riskAssessment = await generateRiskAssessment(patient, recentHealthData);

    res.json({
      success: true,
      data: riskAssessment
    });
  } catch (error) {
    console.error('Error in risk assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate risk assessment'
    });
  }
});

// Get trend analysis for specific health parameter
router.get('/patient/:patientId/trends/:dataType', authMiddleware, async (req, res) => {
  try {
    const { patientId, dataType } = req.params;
    const { days = 30 } = req.query;
    
    if (req.patientId !== patientId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const healthData = await HealthData.findAll({
      where: {
        patientId,
        dataType,
        recordedAt: {
          [require('sequelize').Op.gte]: startDate
        }
      },
      order: [['recordedAt', 'ASC']]
    });

    if (healthData.length === 0) {
      return res.json({
        success: true,
        data: {
          dataType,
          message: 'No data available for trend analysis',
          trends: [],
          insights: []
        }
      });
    }

    const trendAnalysis = await analyzeHealthTrends(healthData, dataType);

    res.json({
      success: true,
      data: {
        dataType,
        dataPoints: healthData.length,
        timeRange: `${days} days`,
        ...trendAnalysis
      }
    });
  } catch (error) {
    console.error('Error in trend analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate trend analysis'
    });
  }
});

// Get medication adherence insights
router.get('/patient/:patientId/medication-insights', authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    if (req.patientId !== patientId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const adherence = await aiAnalysisService.calculateMedicationAdherence(patientId);
    const medications = await Medication.findAll({
      where: { patientId, isActive: true }
    });

    const insights = await generateMedicationInsights(patientId, adherence, medications);

    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Error generating medication insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate medication insights'
    });
  }
});

// Get motivational insights and recommendations
router.get('/patient/:patientId/motivational-insights', authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    if (req.patientId !== patientId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const patient = await Patient.findByPk(patientId);
    const motivation = await aiAnalysisService.assessPatientMotivation(patientId);
    const recentData = await HealthData.count({
      where: {
        patientId,
        recordedAt: {
          [require('sequelize').Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });

    const insights = await generateMotivationalInsights(patient, motivation, recentData);

    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Error generating motivational insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate motivational insights'
    });
  }
});

// Predict health outcomes based on current trends
router.post('/patient/:patientId/predictions', authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { dataType, forecastDays = 30 } = req.body;
    
    if (req.patientId !== patientId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const predictions = await generateHealthPredictions(patientId, dataType, parseInt(forecastDays));

    res.json({
      success: true,
      data: predictions
    });
  } catch (error) {
    console.error('Error generating predictions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate health predictions'
    });
  }
});

// Get personalized health recommendations
router.get('/patient/:patientId/recommendations', authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    if (req.patientId !== patientId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const patient = await Patient.findByPk(patientId);
    const recentData = await HealthData.findAll({
      where: {
        patientId,
        recordedAt: {
          [require('sequelize').Op.gte]: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
        }
      }
    });

    const recommendations = await generatePersonalizedRecommendations(patient, recentData);

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate recommendations'
    });
  }
});

// Analyze specific health data entry
router.post('/analyze-health-data', authMiddleware, async (req, res) => {
  try {
    const { patientId, healthData } = req.body;
    
    if (req.patientId !== patientId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const analysis = await aiAnalysisService.analyzeHealthData(patientId, healthData);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error analyzing health data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze health data'
    });
  }
});

// Get patient progress report
router.get('/patient/:patientId/progress-report', authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { period = 'week' } = req.query; // week, month, quarter
    
    if (req.patientId !== patientId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const progressReport = await generateProgressReport(patientId, period);

    res.json({
      success: true,
      data: progressReport
    });
  } catch (error) {
    console.error('Error generating progress report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate progress report'
    });
  }
});

// Helper Functions

async function performComprehensiveAnalysis(patient, healthData, medications, goals) {
  const analysis = {
    patientOverview: {
      name: `${patient.firstName} ${patient.lastName}`,
      conditions: patient.chronicConditions,
      motivationLevel: patient.motivationLevel,
      lastAssessment: patient.lastAssessment
    },
    healthMetrics: {},
    riskAssessment: {},
    trends: {},
    recommendations: [],
    alerts: []
  };

  // Analyze each health metric type
  const metricTypes = ['blood_pressure', 'blood_sugar', 'heart_rate', 'weight', 'cholesterol'];
  
  for (const type of metricTypes) {
    const typeData = healthData.filter(d => d.dataType === type);
    if (typeData.length > 0) {
      analysis.healthMetrics[type] = await analyzeMetricType(typeData, type);
    }
  }

  // Risk assessment
  analysis.riskAssessment = await generateRiskAssessment(patient, healthData);

  // Trends analysis
  analysis.trends = await analyzeOverallTrends(healthData);

  // Generate recommendations
  analysis.recommendations = await generateComprehensiveRecommendations(patient, healthData, medications, goals);

  // Check for alerts
  analysis.alerts = await checkForAlerts(healthData);

  return analysis;
}

async function analyzeMetricType(data, dataType) {
  const recentData = data.slice(0, 7); // Last 7 entries
  const values = recentData.map(d => d.value);
  
  const stats = {
    recentCount: recentData.length,
    average: values.reduce((a, b) => a + b, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    lastValue: recentData[0]?.value,
    riskLevel: recentData[0]?.riskLevel || 'low'
  };

  // Add type-specific analysis
  if (dataType === 'blood_pressure') {
    const bpValues = recentData.map(d => JSON.parse(d.value));
    stats.systolicAvg = bpValues.reduce((sum, bp) => sum + bp.systolic, 0) / bpValues.length;
    stats.diastolicAvg = bpValues.reduce((sum, bp) => sum + bp.diastolic, 0) / bpValues.length;
  }

  return stats;
}

async function generateRiskAssessment(patient, healthData) {
  const risks = [];
  let overallRisk = 'low';

  // Analyze high-risk readings
  const highRiskReadings = healthData.filter(d => 
    d.riskLevel === 'high' || d.riskLevel === 'critical'
  );

  if (highRiskReadings.length > 0) {
    risks.push({
      level: 'high',
      count: highRiskReadings.length,
      types: [...new Set(highRiskReadings.map(d => d.dataType))],
      message: `${highRiskReadings.length} high-risk readings detected`
    });
    overallRisk = 'high';
  }

  // Analyze moderate risk readings
  const moderateRiskReadings = healthData.filter(d => d.riskLevel === 'moderate');
  if (moderateRiskReadings.length > 2) {
    risks.push({
      level: 'moderate',
      count: moderateRiskReadings.length,
      types: [...new Set(moderateRiskReadings.map(d => d.dataType))],
      message: 'Multiple moderate-risk readings observed'
    });
    if (overallRisk === 'low') overallRisk = 'moderate';
  }

  // Condition-specific risk assessment
  if (patient.chronicConditions.includes('diabetes')) {
    const bloodSugarReadings = healthData.filter(d => d.dataType === 'blood_sugar');
    const highSugarCount = bloodSugarReadings.filter(d => d.value > 180).length;
    
    if (highSugarCount > 2) {
      risks.push({
        level: 'moderate',
        type: 'diabetes_related',
        message: 'Frequent high blood sugar readings detected'
      });
    }
  }

  if (patient.chronicConditions.includes('hypertension')) {
    const bpReadings = healthData.filter(d => d.dataType === 'blood_pressure');
    const highBpCount = bpReadings.filter(d => {
      const bp = JSON.parse(d.value);
      return bp.systolic > 140 || bp.diastolic > 90;
    }).length;

    if (highBpCount > 2) {
      risks.push({
        level: 'moderate',
        type: 'hypertension_related',
        message: 'Frequent elevated blood pressure readings'
      });
    }
  }

  return {
    overallRisk,
    risks,
    summary: overallRisk === 'high' ? 'Requires immediate attention' :
             overallRisk === 'moderate' ? 'Monitor closely' :
             'Stable condition'
  };
}

async function analyzeHealthTrends(healthData, dataType) {
  if (healthData.length < 3) {
    return {
      trend: 'insufficient_data',
      confidence: 'low',
      insights: ['Need more data points for trend analysis']
    };
  }

  const values = healthData.map(d => d.value);
  const timestamps = healthData.map(d => new Date(d.recordedAt));

  // Simple linear regression for trend detection
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const trend = slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable';

  // Calculate rate of change
  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  const percentageChange = ((lastValue - firstValue) / firstValue) * 100;

  const insights = [];
  if (trend === 'increasing' && percentageChange > 10) {
    insights.push(`Significant increase detected (${percentageChange.toFixed(1)}%)`);
  } else if (trend === 'decreasing' && percentageChange < -10) {
    insights.push(`Significant decrease detected (${Math.abs(percentageChange).toFixed(1)}%)`);
  }

  return {
    trend,
    slope: slope.toFixed(3),
    percentageChange: percentageChange.toFixed(1),
    dataPoints: n,
    confidence: n >= 7 ? 'high' : n >= 3 ? 'medium' : 'low',
    insights
  };
}

async function generateMedicationInsights(patientId, adherence, medications) {
  const insights = {
    overallAdherence: adherence,
    status: adherence >= 80 ? 'excellent' : adherence >= 60 ? 'good' : 'needs_improvement',
    medications: [],
    recommendations: []
  };

  for (const medication of medications) {
    const medicationInsight = {
      name: medication.name,
      adherence: medication.adherence || adherence,
      lastTaken: medication.lastTaken,
      status: medication.adherence >= 80 ? 'on_track' : 'needs_attention'
    };
    insights.medications.push(medicationInsight);
  }

  // Generate recommendations based on adherence
  if (adherence < 60) {
    insights.recommendations.push(
      'Consider setting medication reminders',
      'Discuss adherence challenges with your healthcare provider',
      'Try linking medication times with daily routines'
    );
  } else if (adherence < 80) {
    insights.recommendations.push(
      'Good progress, aim for more consistent timing',
      'Consider using a pill organizer for better organization'
    );
  } else {
    insights.recommendations.push(
      'Excellent medication adherence! Keep up the great work',
      'Continue maintaining this consistent routine'
    );
  }

  return insights;
}

async function generateMotivationalInsights(patient, motivation, recentDataCount) {
  const insights = {
    motivationLevel: motivation.motivationLevel,
    activityScore: motivation.activityScore,
    adherenceScore: motivation.adherenceScore,
    messages: [],
    suggestions: []
  };

  // Generate motivational messages based on motivation level
  if (motivation.motivationLevel === 'high') {
    insights.messages.push(
      'You are doing an excellent job managing your health!',
      'Your consistency is inspiring and will lead to great outcomes.',
      'Keep up the fantastic work!'
    );
  } else if (motivation.motivationLevel === 'medium') {
    insights.messages.push(
      'You are making good progress in your health journey.',
      'Every small step counts toward better health outcomes.',
      'Consider setting smaller, achievable goals to build momentum.'
    );
    insights.suggestions.push(
      'Try tracking one additional health metric this week',
      'Set a reminder to log your health data daily',
      'Share your progress with a supportive friend or family member'
    );
  } else {
    insights.messages.push(
      'Managing chronic conditions can be challenging, but you are not alone.',
      'Even small steps forward are valuable progress.',
      'Remember why you started this journey towards better health.'
    );
    insights.suggestions.push(
      'Start with one simple health goal this week',
      'Reach out to your healthcare provider for support',
      'Celebrate small victories along the way'
    );
  }

  // Data tracking encouragement
  if (recentDataCount < 3) {
    insights.suggestions.push(
      'Try to log your health data more frequently for better insights',
      'Set a daily reminder to track your key health metrics'
    );
  }

  return insights;
}

async function generateHealthPredictions(patientId, dataType, forecastDays) {
  // Get historical data
  const historicalData = await HealthData.findAll({
    where: {
      patientId,
      dataType,
      recordedAt: {
        [require('sequelize').Op.gte]: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days
      }
    },
    order: [['recordedAt', 'ASC']]
  });

  if (historicalData.length < 7) {
    return {
      prediction: 'insufficient_data',
      confidence: 'low',
      message: 'Need more historical data for accurate predictions'
    };
  }

  // Simple moving average prediction
  const values = historicalData.map(d => d.value);
  const recentValues = values.slice(-7); // Last 7 values
  const average = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;

  // Add some variation based on trend
  const trend = await analyzeHealthTrends(historicalData.slice(-14), dataType);
  let predictedValue = average;

  if (trend.trend === 'increasing') {
    predictedValue = average * 1.05; // 5% increase
  } else if (trend.trend === 'decreasing') {
    predictedValue = average * 0.95; // 5% decrease
  }

  return {
    dataType,
    forecastDays,
    currentValue: values[values.length - 1],
    predictedValue: Math.round(predictedValue * 100) / 100,
    confidence: trend.confidence,
    trend: trend.trend,
    recommendation: generatePredictionRecommendation(dataType, predictedValue, trend.trend)
  };
}

function generatePredictionRecommendation(dataType, predictedValue, trend) {
  const recommendations = {
    blood_pressure: {
      increasing: 'Consider lifestyle modifications to manage blood pressure',
      decreasing: 'Continue current management strategy',
      stable: 'Maintain current healthy habits'
    },
    blood_sugar: {
      increasing: 'Monitor carbohydrate intake and consider dietary adjustments',
      decreasing: 'Good control, maintain current management',
      stable: 'Excellent blood sugar control'
    },
    heart_rate: {
      increasing: 'Practice stress-reduction techniques and ensure adequate hydration',
      decreasing: 'Good heart rate control',
      stable: 'Healthy heart rate pattern'
    }
  };

  return recommendations[dataType]?.[trend] || 'Continue monitoring and follow healthcare provider advice';
}

async function generatePersonalizedRecommendations(patient, recentData) {
  const recommendations = [];
  const conditions = patient.chronicConditions;

  // Condition-specific recommendations
  if (conditions.includes('diabetes')) {
    const bloodSugarReadings = recentData.filter(d => d.dataType === 'blood_sugar');
    const avgBloodSugar = bloodSugarReadings.length > 0 ? 
      bloodSugarReadings.reduce((sum, d) => sum + d.value, 0) / bloodSugarReadings.length : 0;

    if (avgBloodSugar > 140) {
      recommendations.push({
        category: 'diet',
        priority: 'high',
        message: 'Consider reducing carbohydrate intake and increasing fiber',
        action: 'Consult with dietitian for meal planning'
      });
    }
  }

  if (conditions.includes('hypertension')) {
    const bpReadings = recentData.filter(d => d.dataType === 'blood_pressure');
    const highBpCount = bpReadings.filter(d => {
      const bp = JSON.parse(d.value);
      return bp.systolic > 140 || bp.diastolic > 90;
    }).length;

    if (highBpCount > 0) {
      recommendations.push({
        category: 'lifestyle',
        priority: 'medium',
        message: 'Reduce sodium intake and practice stress management',
        action: 'Aim for 30 minutes of moderate exercise daily'
      });
    }
  }

  // General health recommendations
  const recentActivity = recentData.filter(d => d.dataType === 'activity_level').length;
  if (recentActivity < 3) {
    recommendations.push({
      category: 'activity',
      priority: 'medium',
      message: 'Increase physical activity levels',
      action: 'Aim for 150 minutes of moderate exercise per week'
    });
  }

  // Medication adherence recommendations
  const adherence = await aiAnalysisService.calculateMedicationAdherence(patient.id);
  if (adherence < 80) {
    recommendations.push({
      category: 'medication',
      priority: 'high',
      message: 'Improve medication adherence for better outcomes',
      action: 'Set up medication reminders and use pill organizers'
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

async function generateProgressReport(patientId, period) {
  let days;
  switch (period) {
    case 'week': days = 7; break;
    case 'month': days = 30; break;
    case 'quarter': days = 90; break;
    default: days = 7;
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const healthData = await HealthData.findAll({
    where: {
      patientId,
      recordedAt: { [require('sequelize').Op.gte]: startDate }
    }
  });

  const medications = await Medication.findAll({
    where: { patientId, isActive: true }
  });

  const goals = await Goal.findAll({
    where: { patientId }
  });

  const adherence = await aiAnalysisService.calculateMedicationAdherence(patientId);
  const motivation = await aiAnalysisService.assessPatientMotivation(patientId);

  const report = {
    period,
    dateRange: {
      start: startDate,
      end: new Date()
    },
    summary: {
      dataEntries: healthData.length,
      activeMedications: medications.length,
      activeGoals: goals.filter(g => !g.isAchieved).length,
      achievedGoals: goals.filter(g => g.isAchieved).length,
      medicationAdherence: adherence,
      motivationLevel: motivation.motivationLevel
    },
    achievements: [],
    areasForImprovement: [],
    nextSteps: []
  };

  // Identify achievements
  if (adherence >= 80) {
    report.achievements.push('Excellent medication adherence');
  }
  if (healthData.length >= days * 0.7) { // 70% data entry rate
    report.achievements.push('Consistent health data tracking');
  }
  if (goals.some(g => g.isAchieved)) {
    report.achievements.push('Successfully achieved health goals');
  }

  // Identify areas for improvement
  if (adherence < 60) {
    report.areasForImprovement.push('Medication adherence needs improvement');
  }
  if (healthData.length < days * 0.3) { // Less than 30% data entry rate
    report.areasForImprovement.push('Inconsistent health data tracking');
  }
  if (motivation.motivationLevel === 'low') {
    report.areasForImprovement.push('Low motivation level detected');
  }

  // Generate next steps
  report.nextSteps.push(
    'Continue tracking health data regularly',
    'Follow medication schedule consistently',
    'Work on achieving set health goals'
  );

  return report;
}

async function analyzeOverallTrends(healthData) {
  const trends = {};
  const dataTypes = [...new Set(healthData.map(d => d.dataType))];

  for (const type of dataTypes) {
    const typeData = healthData.filter(d => d.dataType === type);
    if (typeData.length >= 3) {
      trends[type] = await analyzeHealthTrends(typeData, type);
    }
  }

  return trends;
}

async function checkForAlerts(healthData) {
  const alerts = [];
  const criticalData = healthData.filter(d => d.riskLevel === 'critical');
  const highRiskData = healthData.filter(d => d.riskLevel === 'high');

  if (criticalData.length > 0) {
    alerts.push({
      level: 'critical',
      count: criticalData.length,
      types: [...new Set(criticalData.map(d => d.dataType))],
      message: 'Critical health readings detected - seek medical attention'
    });
  }

  if (highRiskData.length > 2) {
    alerts.push({
      level: 'high',
      count: highRiskData.length,
      types: [...new Set(highRiskData.map(d => d.dataType))],
      message: 'Multiple high-risk readings - monitor closely'
    });
  }

  return alerts;
}

async function generateComprehensiveRecommendations(patient, healthData, medications, goals) {
  const recommendations = [];

  // Health metric-based recommendations
  const bpData = healthData.filter(d => d.dataType === 'blood_pressure');
  if (bpData.length > 0) {
    const recentBP = JSON.parse(bpData[0].value);
    if (recentBP.systolic > 140 || recentBP.diastolic > 90) {
      recommendations.push({
        type: 'lifestyle',
        priority: 'high',
        title: 'Blood Pressure Management',
        description: 'Your blood pressure is elevated. Consider reducing sodium intake and increasing physical activity.',
        action: 'Monitor BP twice daily and consult your doctor if readings remain high'
      });
    }
  }

  // Medication-based recommendations
  if (medications.length > 0) {
    const adherence = await aiAnalysisService.calculateMedicationAdherence(patient.id);
    if (adherence < 80) {
      recommendations.push({
        type: 'medication',
        priority: 'high',
        title: 'Improve Medication Adherence',
        description: `Your current adherence rate is ${adherence}%. Consistent medication intake is crucial for managing chronic conditions.`,
        action: 'Set up reminders and consider using a pill organizer'
      });
    }
  }

  // Goal-based recommendations
  const unmetGoals = goals.filter(g => !g.isAchieved && g.progress < 50);
  if (unmetGoals.length > 0) {
    recommendations.push({
      type: 'goals',
      priority: 'medium',
      title: 'Focus on Health Goals',
      description: `You have ${unmetGoals.length} goals that need more attention.`,
      action: 'Break down larger goals into smaller, achievable steps'
    });
  }

  // General wellness recommendations
  recommendations.push({
    type: 'wellness',
    priority: 'low',
    title: 'Maintain Healthy Habits',
    description: 'Continue with regular exercise, balanced nutrition, and stress management.',
    action: 'Aim for 7-8 hours of sleep per night and stay hydrated'
  });

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

module.exports = router;