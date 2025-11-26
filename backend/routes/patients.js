const express = require('express');
const router = express.Router();
const { Patient, HealthData, Medication, Goal, Feedback } = require('../models');
const aiAnalysisService = require('../services/aiAnalysisService');
const authMiddleware = require('../middleware/auth');

// Get patient dashboard data
router.get('/:patientId/dashboard', authMiddleware, async (req, res) => {
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

    // Get recent health data (last 7 days)
    const recentHealthData = await HealthData.findAll({
      where: {
        patientId,
        recordedAt: {
          [require('sequelize').Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      order: [['recordedAt', 'DESC']],
      limit: 20
    });

    // Get medications
    const medications = await Medication.findAll({
      where: { patientId, isActive: true }
    });

    // Get goals
    const goals = await Goal.findAll({
      where: { patientId, isAchieved: false }
    });

    // Get recent feedback/alerts
    const feedback = await Feedback.findAll({
      where: { patientId },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // Get motivation assessment
    const motivation = await aiAnalysisService.assessPatientMotivation(patientId);

    // Calculate medication adherence
    const adherence = await aiAnalysisService.calculateMedicationAdherence(patientId);

    // Prepare response
    const dashboardData = {
      recentHealthData,
      medications,
      goals,
      feedback,
      motivation: {
        ...motivation,
        adherenceScore: adherence
      }
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

module.exports = router;