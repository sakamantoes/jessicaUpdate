const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Patient, Medication } = require('../models');
const emailScheduler = require('../services/emailScheduler');
const emailService = require('../services/emailService');

// Send test email to logged-in patient
router.post('/test', auth, async (req, res) => {
  try {
    // Only allow patients to test their own email
    const result = await emailScheduler.sendTestEmail(req.patientId);
    
    if (result.error) {
      return res.status(500).json({ 
        success: false, 
        message: result.error 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Test email sent successfully',
      data: result 
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to send test email' 
    });
  }
});

// Get scheduler status (for logged-in patient)
router.get('/scheduler/status', auth, async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.patientId);
    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }

    const status = emailScheduler.getStatus();
    const upcoming = emailScheduler.getUpcomingSchedule();
    const stats = emailScheduler.getEmailStats();
    
    // Filter upcoming schedule for this patient only
    const patientSchedule = upcoming.schedules?.find(
      schedule => schedule.patientId === req.patientId
    ) || null;

    res.json({
      success: true,
      data: { 
        status, 
        patientSchedule,
        stats,
        patientEmailSettings: {
          email: patient.email,
          preferredEmailTime: patient.preferredEmailTime,
          emailNotifications: patient.emailNotifications,
          emailPreferences: patient.emailPreferences
        }
      }
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to get scheduler status' 
    });
  }
});

// Add to your email routes or create a test route
router.get('/test-schedule-check', auth, async (req, res) => {
  try {
    const patientId = req.patientId;
    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 5);
    
    const medications = await Medication.findAll({
      where: { 
        patientId: patientId,
        isActive: true
      },
      raw: false
    });

    const results = medications.map(med => {
      const schedule = med.get('schedule');
      let times = [];
      let matches = false;
      
      if (schedule && schedule.times && Array.isArray(schedule.times)) {
        times = schedule.times.map(t => t.substring(0, 5));
        matches = times.includes(currentTime);
      } else if (typeof schedule === 'string' && schedule.includes(':')) {
        times = [schedule.substring(0, 5)];
        matches = times[0] === currentTime;
      }
      
      return {
        name: med.name,
        rawSchedule: med.schedule,
        parsedSchedule: schedule,
        times: times,
        currentTime: currentTime,
        matches: matches,
        reminderTimes: med.reminderTimes
      };
    });

    res.json({
      success: true,
      data: {
        currentTime,
        patientId,
        medications: results,
        anyMatches: results.some(r => r.matches)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reload scheduler (admin function - keep it but with proper authorization)
router.post('/scheduler/reload', auth, async (req, res) => {
  try {
    // In a real app, you'd check if user is admin
    // For now, allow any authenticated user
    await emailScheduler.loadPatientSchedules();
    
    res.json({ 
      success: true, 
      message: 'Scheduler reloaded successfully' 
    });
  } catch (error) {
    console.error('Error reloading scheduler:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to reload scheduler' 
    });
  }
});

// Get email preferences for logged-in patient
router.get('/preferences', auth, async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.patientId, {
      attributes: [
        'id', 
        'email', 
        'preferredEmailTime',
        'emailNotifications',
        'emailPreferences',
        'firstName',
        'lastName'
      ]
    });

    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }

    res.json({
      success: true,
      data: {
        patientId: patient.id,
        email: patient.email,
        name: `${patient.firstName} ${patient.lastName}`,
        preferredEmailTime: patient.preferredEmailTime || '09:00:00',
        emailNotifications: patient.emailNotifications !== false, // Default to true
        emailPreferences: patient.emailPreferences || {
          motivational: true,
          medication: true,
          alerts: true,
          reports: true
        }
      }
    });
  } catch (error) {
    console.error('Error getting email preferences:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to get email preferences' 
    });
  }
});

// Update email preferences for logged-in patient
router.put('/preferences', auth, async (req, res) => {
  try {
    const { 
      emailPreferences, 
      emailNotifications, 
      preferredEmailTime 
    } = req.body;

    const patient = await Patient.findByPk(req.patientId);
    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }

    // Validate preferredEmailTime format
    if (preferredEmailTime) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
      if (!timeRegex.test(preferredEmailTime)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid time format. Use HH:MM:SS format' 
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (emailPreferences !== undefined) updateData.emailPreferences = emailPreferences;
    if (emailNotifications !== undefined) updateData.emailNotifications = emailNotifications;
    if (preferredEmailTime !== undefined) updateData.preferredEmailTime = preferredEmailTime;

    // Update patient
    await patient.update(updateData);

    // Trigger scheduler reload to pick up new preferences
    await emailScheduler.loadPatientSchedules();

    res.json({
      success: true,
      message: 'Email preferences updated successfully',
      data: {
        emailPreferences: patient.emailPreferences,
        emailNotifications: patient.emailNotifications,
        preferredEmailTime: patient.preferredEmailTime
      }
    });
  } catch (error) {
    console.error('Error updating email preferences:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to update email preferences' 
    });
  }
});

