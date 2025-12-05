const axios = require('axios');
const { Patient, Medication } = require('../models');
const dotenv = require('dotenv');

dotenv.config();

// Test Brevo connection on startup
(async () => {
  try {
    if (process.env.BREVO_API_KEY) {
      console.log("📧 Brevo API key is configured and ready to send emails.");
    } else {
      console.log("⚠️ Brevo API key not configured - running in simulation mode");
    }
  } catch (err) {
    console.log("❌ Brevo configuration error:", err.message);
  }
})();

// ===============================
// Motivational messages + tips (keep the same)
// ===============================

const motivationalMessages = [
  "Remember, taking your medication consistently is a powerful step towards better health. You're doing great! 💊",
  "Your health journey matters! Taking your meds today brings you closer to your wellness goals. 🌟",
  "Every dose you take is an act of self-care. Keep up the amazing work! Your future self thanks you. 💫",
  "Consistency is key! By taking your medication on time, you're building a foundation for long-term health. 🏗️",
  "You're not just taking pills - you're taking control of your health. That's something to be proud of! 💪",
  "Small steps lead to big changes. Remembering your medication is a victory worth celebrating! 🎉",
  "Your commitment to your health is inspiring. Keep going strong with your medication routine! 🌈",
  "Think of your medication as your daily health investment. The returns are priceless! 💰",
  "You've got this! Taking your meds is a simple but powerful way to show yourself love today. ❤️",
  "Every time you take your medication, you're writing a success story for your health. Keep writing! 📖"
];

const healthTips = [
  "Tip: Stay hydrated throughout the day to help your body process medications effectively.",
  "Tip: Combine medication time with a daily routine (like brushing teeth) to build consistency.",
  "Tip: Keep a small water bottle by your medications to make taking them easier.",
  "Tip: Regular light exercise can complement your medication's effectiveness.",
  "Tip: Maintain a balanced diet to support your treatment plan.",
  "Tip: Get adequate rest - sleep helps your body heal and respond better to treatment.",
  "Tip: Don't hesitate to reach out to your healthcare provider with any concerns.",
  "Tip: Track your symptoms daily to monitor your progress effectively.",
  "Tip: Practice deep breathing exercises to manage stress alongside your treatment.",
  "Tip: Celebrate small victories in your health journey - they all matter!"
];

// Generate random message
function getRandomMessage() {
  const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
  const randomTip = healthTips[Math.floor(Math.random() * healthTips.length)];
  return `${randomMessage}\n\n${randomTip}`;
}

class EmailService {
  constructor() {
    this.isEnabled = !!process.env.BREVO_API_KEY;
    this.fromEmail = process.env.BREVO_FROM_EMAIL || 'no-reply@chroniccare.ai';
    this.fromName = process.env.BREVO_FROM_NAME || 'Chronic Care AI';
    this.brevoApiUrl = 'https://api.brevo.com/v3/smtp/email';
  }

