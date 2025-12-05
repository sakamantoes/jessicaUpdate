const { Patient, HealthData, Goal, Medication } = require('../models');
const emailService = require('./emailService');
const aiAnalysisService = require('./aiAnalysisService');
const { Op } = require('sequelize');

class EmailScheduler {
  constructor() {
    this.intervals = new Map();
    this.isRunning = false;
    this.checkCount = 0;
    this.patientSchedules = new Map(); // Store patient schedule cache
  }

  start() {
    if (this.isRunning) return;

    console.log('🚀 Starting email scheduler...');
    this.isRunning = true;

    // Check every 2 minutes for medication reminders (changed from 5 to 2)
    this.mainInterval = setInterval(() => {
      this.checkMedicationReminders();
    }, 1 * 60 * 1000); // 2 minutes

    // Check every 30 minutes for daily updates
    this.dailyUpdateInterval = setInterval(() => {
      this.checkDailyUpdates();
    }, 30 * 60 * 1000); // 30 minutes

    // Initial load
    this.loadPatientSchedules();

    // Reload schedules every hour
    this.scheduleReloadInterval = setInterval(() => {
      this.loadPatientSchedules();
    }, 60 * 60 * 1000); // 60 minutes

    console.log('✅ Email scheduler running');
    console.log('   • Medication reminders: every 2 minutes');
    console.log('   • Daily updates: every 30 minutes');
    console.log('   • Schedule reload: every hour');
    
    // Run initial check immediately
    setTimeout(() => {
      this.checkMedicationReminders();
    }, 5000); // Wait 5 seconds for startup
  }

  stop() {
    if (this.mainInterval) clearInterval(this.mainInterval);
    if (this.dailyUpdateInterval) clearInterval(this.dailyUpdateInterval);
    if (this.scheduleReloadInterval) clearInterval(this.scheduleReloadInterval);
    
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
    this.patientSchedules.clear();
    this.isRunning = false;
    console.log('🛑 Email scheduler stopped');
  }

  async loadPatientSchedules() {
    try {
      const patients = await Patient.findAll({
        where: { 
          preferredEmailTime: { 
            [Op.ne]: null,
            [Op.not]: ''
          }
        },
        attributes: ['id', 'email', 'firstName', 'preferredEmailTime']
      });

      console.log(`📧 Loaded ${patients.length} patients with email preferences`);

      // Update schedule cache
      patients.forEach(patient => {
        if (patient.preferredEmailTime) {
          this.patientSchedules.set(patient.id, {
            patient: patient,
            emailTime: patient.preferredEmailTime
          });
        }
      });

      return patients;
    } catch (error) {
      console.error('❌ Error loading patient schedules:', error);
      return [];
    }
  }

