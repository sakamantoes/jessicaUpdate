const { Patient, HealthData, Goal, Medication } = require('../models');
const emailService = require('./emailService');
const aiAnalysisService = require('./aiAnalysisService');

class EmailScheduler {
  constructor() {
    this.intervals = new Map();
    this.isRunning = false;
    this.checkCount = 0;
  }

  start() {
    if (this.isRunning) return;

    console.log('🚀 Starting email scheduler with 1-minute intervals...');
    this.isRunning = true;

    // Check every 1 minute for emails to send
    this.mainInterval = setInterval(() => {
      this.checkScheduledEmails();
    }, 1 * 60 * 1000); // 1 minute

    // Initial load of patient schedules
    this.loadPatientSchedules();

    // Reload schedules every 15 minutes in case of changes
    this.scheduleReloadInterval = setInterval(() => {
      this.loadPatientSchedules();
    }, 15 * 60 * 1000); // 15 minutes

    console.log('✅ Email scheduler started successfully - checking every 1 minute');
  }

  stop() {
    if (this.mainInterval) {
      clearInterval(this.mainInterval);
    }
    if (this.scheduleReloadInterval) {
      clearInterval(this.scheduleReloadInterval);
    }
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
    this.isRunning = false;
    console.log('🛑 Email scheduler stopped');
  }

  async loadPatientSchedules() {
    try {
      const patients = await Patient.findAll({
        where: { 
          preferredEmailTime: { [require('sequelize').Op.ne]: null }
        }
      });

      console.log(`📧 Loaded email schedules for ${patients.length} patients`);

      // Clear existing intervals
      this.intervals.forEach(interval => clearInterval(interval));
      this.intervals.clear();

      // Create intervals for each patient
      for (const patient of patients) {
        this.schedulePatientEmails(patient);
      }
    } catch (error) {
      console.error('❌ Error loading patient schedules:', error);
    }
  }

  schedulePatientEmails(patient) {
    const preferredTime = patient.preferredEmailTime;
    const [hours, minutes] = preferredTime.split(':').map(Number);

    const scheduleEmail = async () => {
      try {
        const now = new Date();
        const targetTime = new Date();
        targetTime.setHours(hours, minutes, 0, 0);

        // If it's already past today's scheduled time, schedule for tomorrow
        if (now > targetTime) {
          targetTime.setDate(targetTime.getDate() + 1);
        }

        const delay = targetTime.getTime() - now.getTime();

        setTimeout(async () => {
          await this.sendDailyUpdate(patient);
          
          // Schedule next email
          this.schedulePatientEmails(patient);
        }, delay);

      } catch (error) {
        console.error(`❌ Error scheduling email for patient ${patient.id}:`, error);
      }
    };

    // Start the scheduling
    scheduleEmail();
  }

  async sendDailyUpdate(patient) {
    try {
      console.log(`📤 Sending daily update to ${patient.email}`);

      // Get patient's current status
      const motivation = await aiAnalysisService.assessPatientMotivation(patient.id);
      const adherence = await aiAnalysisService.calculateMedicationAdherence(patient.id);

      // Get active goals
      const goals = await Goal.findAll({
        where: { 
          patientId: patient.id,
          isAchieved: false
        },
        limit: 3
      });

      const context = {
        progress: true,
        medicationAdherence: Math.round(adherence),
        goalProgress: Math.round((goals.reduce((sum, goal) => sum + (goal.progress || 0), 0) / (goals.length || 1)) || 0),
        recentAchievements: goals.filter(g => (g.progress || 0) >= 80).map(g => g.title).join(', ') || 'Making great progress!'
      };

      // Send motivational email with enhanced error handling
      const emailResult = await emailService.sendMotivationalEmail(patient, context);
      
      if (emailResult.error) {
        console.log(`⚠️ Email service issue for ${patient.email}: ${emailResult.error}`);
        // You could log this to a monitoring service
      } else if (emailResult.simulated) {
        console.log(`📧 [SIMULATED] Daily update would be sent to ${patient.email}`);
      } else {
        console.log(`✅ Daily update sent to ${patient.email}`);
      }

      // Check if we need to send any urgent alerts (these will handle their own error checking)
      await this.checkAndSendAlerts(patient);

    } catch (error) {
      console.error(`❌ Error sending daily update to ${patient.email}:`, error.message);
    }
  }

