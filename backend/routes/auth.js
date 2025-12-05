const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Patient } = require('../models');
const authMiddleware = require('../middleware/auth');
const emailScheduler = require('../services/emailScheduler');

// Patient registration
router.post('/register', async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      chronicConditions,
      preferredEmailTime,
      phoneNumber,
      emergencyContact
    } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName || !dateOfBirth || !gender) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please fill in all required fields' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Check if patient already exists
    const existingPatient = await Patient.findOne({ where: { email } });
    if (existingPatient) {
      return res.status(400).json({ 
        success: false, 
        message: 'Patient with this email already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create patient
    const patient = await Patient.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      chronicConditions: chronicConditions || [],
      preferredEmailTime: preferredEmailTime || '09:00:00',
      phoneNumber,
      emergencyContact
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        patientId: patient.id, 
        email: patient.email 
      },
      process.env.JWT_SECRET || 'chronic-care-ai-secret-key',
      { expiresIn: '24h' }
    );

    // Return patient data (excluding password)
    const patientResponse = {
      id: patient.id,
      email: patient.email,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      chronicConditions: patient.chronicConditions,
      preferredEmailTime: patient.preferredEmailTime,
      phoneNumber: patient.phoneNumber,
      emergencyContact: patient.emergencyContact,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt
    };

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully',
      data: {
        patient: patientResponse,
        token
      }
    });
  } catch (error) {
    console.error('Error registering patient:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to register patient',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Patient login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Find patient
    const patient = await Patient.findOne({ where: { email } });
    if (!patient) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, patient.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        patientId: patient.id, 
        email: patient.email 
      },
      process.env.JWT_SECRET || 'chronic-care-ai-secret-key',
      { expiresIn: '24h' }
    );

    // Update last login time
    await patient.update({ lastAssessment: new Date() });

    // Return patient data (excluding password)
    const patientResponse = {
      id: patient.id,
      email: patient.email,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      chronicConditions: patient.chronicConditions,
      preferredEmailTime: patient.preferredEmailTime,
      phoneNumber: patient.phoneNumber,
      emergencyContact: patient.emergencyContact,
      medicationAdherence: patient.medicationAdherence,
      motivationLevel: patient.motivationLevel,
      lastAssessment: patient.lastAssessment,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt
    };

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        patient: patientResponse,
        token
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get current patient profile (protected route)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.patientId, {
      attributes: { exclude: ['password'] }
    });

    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }

    res.json({
      success: true,
      data: { patient }
    });
  } catch (error) {
    console.error('Error fetching patient profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch patient profile' 
    });
  }
});

// Change password
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 6 characters long' 
      });
    }

    const patient = await Patient.findByPk(req.patientId);
    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, patient.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await patient.update({ password: hashedNewPassword });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to change password' 
    });
  }
});

// Update profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      chronicConditions,
      preferredEmailTime,
      phoneNumber,
      emergencyContact,
      emailNotifications,
      emailPreferences
    } = req.body;

    const patient = await Patient.findByPk(req.patientId);
    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }

    // Prepare update data
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;
    if (gender) updateData.gender = gender;
    if (chronicConditions) updateData.chronicConditions = chronicConditions;
    if (preferredEmailTime) updateData.preferredEmailTime = preferredEmailTime;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (emergencyContact) updateData.emergencyContact = emergencyContact;
    if (emailNotifications !== undefined) updateData.emailNotifications = emailNotifications;
    if (emailPreferences) updateData.emailPreferences = emailPreferences;

    await patient.update(updateData);

    // Return updated patient (excluding password)
    const updatedPatient = {
      id: patient.id,
      email: patient.email,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      chronicConditions: patient.chronicConditions,
      preferredEmailTime: patient.preferredEmailTime,
      phoneNumber: patient.phoneNumber,
      emergencyContact: patient.emergencyContact,
      emailNotifications: patient.emailNotifications,
      emailPreferences: patient.emailPreferences,
      medicationAdherence: patient.medicationAdherence,
      motivationLevel: patient.motivationLevel,
      lastAssessment: patient.lastAssessment,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt
    };

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { patient: updatedPatient }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update profile' 
    });
  }
});

// Refresh token
router.post('/refresh-token', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.patientId, {
      attributes: { exclude: ['password'] }
    });

    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }

    // Generate new token
    const token = jwt.sign(
      { 
        patientId: patient.id, 
        email: patient.email 
      },
      process.env.JWT_SECRET || 'chronic-care-ai-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        patient,
        token
      }
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to refresh token' 
    });
  }
});

// Logout (client-side token removal)
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side by removing the token
    // We could implement a token blacklist here if needed
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Logout failed' 
    });
  }
});

// Forgot password - initiate reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    const patient = await Patient.findOne({ where: { email } });
    
    // Always return success to prevent email enumeration
    if (!patient) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = jwt.sign(
      { 
        patientId: patient.id,
        type: 'password_reset'
      },
      process.env.JWT_SECRET || 'chronic-care-ai-secret-key',
      { expiresIn: '1h' }
    );

    // In a real application, you would send an email with the reset link
    // For now, we'll just return the token (in production, never do this)
    if (process.env.NODE_ENV === 'development') {
      console.log(`Password reset token for ${email}:`, resetToken);
    }

    // TODO: Send email with reset link using Resend
    // await emailService.sendPasswordResetEmail(patient, resetToken);

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent'
    });
  } catch (error) {
    console.error('Error initiating password reset:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process password reset request' 
    });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 6 characters long' 
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'chronic-care-ai-secret-key');
    } catch (error) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired reset token' 
      });
    }

    // Check if token is a password reset token
    if (decoded.type !== 'password_reset') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid reset token' 
      });
    }

    const patient = await Patient.findByPk(decoded.patientId);
    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await patient.update({ password: hashedPassword });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reset password' 
    });
  }
});

// EMAIL-RELATED ENDPOINTS

// Send test email
router.post('/test-email', authMiddleware, async (req, res) => {
  try {
    const emailResult = await emailScheduler.sendTestEmail(req.patientId);
    
    if (emailResult.error) {
      return res.status(500).json({ 
        success: false, 
        message: emailResult.error 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Test email sent successfully',
      data: emailResult
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to send test email'
    });
  }
});

// Reload scheduler
router.post('/reload-scheduler', authMiddleware, async (req, res) => {
  try {
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

// Get scheduler status
router.get('/scheduler-status', authMiddleware, async (req, res) => {
  try {
    const status = emailScheduler.getStatus();
    const upcoming = emailScheduler.getUpcomingSchedule();
    const stats = emailScheduler.getEmailStats();
    
    res.json({
      success: true,
      data: { 
        status, 
        upcoming, 
        stats,
        patientCount: await Patient.count()
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

// Send immediate medication reminder
router.post('/send-reminder/:medicationId', authMiddleware, async (req, res) => {
  try {
    const { medicationId } = req.params;
    
    if (!medicationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Medication ID is required' 
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
      data: result
    });
  } catch (error) {
    console.error('Error sending immediate reminder:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to send medication reminder'
    });
  }
});

module.exports = router;