  async checkMedicationReminders() {
    try {
      const now = new Date();
      const currentTime = now.toTimeString().substring(0, 5); // HH:MM
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentSeconds = now.getSeconds();

      console.log(`\n💊 Medication check at ${currentTime}:${currentSeconds}`);

      // Debug: Log exact time being checked
      console.log(`🔍 Looking for medications scheduled at: "${currentTime}"`);

      // Only send reminders during reasonable hours (7 AM to 9 PM)
      if (currentHour < 7 || currentHour >= 21) {
        console.log(`   ⏸️ Outside reminder hours (${currentHour}:${currentMinute})`);
        return;
      }

      // Get active medications with their patients
      const medications = await Medication.findAll({
        where: { 
          isActive: true
        },
        include: [{
          model: Patient,
          as: 'patient',
          where: { 
            email: { [Op.ne]: null },
            emailNotifications: true
          }
        }],
        raw: false // Keep as Sequelize instances to use getters
      });

      console.log(`   💊 Found ${medications.length} active medications`);

      // Debug: Log each medication's schedule
      medications.forEach((med, index) => {
        console.log(`   Medication ${index + 1}: ${med.name}`);
        console.log(`     - Raw schedule: ${typeof med.schedule} = ${med.schedule}`);
        console.log(`     - Schedule getter:`, med.get('schedule'));
        console.log(`     - reminderTimes:`, med.reminderTimes);
        console.log(`     - frequency: ${med.frequency}`);
        console.log(`     - patient email: ${med.patient?.email}`);
      });

      // Filter medications based on schedule field
      const dueMedications = medications.filter(med => {
        try {
          const schedule = med.get('schedule'); // Use getter to get parsed JSON
          
          // If schedule is parsed JSON with times array
          if (schedule && schedule.times && Array.isArray(schedule.times)) {
            const times = schedule.times.map(t => {
              // Convert to HH:MM format
              if (t.includes(':')) {
                const timeParts = t.split(':');
                const hours = timeParts[0].padStart(2, '0');
                const minutes = timeParts[1] ? timeParts[1].padStart(2, '0') : '00';
                return `${hours}:${minutes}`;
              }
              return t;
            });
            
            console.log(`     - Parsed times for ${med.name}:`, times);
            const matches = times.includes(currentTime);
            console.log(`     - Matches ${currentTime}? ${matches}`);
            return matches;
          }
          
          // If schedule is a simple string
          if (typeof schedule === 'string' && schedule.includes(':')) {
            const timeParts = schedule.split(':');
            const hours = timeParts[0].padStart(2, '0');
            const minutes = timeParts[1] ? timeParts[1].padStart(2, '0') : '00';
            const time = `${hours}:${minutes}`;
            const matches = time === currentTime;
            console.log(`     - Simple time for ${med.name}: ${time}`);
            console.log(`     - Matches ${currentTime}? ${matches}`);
            return matches;
          }
          
          console.log(`     - No valid schedule found for ${med.name}`);
          return false;
        } catch (error) {
          console.error(`❌ Error checking schedule for medication ${med.id}:`, error.message);
          return false;
        }
      });

      console.log(`   ⏰ ${dueMedications.length} medications due at ${currentTime}`);

      // Send reminders for due medications
      let sentCount = 0;
      for (const med of dueMedications) {
        try {
          console.log(`   📤 Sending reminder for: ${med.name} to ${med.patient.email}`);
          const result = await emailService.sendMedicationReminder(med.patient, med);
          
          if (result.error) {
            console.log(`⚠️ Medication reminder failed for ${med.patient.email}: ${result.error}`);
          } else if (result.simulated) {
            console.log(`📧 [SIMULATED] Reminder for ${med.patient.email} (${med.name})`);
            sentCount++;
          } else {
            console.log(`✅ Reminder sent to ${med.patient.email} (${med.name})`);
            sentCount++;
          }
          
          // Delay between emails to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`❌ Error sending reminder to ${med.patient.email}:`, error.message);
        }
      }

      console.log(`   ✅ Sent ${sentCount} reminders at ${currentTime}`);
      
      // Also check if any other times within the next 2 minutes
      this.checkNearFutureReminders(medications, now);
      
    } catch (error) {
      console.error('❌ Error checking medication reminders:', error);
    }
  }

  // Check for reminders coming up in the next 2 minutes
  async checkNearFutureReminders(medications, now) {
    try {
      const nextCheckTimes = [];
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      // Generate next 4 minutes (2 current + 2 next)
      for (let i = 0; i <= 2; i++) {
        const futureMinutes = currentMinutes + i;
        const futureHours = Math.floor(futureMinutes / 60);
        const futureMins = futureMinutes % 60;
        const timeStr = `${futureHours.toString().padStart(2, '0')}:${futureMins.toString().padStart(2, '0')}`;
        nextCheckTimes.push(timeStr);
      }
      
      console.log(`   🔮 Next check times: ${nextCheckTimes.join(', ')}`);
      
      // Check which medications are coming up
      medications.forEach(med => {
        const schedule = med.get('schedule');
        if (schedule && schedule.times && Array.isArray(schedule.times)) {
          const times = schedule.times.map(t => {
            if (t.includes(':')) {
              const timeParts = t.split(':');
              const hours = timeParts[0].padStart(2, '0');
              const minutes = timeParts[1] ? timeParts[1].padStart(2, '0') : '00';
              return `${hours}:${minutes}`;
            }
            return t;
          });
          
          const upcoming = times.filter(time => nextCheckTimes.includes(time));
          if (upcoming.length > 0) {
            console.log(`   ⏳ ${med.name} upcoming at: ${upcoming.join(', ')}`);
          }
        }
      });
    } catch (error) {
      console.error('❌ Error checking near future reminders:', error);
    }
  }