  async checkAndSendAlerts(patient) {
    try {
      // Get recent health data with high risk levels
      const criticalData = await HealthData.findAll({
        where: {
          patientId: patient.id,
          riskLevel: ['high', 'critical'],
          recordedAt: {
            [require('sequelize').Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        limit: 5 // Limit to prevent spam
      });

      for (const data of criticalData) {
        const analysis = await aiAnalysisService.analyzeHealthData(patient.id, data);
        const alertResult = await emailService.sendHealthAlert(patient, data, analysis);
        
        if (alertResult.error) {
          console.log(`⚠️ Health alert failed for ${patient.email}: ${alertResult.error}`);
        } else if (alertResult.simulated) {
          console.log(`📧 [SIMULATED] Health alert would be sent to ${patient.email}`);
        } else {
          console.log(`⚠️ Health alert sent to ${patient.email}`);
        }
        
        // Add small delay between alerts
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`❌ Error checking alerts for patient ${patient.id}:`, error);
    }
  }

  async checkScheduledEmails() {
    try {
      this.checkCount++;
      const now = new Date();
      const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

      console.log(`⏰ [Check #${this.checkCount}] Checking for scheduled emails at ${currentTime}...`);

      // Find patients who should receive emails now
      const patients = await Patient.findAll({
        where: {
          preferredEmailTime: currentTime
        }
      });

      console.log(`📨 Found ${patients.length} patients to email at ${currentTime}`);

      let emailCount = 0;
      let successCount = 0;
      let simulatedCount = 0;
      let errorCount = 0;

      for (const patient of patients) {
        try {
          await this.sendDailyUpdate(patient);
          emailCount++;
          successCount++;
        } catch (error) {
          emailCount++;
          errorCount++;
          console.error(`❌ Failed to send daily update to ${patient.email}:`, error.message);
        }
        
        // Add small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      if (emailCount > 0) {
        console.log(`✅ Sent ${successCount} daily update emails (${simulatedCount} simulated, ${errorCount} errors)`);
      }

      // Also check for medication reminders
      await this.checkMedicationReminders();

    } catch (error) {
      console.error('❌ Error checking scheduled emails:', error);
    }
  }

  async checkMedicationReminders() {
    try {
      const now = new Date();
      const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
      
      console.log(`💊 Checking medication reminders for ${currentTime}...`);

      // Find active medications
      const medications = await Medication.findAll({
        where: {
          isActive: true
        },
        include: [{
          model: Patient,
          as: 'patient',
          where: {
            preferredEmailTime: { [require('sequelize').Op.ne]: null }
          }
        }]
      });

      let reminderCount = 0;
      let successCount = 0;
      let simulatedCount = 0;
      let errorCount = 0;

      for (const medication of medications) {
        if (medication.schedule && medication.schedule.times) {
          const scheduleTimes = medication.schedule.times.map(time => {
            if (typeof time === 'string') {
              return time.substring(0, 5); // Get HH:MM format
            }
            return time;
          });

          if (scheduleTimes.includes(currentTime)) {
            try {
              const reminderResult = await emailService.sendMedicationReminder(medication.patient, medication);
              
              if (reminderResult.error) {
                console.log(`⚠️ Medication reminder failed for ${medication.patient.email}: ${reminderResult.error}`);
                errorCount++;
              } else if (reminderResult.simulated) {
                console.log(`📧 [SIMULATED] Medication reminder would be sent to ${medication.patient.email} for ${medication.name}`);
                simulatedCount++;
              } else {
                console.log(`💊 Medication reminder sent to ${medication.patient.email} for ${medication.name}`);
                successCount++;
              }
              
              reminderCount++;
              
              // Add small delay between reminders
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
              reminderCount++;
              errorCount++;
              console.error(`❌ Error sending medication reminder to ${medication.patient.email}:`, error.message);
            }
          }
        }
      }

      if (reminderCount > 0) {
        console.log(`✅ Processed ${reminderCount} medication reminders (${successCount} sent, ${simulatedCount} simulated, ${errorCount} errors)`);
      } else {
        console.log(`💊 No medication reminders scheduled for ${currentTime}`);
      }

    } catch (error) {
      console.error('❌ Error checking medication reminders:', error);
    }
  }

  async sendImmediateMedicationReminder(patientId, medicationId) {
    try {
      const patient = await Patient.findByPk(patientId);
      const medication = await Medication.findByPk(medicationId);

      if (patient && medication) {
        const result = await emailService.sendMedicationReminder(patient, medication);
        
        if (result.error) {
          console.log(`⚠️ Immediate medication reminder failed for ${patient.email}: ${result.error}`);
          return false;
        } else if (result.simulated) {
          console.log(`📧 [SIMULATED] Immediate medication reminder would be sent to ${patient.email}`);
          return true;
        } else {
          console.log(`💊 Immediate medication reminder sent to ${patient.email}`);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('❌ Error sending immediate medication reminder:', error);
      return false;
    }
  }

  async sendTestEmail(patientId) {
    try {
      const patient = await Patient.findByPk(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      const result = await emailService.sendTestEmail(patient);
      
      if (result.error) {
        console.log(`⚠️ Test email failed for ${patient.email}: ${result.error}`);
        return false;
      } else if (result.simulated) {
        console.log(`📧 [SIMULATED] Test email would be sent to ${patient.email}`);
        return true;
      } else {
        console.log(`✅ Test email sent to ${patient.email}`);
        return true;
      }
    } catch (error) {
      console.error('❌ Error sending test email:', error);
      return false;
    }
  }

  // Method to manually trigger email check for testing
  async manualEmailCheck() {
    console.log('🔄 Manual email check triggered');
    await this.checkScheduledEmails();
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: '1 minute',
      totalChecks: this.checkCount,
      nextCheck: 'Running continuously',
      activePatients: this.intervals.size
    };
  }

  // Get upcoming email schedule
  async getUpcomingSchedule() {
    try {
      const patients = await Patient.findAll({
        where: { 
          preferredEmailTime: { [require('sequelize').Op.ne]: null }
        },
        attributes: ['id', 'firstName', 'email', 'preferredEmailTime']
      });

      const medications = await Medication.findAll({
        where: { isActive: true },
        include: [{
          model: Patient,
          as: 'patient',
          attributes: ['id', 'firstName', 'email']
        }]
      });

      return {
        patients: patients.map(p => ({
          id: p.id,
          name: p.firstName,
          email: p.email,
          emailTime: p.preferredEmailTime
        })),
        medications: medications.map(m => ({
          id: m.id,
          name: m.name,
          patient: m.patient.firstName,
          schedule: m.schedule
        }))
      };
    } catch (error) {
      console.error('❌ Error getting upcoming schedule:', error);
      return { patients: [], medications: [] };
    }
  }

  // Get email statistics
  async getEmailStats() {
    try {
      const patients = await Patient.count({
        where: { 
          preferredEmailTime: { [require('sequelize').Op.ne]: null }
        }
      });

      const medications = await Medication.count({
        where: { isActive: true }
      });

      return {
        totalPatients: patients,
        totalActiveMedications: medications,
        schedulerStatus: this.getStatus(),
        emailServiceStatus: emailService.isEnabled ? 'Active' : 'Simulation Mode'
      };
    } catch (error) {
      console.error('❌ Error getting email stats:', error);
      return {
        totalPatients: 0,
        totalActiveMedications: 0,
        schedulerStatus: this.getStatus(),
        emailServiceStatus: 'Error'
      };
    }
  }
}

// ✅ Create instance and export it
const emailScheduler = new EmailScheduler();

module.exports = emailScheduler;