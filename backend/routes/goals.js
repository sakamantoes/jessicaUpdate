const express = require('express');
const router = express.Router();
const { Goal } = require('../models');

// Create goal
router.post('/', async (req, res) => {
  try {
    const { patientId, title, description, targetValue, unit, deadline, category } = req.body;

    const goal = await Goal.create({
      patientId,
      title,
      description,
      targetValue,
      unit,
      deadline,
      category,
      currentValue: 0,
      progress: 0
    });

    res.json({
      success: true,
      message: 'Goal created successfully',
      data: goal
    });
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ success: false, message: 'Failed to create goal' });
  }
});

// Get patient goals
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { achieved } = req.query;

    const where = { patientId };
    if (achieved !== undefined) where.isAchieved = achieved === 'true';

    const goals = await Goal.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: goals });
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch goals' });
  }
});

// Update goal progress
router.patch('/:goalId/progress', async (req, res) => {
  try {
    const { goalId } = req.params;
    const { currentValue } = req.body;

    const goal = await Goal.findByPk(goalId);
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    const progress = Math.min(100, (currentValue / goal.targetValue) * 100);
    const isAchieved = progress >= 100;

    await goal.update({
      currentValue,
      progress,
      isAchieved
    });

    res.json({
      success: true,
      message: 'Goal progress updated',
      data: goal
    });
  } catch (error) {
    console.error('Error updating goal progress:', error);
    res.status(500).json({ success: false, message: 'Failed to update goal progress' });
  }
});

// Delete goal
router.delete('/:goalId', async (req, res) => {
  try {
    const { goalId } = req.params;

    const goal = await Goal.findByPk(goalId);
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    await goal.destroy();

    res.json({
      success: true,
      message: 'Goal deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ success: false, message: 'Failed to delete goal' });
  }
});

module.exports = router;