const { HealthData, Patient, Medication, Reminder } = require('../models');

class AIAnalysisService {
  constructor() {
    this.normalRanges = {
      blood_pressure: { systolic: { min: 90, max: 120 }, diastolic: { min: 60, max: 80 } },
      blood_sugar: { fasting: { min: 70, max: 100 }, postprandial: { min: 70, max: 140 } },
      heart_rate: { min: 60, max: 100 },
      cholesterol: { min: 0, max: 200 },
      weight: { // Based on BMI calculation
        underweight: 18.5,
        normal: 24.9,
        overweight: 29.9
      }
    };
  }

  async calculateMedicationAdherence(patientId) {
    try {
      const medications = await Medication.findAll({
        where: { patientId, isActive: true }
      });

      if (medications.length === 0) return 100;

      // Get medication reminders from the last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const reminders = await Reminder.findAll({
        where: { 
          patientId,
          type: 'medication',
          isCompleted: true,
          scheduledFor: {
            [require('sequelize').Op.gte]: sevenDaysAgo
          }
        }
      });

      // Calculate adherence based on expected vs actual
      const totalExpected = medications.length * 7; // Assuming daily for a week
      const actualTaken = reminders.length;
      
      const adherence = Math.min(100, Math.round((actualTaken / totalExpected) * 100));
      return isNaN(adherence) ? 0 : adherence;
    } catch (error) {
      console.error('Error calculating medication adherence:', error);
      return 0;
    }
  }

  async assessPatientMotivation(patientId) {
    try {
      // Count recent health data entries (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const recentActivities = await HealthData.count({
        where: {
          patientId,
          recordedAt: {
            [require('sequelize').Op.gte]: sevenDaysAgo
          }
        }
      });

      const medicationAdherence = await this.calculateMedicationAdherence(patientId);

      let motivationLevel = 'medium';
      
      if (recentActivities >= 5 && medicationAdherence >= 80) {
        motivationLevel = 'high';
      } else if (recentActivities <= 2 || medicationAdherence <= 50) {
        motivationLevel = 'low';
      }

      return {
        motivationLevel,
        activityScore: recentActivities,
        adherenceScore: medicationAdherence
      };
    } catch (error) {
      console.error('Error assessing patient motivation:', error);
      return {
        motivationLevel: 'medium',
        activityScore: 0,
        adherenceScore: 0
      };
    }
  }

  async analyzeHealthData(patientId, healthData) {
    try {
      const patient = await Patient.findByPk(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      const recentData = await HealthData.findAll({
        where: { patientId },
        order: [['recordedAt', 'DESC']],
        limit: 30
      });

      const analysis = {
        riskLevel: 'low',
        insights: [],
        trends: [],
        recommendations: [],
        predictions: []
      };

      // Analyze current reading
      const currentAnalysis = this.analyzeSingleReading(healthData);
      analysis.riskLevel = currentAnalysis.riskLevel;
      if (currentAnalysis.insight) {
        analysis.insights.push(currentAnalysis.insight);
      }

      // Analyze trends
      const trendAnalysis = this.analyzeTrends(recentData, healthData.dataType);
      analysis.trends = trendAnalysis.trends;
      if (trendAnalysis.recommendations && trendAnalysis.recommendations.length > 0) {
        analysis.recommendations.push(...trendAnalysis.recommendations);
      }

      // Generate predictions
      const predictions = this.generatePredictions(recentData, healthData.dataType);
      analysis.predictions = predictions;

      // Personalize recommendations based on patient profile
      const personalizedRecs = await this.generatePersonalizedRecommendations(patient, healthData, analysis);
      if (personalizedRecs && personalizedRecs.length > 0) {
        analysis.recommendations.push(...personalizedRecs);
      }

      return analysis;
    } catch (error) {
      console.error('Error analyzing health data:', error);
      return {
        riskLevel: 'low',
        insights: ['Unable to analyze data at this time'],
        trends: [],
        recommendations: ['Please try again later'],
        predictions: []
      };
    }
  }

  analyzeSingleReading(healthData) {
    const { dataType, value } = healthData;
    let riskLevel = 'low';
    let insight = '';

    try {
      switch (dataType) {
        case 'blood_pressure':
          const bp = typeof value === 'string' ? JSON.parse(value) : value;
          if (bp.systolic > 140 || bp.diastolic > 90) {
            riskLevel = 'high';
            insight = 'Elevated blood pressure detected. Consider consulting your healthcare provider.';
          } else if (bp.systolic > 130 || bp.diastolic > 85) {
            riskLevel = 'moderate';
            insight = 'Borderline high blood pressure. Monitor closely.';
          } else {
            insight = 'Blood pressure within normal range.';
          }
          break;

        case 'blood_sugar':
          const sugarValue = parseFloat(value);
          if (sugarValue > 180) {
            riskLevel = 'high';
            insight = 'High blood sugar level detected. Monitor symptoms and consider medical advice.';
          } else if (sugarValue > 140) {
            riskLevel = 'moderate';
            insight = 'Elevated blood sugar level. Watch your carbohydrate intake.';
          } else {
            insight = 'Blood sugar within target range.';
          }
          break;

        case 'heart_rate':
          const hrValue = parseFloat(value);
          if (hrValue > 100) {
            riskLevel = 'moderate';
            insight = 'Elevated heart rate. Consider rest and hydration.';
          } else if (hrValue < 60) {
            riskLevel = 'moderate';
            insight = 'Low heart rate. Monitor for symptoms like dizziness.';
          } else {
            insight = 'Heart rate within normal range.';
          }
          break;

        case 'cholesterol':
          const cholValue = parseFloat(value);
          if (cholValue > 240) {
            riskLevel = 'high';
            insight = 'High cholesterol level. Important to discuss with healthcare provider.';
          } else if (cholValue > 200) {
            riskLevel = 'moderate';
            insight = 'Borderline high cholesterol. Consider dietary changes.';
          } else {
            insight = 'Cholesterol level within desirable range.';
          }
          break;

        case 'weight':
          const weightValue = parseFloat(value);
          insight = `Current weight: ${weightValue} kg. Monitor for healthy BMI.`;
          break;

        default:
          insight = 'Data recorded successfully.';
      }
    } catch (error) {
      console.error('Error analyzing single reading:', error);
      insight = 'Unable to analyze this reading.';
    }

    return { riskLevel, insight };
  }

  analyzeTrends(data, dataType) {
    const trends = [];
    const recommendations = [];

    if (!data || data.length < 3) {
      return { 
        trends: ['Insufficient data for trend analysis'], 
        recommendations: ['Continue tracking more data points'] 
      };
    }

    try {
      const values = data.map(d => {
        if (dataType === 'blood_pressure') {
          try {
            const bp = typeof d.value === 'string' ? JSON.parse(d.value) : d.value;
            return (bp.systolic + bp.diastolic) / 2; // Average for trend analysis
          } catch {
            return 0;
          }
        }
        return parseFloat(d.value) || 0;
      }).filter(val => val > 0);

      if (values.length < 3) {
        return { 
          trends: ['Not enough valid data for trend analysis'], 
          recommendations: [] 
        };
      }

      const increasing = this.isTrendIncreasing(values);
      const decreasing = this.isTrendDecreasing(values);

      if (increasing) {
        trends.push(`Increasing trend in ${dataType.replace('_', ' ')}`);
        recommendations.push(`Monitor ${dataType.replace('_', ' ')} closely as it shows an increasing trend`);
      } else if (decreasing) {
        trends.push(`Decreasing trend in ${dataType.replace('_', ' ')}`);
        recommendations.push(`Continue current management as ${dataType.replace('_', ' ')} shows improvement`);
      } else {
        trends.push(`Stable trend in ${dataType.replace('_', ' ')}`);
        recommendations.push(`Maintain current healthy habits for ${dataType.replace('_', ' ')} management`);
      }
    } catch (error) {
      console.error('Error analyzing trends:', error);
      trends.push('Unable to analyze trends at this time');
    }

    return { trends, recommendations };
  }

  isTrendIncreasing(values) {
    if (values.length < 3) return false;
    
    const recentAvg = values.slice(0, Math.min(3, values.length)).reduce((a, b) => a + b, 0) / Math.min(3, values.length);
    const previousAvg = values.slice(-Math.min(3, values.length)).reduce((a, b) => a + b, 0) / Math.min(3, values.length);
    return recentAvg > previousAvg * 1.05; // 5% increase threshold
  }

  isTrendDecreasing(values) {
    if (values.length < 3) return false;
    
    const recentAvg = values.slice(0, Math.min(3, values.length)).reduce((a, b) => a + b, 0) / Math.min(3, values.length);
    const previousAvg = values.slice(-Math.min(3, values.length)).reduce((a, b) => a + b, 0) / Math.min(3, values.length);
    return recentAvg < previousAvg * 0.95; // 5% decrease threshold
  }

  generatePredictions(data, dataType) {
    if (!data || data.length < 5) {
      return ['Need more data points for accurate predictions'];
    }

    const predictions = [];
    
    try {
      const values = data.map(d => {
        if (dataType === 'blood_pressure') {
          try {
            const bp = typeof d.value === 'string' ? JSON.parse(d.value) : d.value;
            return (bp.systolic + bp.diastolic) / 2;
          } catch {
            return null;
          }
        }
        return parseFloat(d.value);
      }).filter(val => val !== null && !isNaN(val));

      if (values.length < 3) {
        return ['Insufficient valid data for predictions'];
      }

      const recentValues = values.slice(0, 7);
      const avg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;

      predictions.push(`Based on recent trends, your ${dataType.replace('_', ' ')} is expected to remain around ${avg.toFixed(1)}`);

      // Simple trend-based prediction
      const trend = this.isTrendIncreasing(values) ? 'increase' : this.isTrendDecreasing(values) ? 'decrease' : 'stabilize';
      predictions.push(`Expected to ${trend} in the coming days`);

    } catch (error) {
      console.error('Error generating predictions:', error);
      predictions.push('Unable to generate predictions at this time');
    }

    return predictions;
  }

  async generatePersonalizedRecommendations(patient, healthData, analysis) {
    const recommendations = [];
    
    try {
      const conditions = patient.chronicConditions || [];

      // Condition-specific recommendations
      if (conditions.includes('Diabetes') && healthData.dataType === 'blood_sugar') {
        const sugarValue = parseFloat(healthData.value);
        if (sugarValue > 180) {
          recommendations.push('Consider checking for ketones if you have type 1 diabetes');
          recommendations.push('Stay hydrated and avoid sugary foods');
          recommendations.push('Monitor for symptoms of hyperglycemia');
        } else if (sugarValue > 140) {
          recommendations.push('Review your carbohydrate intake from recent meals');
          recommendations.push('Consider light physical activity to help lower blood sugar');
        }
      }

      if (conditions.includes('Hypertension') && healthData.dataType === 'blood_pressure') {
        try {
          const bp = typeof healthData.value === 'string' ? JSON.parse(healthData.value) : healthData.value;
          if (bp.systolic > 140) {
            recommendations.push('Reduce sodium intake in your diet');
            recommendations.push('Practice stress-reduction techniques like deep breathing');
            recommendations.push('Limit caffeine and alcohol consumption');
          }
        } catch (error) {
          console.error('Error parsing blood pressure for recommendations:', error);
        }
      }

      // General lifestyle recommendations based on risk level
      if (analysis.riskLevel === 'high') {
        recommendations.push('Consider contacting your healthcare provider for advice');
        recommendations.push('Monitor your symptoms closely and seek emergency care if needed');
      } else if (analysis.riskLevel === 'moderate') {
        recommendations.push('Continue monitoring this parameter closely');
        recommendations.push('Maintain your current treatment plan and lifestyle modifications');
      }

      // Medication adherence encouragement
      const medications = await Medication.findAll({
        where: { patientId: patient.id, isActive: true }
      });

      if (medications.length > 0) {
        const adherence = await this.calculateMedicationAdherence(patient.id);
        if (adherence < 80) {
          recommendations.push('Try to improve medication adherence for better health outcomes');
          recommendations.push('Set reminders or use a pill organizer to help remember medications');
        }
      }

      // General health recommendations
      recommendations.push('Maintain a balanced diet and regular physical activity');
      recommendations.push('Get adequate sleep and manage stress levels');
      recommendations.push('Stay hydrated throughout the day');

    } catch (error) {
      console.error('Error generating personalized recommendations:', error);
      recommendations.push('Continue with your current health management plan');
    }

    return recommendations;
  }

  // Additional helper methods for comprehensive analysis
  async getPatientHealthSummary(patientId) {
    try {
      const patient = await Patient.findByPk(patientId);
      const recentData = await HealthData.findAll({
        where: { patientId },
        order: [['recordedAt', 'DESC']],
        limit: 50
      });

      const motivation = await this.assessPatientMotivation(patientId);
      const adherence = await this.calculateMedicationAdherence(patientId);

      return {
        patient: {
          id: patient.id,
          name: `${patient.firstName} ${patient.lastName}`,
          conditions: patient.chronicConditions
        },
        motivation,
        adherence,
        recentDataCount: recentData.length,
        lastUpdate: recentData[0]?.recordedAt || null
      };
    } catch (error) {
      console.error('Error getting patient health summary:', error);
      return null;
    }
  }

  // Risk assessment for multiple parameters
  async comprehensiveRiskAssessment(patientId) {
    try {
      const recentData = await HealthData.findAll({
        where: { patientId },
        order: [['recordedAt', 'DESC']],
        limit: 30
      });

      let overallRisk = 'low';
      const parameterRisks = [];

      for (const data of recentData) {
        const analysis = this.analyzeSingleReading(data);
        parameterRisks.push({
          parameter: data.dataType,
          riskLevel: analysis.riskLevel,
          insight: analysis.insight,
          value: data.value,
          recordedAt: data.recordedAt
        });

        // Elevate overall risk if any parameter is high risk
        if (analysis.riskLevel === 'high' && overallRisk !== 'critical') {
          overallRisk = 'high';
        } else if (analysis.riskLevel === 'moderate' && overallRisk === 'low') {
          overallRisk = 'moderate';
        }
      }

      return {
        overallRisk,
        parameterRisks,
        assessmentDate: new Date()
      };
    } catch (error) {
      console.error('Error in comprehensive risk assessment:', error);
      return {
        overallRisk: 'unknown',
        parameterRisks: [],
        assessmentDate: new Date()
      };
    }
  }
}

module.exports = new AIAnalysisService();