  async checkDailyUpdates() {
    try {
      this.checkCount++;
      const now = new Date();
      const currentTime = now.toTimeString().substring(0, 5); // HH:MM
      const currentHour = now.getHours();

      console.log(`⏰ [Daily Check #${this.checkCount}] ${currentTime}`);

      // Only send daily updates during reasonable hours (6 AM to 10 PM)
      if (currentHour < 6 || currentHour >= 22) {
        console.log(`   ⏸️ Outside email hours (${currentHour}:00)`);
        return;
      }

      // Get patients whose preferred time matches current time
      const patientsToEmail = Array.from(this.patientSchedules.values())
        .filter(schedule => schedule.emailTime === currentTime)
        .map(schedule => schedule.patient);

      console.log(`   📨 Found ${patientsToEmail.length} patients to email now`);

      for (const patient of patientsToEmail) {
        try {
          await this.sendDailyUpdate(patient);
          // Add delay between emails to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`❌ Failed daily update for ${patient.email}:`, error.message);
        }
      }
    } catch (error) {
      console.error('❌ Error in checkDailyUpdates:', error);
    }
  }

  async sendDailyUpdate(patient) {
    try {
      console.log(`📤 Sending daily update to ${patient.email}`);

      // Prepare context data
      const context = {
        progress: true,
        medicationAdherence: 0,
        goalProgress: 0,
        recentAchievements: 'Making great progress!'
      };

      try {
        // Try to get adherence data
        const adherence = await aiAnalysisService.calculateMedicationAdherence(patient.id);
        context.medicationAdherence = Math.round(adherence || 0);
      } catch (error) {
        console.log(`⚠️ Could not get adherence for ${patient.id}:`, error.message);
      }

      try {
        // Try to get goals data
        const goals = await Goal.findAll({
          where: { patientId: patient.id, isAchieved: false },
          limit: 3
        });

        if (goals.length > 0) {
          const totalProgress = goals.reduce((sum, goal) => sum + (goal.progress || 0), 0);
          context.goalProgress = Math.round(totalProgress / goals.length);
          
          const achievements = goals.filter(g => (g.progress || 0) >= 80).map(g => g.title);
          if (achievements.length > 0) {
            context.recentAchievements = achievements.join(', ');
          }
        }
      } catch (error) {
        console.log(`⚠️ Could not get goals for ${patient.id}:`, error.message);
      }

      // Send the email
      const emailResult = await emailService.sendMotivationalEmail(patient, context);

      if (emailResult.error) {
        console.log(`⚠️ Email issue for ${patient.email}: ${emailResult.error}`);
      } else if (emailResult.simulated) {
        console.log(`📧 [SIMULATED] Daily update for ${patient.email}`);
      } else {
        console.log(`✅ Daily update sent to ${patient.email}`);
        // Also check for alerts after successful email
        await this.checkAndSendAlerts(patient);
      }

      return emailResult;
    } catch (error) {
      console.error(`❌ Error sending daily update to ${patient.email}:`, error.message);
      return { error: error.message };
    }
  }

