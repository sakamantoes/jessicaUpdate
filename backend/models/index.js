const { Sequelize } = require('sequelize');

// Simple Sequelize configuration
const sequelize = process.env.DATABASE_URL 
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'mysql',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      dialectOptions: {
        ssl: {
          rejectUnauthorized: false
        }
      }
    })
  : new Sequelize(
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

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
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