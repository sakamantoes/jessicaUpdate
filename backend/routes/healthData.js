const express = require('express');
const router = express.Router();
const { HealthData, Patient, Feedback } = require('../models');
const aiAnalysisService = require('../services/aiAnalysisService');
const emailService = require('../services/emailService');


// Add health data
router.post('/', async (req, res) => {
  try {
    const { patientId, dataType, value, unit, notes } = req.body;

    // Validate required fields
    if (!patientId || !dataType || value === undefined || value === null) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: patientId, dataType, and value are required' 
      });
    }

    // Validate patient exists
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }

    // Process blood pressure data
    let processedValue = value;
    if (dataType === 'blood_pressure' && typeof value === 'string') {
      try {
        const [systolic, diastolic] = value.split('/').map(v => parseInt(v.trim()));
        if (isNaN(systolic) || isNaN(diastolic)) {
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid blood pressure format. Use format: 120/80' 
          });
        }
        processedValue = JSON.stringify({ systolic, diastolic });
      } catch (error) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid blood pressure format' 
        });
      }
    }

    console.log('Creating health data:', { patientId, dataType, value: processedValue, unit, notes });

    const healthData = await HealthData.create({
      patientId,
      dataType,
      value: processedValue,
      unit,
      notes,
      recordedAt: new Date()
    });

    let analysis = { riskLevel: 'low', insights: [], recommendations: [] };
    
    try {
      // Analyze the data with timeout
      analysis = await Promise.race([
        aiAnalysisService.analyzeHealthData(patientId, healthData),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Analysis timeout')), 10000)
        )
      ]);
      
      // Update health data with analysis
      await healthData.update({
        riskLevel: analysis.riskLevel,
        aiAnalysis: analysis
      });

      // Create feedback if risk level is moderate or high
      if (analysis.riskLevel === 'moderate' || analysis.riskLevel === 'high') {
        await Feedback.create({
          patientId,
          type: 'risk_alert',
          title: `Health Alert: ${dataType.replace('_', ' ').toUpperCase()}`,
          message: analysis.insights?.[0] || 'Abnormal reading detected',
          severity: analysis.riskLevel === 'high' ? 'alert' : 'warning',
          recommendations: analysis.recommendations || [],
          dataContext: { healthDataId: healthData.id, analysis }
        });

        // Send immediate email alert for critical issues
        if (analysis.riskLevel === 'high') {
          try {
            await emailService.sendHealthAlert(patient, healthData, analysis);
          } catch (emailError) {
            console.error('Failed to send email alert:', emailError);
            // Don't fail the entire request if email fails
          }
        }
      }

    } catch (analysisError) {
      console.error('Analysis service error:', analysisError);
      // Continue even if analysis fails, but log the error
      await healthData.update({
        riskLevel: 'unknown',
        aiAnalysis: { error: 'Analysis failed', riskLevel: 'unknown' }
      });
    }

    res.json({
      success: true,
      data: healthData,
      analysis: analysis
    });

  } catch (error) {
    console.error('Error adding health data:', error);
    
    // More specific error messages
    let errorMessage = 'Failed to add health data';
    if (error.name === 'SequelizeValidationError') {
      errorMessage = 'Validation error: ' + error.errors.map(e => e.message).join(', ');
    } else if (error.name === 'SequelizeUniqueConstraintError') {
      errorMessage = 'Data already exists';
    } else if (error.name === 'SequelizeForeignKeyConstraintError') {
      errorMessage = 'Invalid patient ID';
    }

    res.status(500).json({ 
      success: false, 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


// Get patient health data
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { dataType, limit = 50 } = req.query;

    const where = { patientId };
    if (dataType) where.dataType = dataType;

    const healthData = await HealthData.findAll({
      where,
      order: [['recordedAt', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({ success: true, data: healthData });
  } catch (error) {
    console.error('Error fetching health data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch health data' });
  }
});

// Get health data trends
router.get('/patient/:patientId/trends', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { dataType, days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const healthData = await HealthData.findAll({
      where: {
        patientId,
        dataType,
        recordedAt: { [require('sequelize').Op.gte]: startDate }
      },
      order: [['recordedAt', 'ASC']]
    });

    // Calculate trends
    const analysis = await aiAnalysisService.analyzeTrends(healthData, dataType);

    res.json({
      success: true,
      data: healthData,
      trends: analysis.trends,
      recommendations: analysis.recommendations
    });
  } catch (error) {
    console.error('Error fetching health trends:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch health trends' });
  }
});

module.exports = router;