const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('./models');
const emailScheduler = require('./services/emailScheduler');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/health-data', require('./routes/healthData'));
app.use('/api/medications', require('./routes/medications'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/ai-analysis', require('./routes/aiAnalysis'));

// Health check
app.get('/', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Chronic Care AI System is running' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

// --- IMPORTANT FIX (Railway Safe) ---
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("Connected to database");

    await sequelize.sync({ alter: false });
    console.log("Database synchronized");

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Start scheduler ONLY after server is running
    emailScheduler.start();
    console.log("Email scheduler started");

  } catch (error) {
    console.error("Server startup failed:", error);
  }
}

startServer();
// ------------------------------------

module.exports = app;
