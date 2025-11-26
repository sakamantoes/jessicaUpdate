const express = require('express');
const router = express.Router();
const { Reminder } = require('../models');

// Get patient reminders
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { type, completed, upcoming = true } = req.query;

    const where = { patientId };
    if (type) where.type = type;
    if (completed !== undefined) where.isCompleted = completed === 'true';

    if (upcoming === 'true') {
      where.scheduledFor = { [require('sequelize').Op.gte]: new Date() };
    }

    const reminders = await Reminder.findAll({
      where,
      order: [['scheduledFor', 'ASC']]
    });

    res.json({ success: true, data: reminders });
  } catch (error) {
    console.error('Error fetching reminders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reminders' });
  }
});

// Create reminder
router.post('/', async (req, res) => {
  try {
    const { patientId, type, title, message, scheduledFor, priority, recurrence } = req.body;

    const reminder = await Reminder.create({
      patientId,
      type,
      title,
      message,
      scheduledFor,
      priority: priority || 'medium',
      recurrence
    });

    res.json({
      success: true,
      message: 'Reminder created successfully',
      data: reminder
    });
  } catch (error) {
    console.error('Error creating reminder:', error);
    res.status(500).json({ success: false, message: 'Failed to create reminder' });
  }
});

// Mark reminder as completed
router.patch('/:reminderId/complete', async (req, res) => {
  try {
    const { reminderId } = req.params;

    const reminder = await Reminder.findByPk(reminderId);
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    await reminder.update({ isCompleted: true });

    res.json({
      success: true,
      message: 'Reminder marked as completed'
    });
  } catch (error) {
    console.error('Error completing reminder:', error);
    res.status(500).json({ success: false, message: 'Failed to complete reminder' });
  }
});

// Delete reminder
router.delete('/:reminderId', async (req, res) => {
  try {
    const { reminderId } = req.params;

    const reminder = await Reminder.findByPk(reminderId);
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    await reminder.destroy();

    res.json({
      success: true,
      message: 'Reminder deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    res.status(500).json({ success: false, message: 'Failed to delete reminder' });
  }
});

module.exports = router;