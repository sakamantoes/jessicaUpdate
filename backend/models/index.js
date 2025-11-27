const { Sequelize } = require('sequelize');
const dotenv = require('dotenv')

dotenv.config()

// Simple Sequelize configuration with better error handling
let sequelize;

if (process.env.DATABASE_URL) {
  console.log('📊 Using DATABASE_URL for connection');
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : undefined
    },
    retry: {
      max: 3,
      timeout: 30000
    }
  });
} else {
  console.log('📊 Using individual DB environment variables for connection');
  sequelize = new Sequelize(
    process.env.DB_NAME || 'chronic_care_ai',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      dialectOptions: process.env.NODE_ENV === 'production' ? {
        ssl: {
          rejectUnauthorized: false
        }
      } : {}
    }
  );
}

// Test database connection with better logging
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Log which config we're using
    if (process.env.DATABASE_URL) {
      // Mask password in log
      const dbUrl = new URL(process.env.DATABASE_URL);
      console.log(`📊 Connected to: ${dbUrl.hostname}${dbUrl.pathname}`);
    } else {
      console.log(`📊 Connected to: ${sequelize.config.host}:${sequelize.config.port}/${sequelize.config.database}`);
    }
  } catch (error) {
    console.error('❌ Unable to connect to the database:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (process.env.DATABASE_URL) {
      const dbUrl = new URL(process.env.DATABASE_URL);
      console.error('Trying to connect to:', dbUrl.hostname);
      console.error('Please check your DATABASE_URL environment variable');
    } else {
      console.error('Trying to connect to:', sequelize.config.host);
      console.error('Please check your DB environment variables');
    }
    
    process.exit(1);
  }
};

testConnection();

const db = {
  Sequelize,
  sequelize,
  Patient: require('./Patient')(sequelize, Sequelize),
  HealthData: require('./HealthData')(sequelize, Sequelize),
  Medication: require('./Medication')(sequelize, Sequelize),
  Reminder: require('./Reminder')(sequelize, Sequelize),
  Goal: require('./Goal')(sequelize, Sequelize),
  Feedback: require('./Feedback')(sequelize, Sequelize)
};

// Define associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;