  // Helper method to send email via Brevo API
  async sendViaBrevo(mailOptions) {
    try {
      if (!this.isEnabled) {
        console.log(`📧 [SIMULATED] Email would be sent to ${mailOptions.to[0].email}`);
        return { simulated: true, message: 'Brevo API not configured' };
      }

      const response = await axios.post(this.brevoApiUrl, mailOptions, {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log(`✅ Email sent successfully: ${response.data.messageId}`);
      return { id: response.data.messageId, ...response.data };
    } catch (error) {
      console.error("❌ Brevo API error:", error.response?.data || error.message);
      return { error: error.response?.data || error.message, simulated: true };
    }
  }

  // =====================================
  // SEND MEDICATION REMINDER
  // =====================================

  async sendMedicationReminder(patient, medication) {
    try {
      const message = getRandomMessage();

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial; background:#f8fafc; padding:20px;">
  <div style="max-width:600px; margin:auto; background:white; border-radius:12px; overflow:hidden;">
    
    <div style="background:#667eea; padding:25px; color:white; text-align:center;">
      <h1 style="margin:0;">💊 Medication Reminder</h1>
      <p>Time to take your scheduled medication</p>
    </div>

    <div style="padding:30px;">
      <p style="font-size:18px;">Hello ${patient.firstName},</p>
      <p>This is a friendly reminder to take your medication:</p>

      <div style="background:#f0f4ff; padding:20px; border-radius:10px; border-left:6px solid #667eea;">
        <h2 style="margin:0 0 10px 0;">${medication.name} <span style="background:#fee2e2; padding:4px 10px; border-radius:12px; color:#b91c1c; font-size:12px;">NOW</span></h2>

        <p><strong>Dosage:</strong> ${medication.dosage}</p>
        <p><strong>Frequency:</strong> ${medication.frequency}</p>

        ${medication.purpose ? `<p><strong>Purpose:</strong> ${medication.purpose}</p>` : ""}
      </div>

      <div style="background:#fff7ed; border:1px solid #fed7aa; padding:15px; margin-top:20px; border-radius:8px; font-style:italic;">
        ${message.replace(/\n/g, "<br>")}
      </div>

      <p style="font-size:14px; color:#6b7280; margin-top:25px;">
        Please take your medication as prescribed.  
      </p>
    </div>

    <div style="background:#f8fafc; padding:20px; text-align:center; font-size:12px; color:#9ca3af;">
      This is an automated reminder from Chronic Care AI System.
    </div>

  </div>
</body>
</html>
`;

      const mailOptions = {
        sender: {
          name: this.fromName,
          email: this.fromEmail
        },
        to: [{
          email: patient.email,
          name: `${patient.firstName} ${patient.lastName}`
        }],
        subject: `💊 Medication Reminder: Time for ${medication.name}`,
        htmlContent: htmlContent
      };

      const data = await this.sendViaBrevo(mailOptions);
      console.log(`✅ Medication reminder sent to ${patient.email} for ${medication.name}`);
      return data;

    } catch (error) {
      console.error("❌ Error sending medication reminder:", error);
      return { error: error.message, simulated: true };
    }
  }

  // =====================================
  // SEND MOTIVATIONAL EMAIL
  // =====================================

  async sendMotivationalEmail(patient, context = {}) {
    try {
      const message = getRandomMessage();

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial; background:#f8fafc; padding:20px;">
  <div style="max-width:600px; margin:auto; background:white; border-radius:12px; overflow:hidden;">
    
    <div style="background:#667eea; padding:25px; color:white; text-align:center;">
      <h1 style="margin:0;">🌟 Daily Health Motivation</h1>
      <p>Your personalized health update</p>
    </div>

    <div style="padding:30px;">
      <p style="font-size:18px;">Hello ${patient.firstName},</p>
      
      <div style="background:#fff7ed; border:1px solid #fed7aa; padding:20px; margin:20px 0; border-radius:8px; font-style:italic;">
        ${message.replace(/\n/g, "<br>")}
      </div>

      ${context.progress ? `
      <div style="background:#f0f4ff; padding:20px; border-radius:10px; border-left:6px solid #667eea;">
        <h3 style="margin-top:0;">📊 Your Progress This Week</h3>
        <p><strong>Medication Adherence:</strong> ${context.medicationAdherence}%</p>
        <p><strong>Goal Progress:</strong> ${context.goalProgress}%</p>
        ${context.recentAchievements ? `<p><strong>Recent Achievements:</strong> ${context.recentAchievements}</p>` : ""}
      </div>
      ` : ""}

      <p style="font-size:14px; color:#6b7280; margin-top:25px;">
        Keep up the great work! Your consistency is key to managing your health effectively.
      </p>
    </div>

    <div style="background:#f8fafc; padding:20px; text-align:center; font-size:12px; color:#9ca3af;">
      This is an automated message from Chronic Care AI System.
    </div>

  </div>
</body>
</html>
`;

      const mailOptions = {
        sender: {
          name: this.fromName,
          email: this.fromEmail
        },
        to: [{
          email: patient.email,
          name: `${patient.firstName} ${patient.lastName}`
        }],
        subject: `🌟 Daily Health Motivation & Update`,
        htmlContent: htmlContent
      };

      const data = await this.sendViaBrevo(mailOptions);
      console.log(`✅ Motivational email sent to ${patient.email}`);
      return data;

    } catch (error) {
      console.error("❌ Error sending motivational email:", error);
      return { error: error.message, simulated: true };
    }
  }

  // =====================================
  // SEND HEALTH ALERT
  // =====================================

  async sendHealthAlert(patient, healthData, analysis) {
    try {
      const riskLevelColors = {
        high: '#ff6b6b',
        critical: '#ff4757',
        moderate: '#ffa502',
        low: '#2ed573'
      };

      const color = riskLevelColors[healthData.riskLevel] || '#ff6b6b';

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial; background:#f8fafc; padding:20px;">
  <div style="max-width:600px; margin:auto; background:white; border-radius:12px; overflow:hidden;">
    
    <div style="background:${color}; padding:25px; color:white; text-align:center;">
      <h1 style="margin:0;">⚠️ Health Alert</h1>
      <p>Important: ${healthData.riskLevel.toUpperCase()} risk level detected</p>
    </div>

    <div style="padding:30px;">
      <p style="font-size:18px;">Hello ${patient.firstName},</p>
      
      <div style="background:#fff5f5; padding:20px; border-radius:10px; border-left:6px solid ${color};">
        <h3 style="margin-top:0;">Important Health Notice</h3>
        <p>Our AI system has detected an unusual reading in your recent health data:</p>
        
        <div style="background:white; padding:15px; border-radius:5px; margin:15px 0;">
          <p><strong>Measurement:</strong> ${healthData.dataType.replace('_', ' ').toUpperCase()}</p>
          <p><strong>Value:</strong> ${healthData.value} ${healthData.unit}</p>
          <p><strong>Risk Level:</strong> <span style="color:${color}; font-weight:bold;">${healthData.riskLevel.toUpperCase()}</span></p>
          <p><strong>Analysis:</strong> ${analysis.insight || 'Unusual reading detected'}</p>
        </div>
      </div>

      ${analysis.recommendations && analysis.recommendations.length > 0 ? `
      <div style="background:#fff9e6; padding:20px; border-radius:8px; margin:20px 0; border-left:6px solid #ffd700;">
        <h4 style="margin-top:0;">📋 Recommended Actions:</h4>
        <ul style="margin:10px 0; padding-left:20px;">
          ${analysis.recommendations.map(rec => `<li style="margin:8px 0;">${rec}</li>`).join('')}
        </ul>
      </div>
      ` : ''}

      <div style="background:#ffebe6; padding:15px; border-radius:5px; margin:15px 0;">
        <p style="margin:0; font-weight:bold;">
          <strong>🚨 Please consult with your healthcare provider if this reading persists or if you experience any concerning symptoms.</strong>
        </p>
      </div>
    </div>

    <div style="background:#f8fafc; padding:20px; text-align:center; font-size:12px; color:#9ca3af;">
      This is an automated alert from Chronic Care AI System.
    </div>

  </div>
</body>
</html>
`;

      const mailOptions = {
        sender: {
          name: this.fromName,
          email: this.fromEmail
        },
        to: [{
          email: patient.email,
          name: `${patient.firstName} ${patient.lastName}`
        }],
        subject: `⚠️ Health Alert: ${healthData.dataType.replace('_', ' ').toUpperCase()} - ${healthData.riskLevel.toUpperCase()}`,
        htmlContent: htmlContent
      };

      const data = await this.sendViaBrevo(mailOptions);
      console.log(`✅ Health alert sent to ${patient.email}`);
      return data;

    } catch (error) {
      console.error("❌ Error sending health alert:", error);
      return { error: error.message, simulated: true };
    }
  }

  // =====================================
  // TEST EMAIL FUNCTION
  // =====================================

  async sendTestEmail(patient) {
    try {
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial; background:#f8fafc; padding:20px;">
  <div style="max-width:600px; margin:auto; background:white; border-radius:12px; overflow:hidden;">
    
    <div style="background:#667eea; padding:25px; color:white; text-align:center;">
      <h1 style="margin:0;">✅ Test Email Successful</h1>
    </div>

    <div style="padding:30px;">
      <p style="font-size:18px;">Hello ${patient.firstName},</p>
      
      <p>This is a test email from your Chronic Care AI System to confirm that email notifications are working properly.</p>
      
      <div style="background:#f0f9ff; padding:20px; border-radius:8px; margin:20px 0;">
        <p style="margin:0 0 10px 0; font-weight:bold;">If you're receiving this email, it means:</p>
        <ul style="margin:0; padding-left:20px;">
          <li>✅ Your email settings are configured correctly</li>
          <li>✅ The email scheduler is running properly</li>
          <li>✅ You'll receive your daily health updates as scheduled</li>
        </ul>
      </div>
      
      <p>Your next scheduled email will be sent at your preferred time: <strong>${patient.preferredEmailTime}</strong></p>
    </div>

    <div style="background:#f8fafc; padding:20px; text-align:center; font-size:12px; color:#9ca3af;">
      This is a test message from Chronic Care AI System.
    </div>

  </div>
</body>
</html>
`;

      const mailOptions = {
        sender: {
          name: this.fromName,
          email: this.fromEmail
        },
        to: [{
          email: patient.email,
          name: `${patient.firstName} ${patient.lastName}`
        }],
        subject: '✅ Test Email - Chronic Care AI System',
        htmlContent: htmlContent
      };

      const data = await this.sendViaBrevo(mailOptions);
      console.log(`✅ Test email sent to ${patient.email}`);
      return data;

    } catch (error) {
      console.error("❌ Error sending test email:", error);
      return { error: error.message, simulated: true };
    }
  }

  // =====================================
  // PROGRESS REPORT EMAIL
  // =====================================

  async sendProgressReport(patient, progressData) {
    try {
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial; background:#f8fafc; padding:20px;">
  <div style="max-width:600px; margin:auto; background:white; border-radius:12px; overflow:hidden;">
    
    <div style="background:#10b981; padding:25px; color:white; text-align:center;">
      <h1 style="margin:0;">📈 Your Weekly Progress Report</h1>
    </div>

    <div style="padding:30px;">
      <p style="font-size:18px;">Hello ${patient.firstName},</p>
      
      <div style="background:#f0f4ff; padding:20px; border-radius:10px; margin:20px 0;">
        <h3 style="margin-top:0;">📊 Weekly Summary</h3>
        <p><strong>Medication Adherence:</strong> ${progressData.medicationAdherence}%</p>
        <p><strong>Data Entries:</strong> ${progressData.dataEntries} records</p>
        <p><strong>Goal Progress:</strong> ${progressData.goalsAchieved} of ${progressData.totalGoals} goals on track</p>
      </div>

      ${progressData.goals && progressData.goals.length > 0 ? `
      <div style="background:#f0f9ff; padding:20px; border-radius:8px; margin:20px 0;">
        <h4 style="margin-top:0;">🎯 Goal Progress</h4>
        ${progressData.goals.map(goal => `
          <div style="background:white; padding:15px; margin:10px 0; border-radius:5px; border-left:4px solid #10b981;">
            <p style="margin:0 0 8px 0; font-weight:bold;">${goal.title}</p>
            <p style="margin:0 0 5px 0;">Progress: ${goal.progress}% (${goal.currentValue} of ${goal.targetValue} ${goal.unit})</p>
            <div style="background:#e5e7eb; border-radius:10px; height:10px; margin:5px 0;">
              <div style="background:#10b981; width:${goal.progress}%; height:100%; border-radius:10px;"></div>
            </div>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <p style="font-size:14px; color:#6b7280; margin-top:25px;">
        Keep up the great work! Your consistent efforts are key to managing your health effectively.
      </p>
    </div>

    <div style="background:#f8fafc; padding:20px; text-align:center; font-size:12px; color:#9ca3af;">
      This is an automated progress report from Chronic Care AI System.
    </div>

  </div>
</body>
</html>
`;

      const mailOptions = {
        sender: {
          name: this.fromName,
          email: this.fromEmail
        },
        to: [{
          email: patient.email,
          name: `${patient.firstName} ${patient.lastName}`
        }],
        subject: '📈 Your Weekly Health Progress Report',
        htmlContent: htmlContent
      };

      const data = await this.sendViaBrevo(mailOptions);
      console.log(`✅ Progress report sent to ${patient.email}`);
      return data;

    } catch (error) {
      console.error("❌ Error sending progress report:", error);
      return { error: error.message, simulated: true };
    }
  }

  // =====================================
  // MANUAL TEST ALL REMINDERS
  // =====================================

  async testAllReminders() {
    try {
      console.log("🧪 Testing all email reminders…");

      const medications = await Medication.findAll({
        where: { isActive: true },
        include: [{
          model: Patient,
          as: 'patient'
        }]
      });

      if (medications.length === 0) {
        console.log("ℹ️ No active medications for testing");
        return;
      }

      for (const med of medications) {
        console.log(`📤 Test email → ${med.patient.email}`);
        await this.sendMedicationReminder(med.patient, med);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error("❌ Test email error:", error);
    }
  }
}

// ✅ Create instance and export it
const emailService = new EmailService();

module.exports = emailService;