  async checkAndSendAlerts(patient) {
    try {
      // Check for recent critical health data
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const criticalData = await HealthData.findAll({
        where: {
          patientId: patient.id,
          riskLevel: { [Op.in]: ['high', 'critical'] },
          recordedAt: { [Op.gte]: oneDayAgo },
          alertSent: { [Op.ne]: true } // Only send alert once per reading
        },
        limit: 3,
        order: [['recordedAt', 'DESC']]
      });

      console.log(`   ⚠️ Found ${criticalData.length} critical readings for ${patient.email}`);

      for (const data of criticalData) {
        try {
          // Get AI analysis
          let analysis = { insight: 'Critical reading detected', recommendations: [] };
          try {
            analysis = await aiAnalysisService.analyzeHealthData(patient.id, data);
          } catch (error) {
            console.log(`⚠️ AI analysis failed for ${patient.id}:`, error.message);
          }

          // Send health alert
          const alertResult = await emailService.sendHealthAlert(patient, data, analysis);

          if (alertResult.error) {
            console.log(`⚠️ Health alert failed for ${patient.email}: ${alertResult.error}`);
          } else if (alertResult.simulated) {
            console.log(`📧 [SIMULATED] Health alert for ${patient.email}`);
          } else {
            console.log(`⚠️ Health alert sent to ${patient.email} (${data.dataType})`);
            // Mark as sent to avoid duplicate alerts
            await HealthData.update(
              { alertSent: true },
              { where: { id: data.id } }
            );
          }

          // Delay between alerts
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`❌ Error processing alert for ${patient.email}:`, error.message);
        }
      }
    } catch (error) {
      console.error(`❌ Error checking alerts for patient ${patient.id}:`, error);
    }
  }

  // Helper methods for manual testing
  async sendImmediateMedicationReminder(patientId, medicationId) {
    try {
      const patient = await Patient.findByPk(patientId);
      const medication = await Medication.findByPk(medicationId);
      
      if (!patient || !medication) {
        return { error: 'Patient or medication not found' };
      }

      console.log(`🚀 Sending immediate reminder to ${patient.email}`);
      return await emailService.sendMedicationReminder(patient, medication);
    } catch (error) {
      console.error('❌ Error sending immediate reminder:', error);
      return { error: error.message };
    }
  }

  async sendTestEmail(patientId) {
    try {
      const patient = await Patient.findByPk(patientId);
      if (!patient) return { error: 'Patient not found' };

      console.log(`🧪 Sending test email to ${patient.email}`);
      return await emailService.sendTestEmail(patient);
    } catch (error) {
      console.error('❌ Error sending test email:', error);
      return { error: error.message };
    }
  }

  async manualEmailCheck() {
    console.log('🔍 Manual email check triggered');
    await this.checkDailyUpdates();
    await this.checkMedicationReminders();
    return { 
      status: 'Manual check completed',
      patientCount: this.patientSchedules.size,
      timestamp: new Date().toISOString()
    };
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      patientCount: this.patientSchedules.size,
      lastCheck: this.checkCount,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }

  getUpcomingSchedule() {
    const schedules = Array.from(this.patientSchedules.values())
      .map(schedule => ({
        patientId: schedule.patient.id,
        email: schedule.patient.email,
        nextEmailTime: schedule.emailTime,
        name: `${schedule.patient.firstName} ${schedule.patient.lastName}`
      }));

    return {
      count: schedules.length,
      schedules: schedules.sort((a, b) => a.nextEmailTime.localeCompare(b.nextEmailTime))
    };
  }

  getEmailStats() {
    return {
      patientsWithSchedules: this.patientSchedules.size,
      nextCheckIn: this.isRunning ? 'Running' : 'Stopped',
      currentTime: new Date().toTimeString().substring(0, 5),
      checksPerformed: this.checkCount,
      checkInterval: '2 minutes'
    };
  }
}

// ✅ Export instance
const emailScheduler = new EmailScheduler();
module.exports = emailScheduler;