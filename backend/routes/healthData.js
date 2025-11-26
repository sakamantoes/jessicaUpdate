const express = require('express');
const router = express.Router();
const { HealthData, Patient, Feedback } = require('../models');
const aiAnalysisService = require('../services/aiAnalysisService');
const emailService = require('../services/emailService');

// Add health data
router.post('/', async (req, res) => {
  try {
    const { patientId, dataType, value, unit, notes } = req.body;

    const healthData = await HealthData.create({
      patientId,
      dataType,
      value,
      unit,
      notes,
      recordedAt: new Date()
    });

    // Analyze the data
    const analysis = await aiAnalysisService.analyzeHealthData(patientId, healthData);
    
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
        message: analysis.insights[0],
        severity: analysis.riskLevel === 'high' ? 'alert' : 'warning',
        recommendations: analysis.recommendations,
        dataContext: { healthDataId: healthData.id, analysis }
      });

      // Send immediate email alert for critical issues
      if (analysis.riskLevel === 'high') {
        const patient = await Patient.findByPk(patientId);
        await emailService.sendHealthAlert(patient, healthData, analysis);
      }
    }

    res.json({
      success: true,
      data: healthData,
      analysis: analysis
    });
  } catch (error) {
    console.error('Error adding health data:', error);
    res.status(500).json({ success: false, message: 'Failed to add health data' });
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