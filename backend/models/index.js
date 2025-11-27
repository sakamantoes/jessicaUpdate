
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : undefined
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Test connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to Railway MySQL successfully!');
  } catch (error) {
    console.error('❌ Unable to connect to database:', error.message);
    process.exit(1);
  }
}

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