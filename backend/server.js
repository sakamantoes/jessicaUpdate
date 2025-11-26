const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('./models');
const emailScheduler = require('./services/emailScheduler');
const aiAnalysisService = require('./services/aiAnalysisService');

require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
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
app.use('/api/ai-analysis', require('./routes/aiAnalysis'));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Chronic Care AI System is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

// Initialize database and start server
sequelize.sync({ force: false })
  .then(() => {
    console.log('Database synchronized');
    
    // Start email scheduler
    emailScheduler.start();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database synchronization failed:', err);
  });

module.exports = app;