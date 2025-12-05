module.exports = (sequelize, DataTypes) => {
  const Patient = sequelize.define('Patient', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    dateOfBirth: {
      type: DataTypes.DATE,
      allowNull: false
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'other'),
      allowNull: false
    },
    chronicConditions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    preferredEmailTime: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: '09:00:00'
    },
    phoneNumber: {
      type: DataTypes.STRING
    },
    emergencyContact: {
      type: DataTypes.JSON
    },
    medicationAdherence: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    motivationLevel: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      defaultValue: 'medium'
    },
    // Add to your Patient model
emailPreferences: {
  type: DataTypes.JSON,
  defaultValue: {
    motivational: true,
    medication: true,
    alerts: true,
    reports: true
  }
},
emailNotifications: {
  type: DataTypes.BOOLEAN,
  defaultValue: true
},
    lastAssessment: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'patients',
    timestamps: true
  });

  Patient.associate = function(models) {
    Patient.hasMany(models.HealthData, { foreignKey: 'patientId', as: 'healthData' });
    Patient.hasMany(models.Medication, { foreignKey: 'patientId', as: 'medications' });
    Patient.hasMany(models.Reminder, { foreignKey: 'patientId', as: 'reminders' });
    Patient.hasMany(models.Goal, { foreignKey: 'patientId', as: 'goals' });
    Patient.hasMany(models.Feedback, { foreignKey: 'patientId', as: 'feedbacks' });
  };

  return Patient;
};