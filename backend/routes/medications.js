const express = require('express');
const router = express.Router();
const { Medication, Reminder } = require('../models');
const emailScheduler = require('../services/emailScheduler');

// Add medication
router.post('/', async (req, res) => {
  try {
    const { patientId, name, dosage, frequency, schedule, purpose } = req.body;

    const medication = await Medication.create({
      patientId,
      name,
      dosage,
      frequency,
      schedule,
      purpose
    });

    // Create reminders based on medication schedule
    await createMedicationReminders(patientId, medication);

    res.json({
      success: true,
      message: 'Medication added successfully',
      data: medication
    });
  } catch (error) {
    console.error('Error adding medication:', error);
    res.status(500).json({ success: false, message: 'Failed to add medication' });
  }
});

// Get patient medications
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { activeOnly = true } = req.query;

    const where = { patientId };
    if (activeOnly === 'true') {
      where.isActive = true;
    }

    const medications = await Medication.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: medications });
  } catch (error) {
    console.error('Error fetching medications:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch medications' });
  }
});

// Update medication
router.put('/:medicationId', async (req, res) => {
  try {
    const { medicationId } = req.params;
    const updates = req.body;

    const medication = await Medication.findByPk(medicationId);
    if (!medication) {
      return res.status(404).json({ success: false, message: 'Medication not found' });
    }

    await medication.update(updates);

    res.json({
      success: true,
      message: 'Medication updated successfully',
      data: medication
    });
  } catch (error) {
    console.error('Error updating medication:', error);
    res.status(500).json({ success: false, message: 'Failed to update medication' });
  }
});

// Mark medication as taken
router.post('/:medicationId/taken', async (req, res) => {
  try {
    const { medicationId } = req.params;
    const { takenAt } = req.body;

    const medication = await Medication.findByPk(medicationId);
    if (!medication) {
      return res.status(404).json({ success: false, message: 'Medication not found' });
    }

    await medication.update({
      lastTaken: takenAt || new Date()
    });

    // Create a record of taking medication
    await Reminder.create({
      patientId: medication.patientId,
      type: 'medication',
      title: `Taken: ${medication.name}`,
      message: `Medication ${medication.name} taken as scheduled`,
      scheduledFor: new Date(),
      isCompleted: true
    });

    res.json({
      success: true,
      message: 'Medication marked as taken'
    });
  } catch (error) {
    console.error('Error marking medication as taken:', error);
    res.status(500).json({ success: false, message: 'Failed to mark medication as taken' });
  }
});

// Helper method to create medication reminders
createMedicationReminders = async (patientId, medication) => {
  try {
    const { schedule } = medication;
    
    if (schedule && schedule.times) {
      for (const time of schedule.times) {
        await Reminder.create({
          patientId,
          type: 'medication',
          title: `Medication: ${medication.name}`,
          message: `Time to take ${medication.name} - ${medication.dosage}`,
          scheduledFor: new Date(`1970-01-01T${time}`), // Time only
          recurrence: {
            type: 'daily',
            times: schedule.times
          },
          priority: 'high'
        });
      }
    }
  } catch (error) {
    console.error('Error creating medication reminders:', error);
  }
};

module.exports = router;