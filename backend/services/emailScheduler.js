const { Patient, HealthData, Goal, Medication } = require('../models');
const emailService = require('./emailService');
const aiAnalysisService = require('./aiAnalysisService');
const { Op } = require('sequelize');

class EmailScheduler {
  constructor() {
    this.intervals = new Map();
    this.isRunning = false;
    this.checkCount = 0;
  }

  start() {
    if (this.isRunning) return;

    console.log('🚀 Starting email scheduler with 5-minute intervals...');
    this.isRunning = true;

    // Check every 5 minutes
    this.mainInterval = setInterval(() => {
      this.checkScheduledEmails();
    }, 5 * 60 * 1000); // 5 minutes

    // Initial DB load
    this.loadPatientSchedules();

    // Reload patient schedules every 30 minutes
    this.scheduleReloadInterval = setInterval(() => {
      this.loadPatientSchedules();
    }, 30 * 60 * 1000); // 30 minutes

    console.log('✅ Email scheduler running — checking every 5 minutes');
  }

  stop() {
    if (this.mainInterval) clearInterval(this.mainInterval);
    if (this.scheduleReloadInterval) clearInterval(this.scheduleReloadInterval);
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
    this.isRunning = false;
    console.log('🛑 Email scheduler stopped');
  }

  async loadPatientSchedules() {
    try {
      const patients = await Patient.findAll({
        where: { 
          preferredEmailTime: { [Op.ne]: null }
        }
      });

      console.log(`📧 Loaded email schedules for ${patients.length} patients`);

      // Clear existing intervals
      this.intervals.forEach(interval => clearInterval(interval));
      this.intervals.clear();

      // Schedule emails for each patient
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

        if (now > targetTime) targetTime.setDate(targetTime.getDate() + 1);

        const delay = targetTime.getTime() - now.getTime();

        setTimeout(async () => {
          await this.sendDailyUpdate(patient);
          this.schedulePatientEmails(patient); // schedule next
        }, delay);
      } catch (error) {
        console.error(`❌ Error scheduling email for patient ${patient.id}:`, error);
      }
    };

    scheduleEmail();
  }

  async sendDailyUpdate(patient) {
    try {
      console.log(`📤 Sending daily update to ${patient.email}`);

      const motivation = await aiAnalysisService.assessPatientMotivation(patient.id);
      const adherence = await aiAnalysisService.calculateMedicationAdherence(patient.id);

      const goals = await Goal.findAll({
        where: { patientId: patient.id, isAchieved: false },
        limit: 3
      });

      const context = {
        progress: true,
        medicationAdherence: Math.round(adherence),
        goalProgress: Math.round((goals.reduce((sum, goal) => sum + (goal.progress || 0), 0) / (goals.length || 1)) || 0),
        recentAchievements: goals.filter(g => (g.progress || 0) >= 80).map(g => g.title).join(', ') || 'Making great progress!'
      };

      const emailResult = await emailService.sendMotivationalEmail(patient, context);

      if (emailResult.error) console.log(`⚠️ Email issue for ${patient.email}: ${emailResult.error}`);
      else if (emailResult.simulated) console.log(`📧 [SIMULATED] Daily update for ${patient.email}`);
      else console.log(`✅ Daily update sent to ${patient.email}`);

      await this.checkAndSendAlerts(patient);
    } catch (error) {
      console.error(`❌ Error sending daily update to ${patient.email}:`, error.message);
    }
  }

  async checkAndSendAlerts(patient) {
    try {
      const criticalData = await HealthData.findAll({
        where: {
          patientId: patient.id,
          riskLevel: ['high', 'critical'],
          recordedAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        },
        limit: 5
      });

      for (const data of criticalData) {
        const analysis = await aiAnalysisService.analyzeHealthData(patient.id, data);
        const alertResult = await emailService.sendHealthAlert(patient, data, analysis);

        if (alertResult.error) console.log(`⚠️ Health alert failed for ${patient.email}: ${alertResult.error}`);
        else if (alertResult.simulated) console.log(`📧 [SIMULATED] Health alert for ${patient.email}`);
        else console.log(`⚠️ Health alert sent to ${patient.email}`);

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
      const currentTime = now.toTimeString().substring(0, 5); // HH:MM

      console.log(`⏰ [Check #${this.checkCount}] Checking scheduled emails at ${currentTime}...`);

      const patients = await Patient.findAll({ where: { preferredEmailTime: currentTime } });

      console.log(`📨 Found ${patients.length} patients to email at ${currentTime}`);

      for (const patient of patients) {
        try { await this.sendDailyUpdate(patient); } 
        catch (error) { console.error(`❌ Failed for ${patient.email}:`, error.message); }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      await this.checkMedicationReminders();
    } catch (error) {
      console.error('❌ Error checking scheduled emails:', error);
    }
  }

  async checkMedicationReminders() {
    try {
      const now = new Date();
      const currentTime = now.toTimeString().substring(0, 5);

      const medications = await Medication.findAll({
        where: { isActive: true },
        include: [{ model: Patient, as: 'patient', where: { preferredEmailTime: { [Op.ne]: null } } }]
      });

      for (const med of medications) {
        if (med.schedule?.times?.map(t => t.substring(0, 5)).includes(currentTime)) {
          try {
            const result = await emailService.sendMedicationReminder(med.patient, med);
            if (result.error) console.log(`⚠️ Medication reminder failed for ${med.patient.email}: ${result.error}`);
            else if (result.simulated) console.log(`📧 [SIMULATED] Reminder for ${med.patient.email} (${med.name})`);
            else console.log(`💊 Reminder sent to ${med.patient.email} (${med.name})`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`❌ Error sending reminder to ${med.patient.email}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking medication reminders:', error);
    }
  }

  // other methods (sendImmediateMedicationReminder, sendTestEmail, manualEmailCheck, getStatus, getUpcomingSchedule, getEmailStats) remain unchanged...
}

// ✅ Export instance
const emailScheduler = new EmailScheduler();
module.exports = emailScheduler;
