const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD || "",   // empty password support
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,

    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : undefined,
    },

    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Test DB connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to MySQL successfully!');
  } catch (error) {
    console.error('❌ Unable to connect:', error.message);
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

// Load associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;