// Send immediate medication reminder for logged-in patient
router.post('/reminder/:medicationId', auth, async (req, res) => {
  try {
    const { medicationId } = req.params;
    
    if (!medicationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Medication ID is required' 
      });
    }

    // Verify the medication belongs to the patient
    const medication = await Medication.findOne({
      where: { 
        id: medicationId, 
        patientId: req.patientId 
      },
      include: [{
        model: Patient,
        as: 'patient'
      }]
    });

    if (!medication) {
      return res.status(404).json({ 
        success: false, 
        message: 'Medication not found or does not belong to you' 
      });
    }

    const result = await emailScheduler.sendImmediateMedicationReminder(
      req.patientId,
      medicationId
    );
    
    if (result.error) {
      return res.status(500).json({ 
        success: false, 
        message: result.error 
      });
    }
    
    res.json({
      success: true,
      message: 'Medication reminder sent successfully',
      data: {
        medication: {
          id: medication.id,
          name: medication.name,
          dosage: medication.dosage
        },
        emailStatus: result.simulated ? 'Simulated (Email service not configured)' : 'Sent',
        messageId: result.id
      }
    });
  } catch (error) {
    console.error('Error sending medication reminder:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to send medication reminder' 
    });
  }
});

// Get patient's upcoming medication schedule
router.get('/medication-schedule', auth, async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.patientId, {
      include: [{
        model: Medication,
        as: 'medications',
        where: { isActive: true }
      }]
    });

    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }

    const schedule = patient.medications.map(med => ({
      id: med.id,
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      scheduleTimes: med.scheduleTimes,
      nextReminder: calculateNextReminder(med.scheduleTimes)
    }));

    res.json({
      success: true,
      data: {
        patientName: `${patient.firstName} ${patient.lastName}`,
        email: patient.email,
        preferredEmailTime: patient.preferredEmailTime,
        medications: schedule,
        totalMedications: schedule.length
      }
    });
  } catch (error) {
    console.error('Error getting medication schedule:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to get medication schedule' 
    });
  }
});

// Helper function to calculate next reminder time
function calculateNextReminder(scheduleTimes) {
  if (!scheduleTimes || !Array.isArray(scheduleTimes) || scheduleTimes.length === 0) {
    return 'No schedule set';
  }

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert to minutes
  
  // Parse schedule times
  const times = scheduleTimes
    .map(time => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    })
    .sort((a, b) => a - b);
  
  // Find next time
  for (const time of times) {
    if (time > currentTime) {
      const hours = Math.floor(time / 60);
      const minutes = time % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }
  
  // If no more times today, return first time tomorrow
  const hours = Math.floor(times[0] / 60);
  const minutes = times[0] % 60;
  return `Tomorrow ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Manual trigger for daily update email
router.post('/send-daily-update', auth, async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.patientId);
    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }

    const result = await emailScheduler.sendDailyUpdate(patient);
    
    if (result.error) {
      return res.status(500).json({ 
        success: false, 
        message: result.error 
      });
    }
    
    res.json({
      success: true,
      message: 'Daily update email sent successfully',
      data: {
        emailStatus: result.simulated ? 'Simulated (Email service not configured)' : 'Sent',
        messageId: result.id
      }
    });
  } catch (error) {
    console.error('Error sending daily update:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to send daily update' 
    });
  }
});

// Get email history/logs for patient (simulated)
router.get('/history', auth, async (req, res) => {
  try {
    // In a real app, you'd query an email log table
    // For now, return simulated data
    const history = [
      {
        id: 1,
        type: 'medication_reminder',
        medication: 'Metformin',
        status: 'sent',
        sentAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        simulated: emailScheduler.getStatus().isEnabled === false
      },
      {
        id: 2,
        type: 'motivational_email',
        status: 'sent',
        sentAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        simulated: emailScheduler.getStatus().isEnabled === false
      },
      {
        id: 3,
        type: 'test_email',
        status: 'sent',
        sentAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        simulated: emailScheduler.getStatus().isEnabled === false
      }
    ];

    res.json({
      success: true,
      data: {
        totalEmails: history.length,
        emails: history,
        emailServiceEnabled: emailScheduler.getStatus().isEnabled
      }
    });
  } catch (error) {
    console.error('Error getting email history:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to get email history' 
    });
  }
});

module.exports = router;