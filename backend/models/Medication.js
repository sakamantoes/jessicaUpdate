// In your models/Medication.js file
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Medication = sequelize.define('Medication', {
     id: {
      type: DataTypes.UUID, // Change from INTEGER to UUID
      defaultValue: DataTypes.UUIDV4, // Automatically generate UUID
      primaryKey: true
    },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'patients',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    dosage: {
      type: DataTypes.STRING,
      allowNull: false
    },
    frequency: {
      type: DataTypes.STRING,
      allowNull: false
    },
    schedule: {
      type: DataTypes.TEXT,
      get() {
        const rawValue = this.getDataValue('schedule');
        return rawValue ? JSON.parse(rawValue) : null;
      },
      set(value) {
        this.setDataValue('schedule', JSON.stringify(value));
      },
      defaultValue: JSON.stringify({
        times: ['09:00', '13:00', '20:00'],
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      })
    },
    purpose: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    adherence: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lastTaken: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    reminderTimes: {
      type: DataTypes.TEXT,
      get() {
        const rawValue = this.getDataValue('reminderTimes');
        return rawValue ? rawValue.split(',').filter(Boolean) : [];
      },
      set(value) {
        if (Array.isArray(value)) {
          this.setDataValue('reminderTimes', value.join(','));
        } else {
          this.setDataValue('reminderTimes', value);
        }
      },
      defaultValue: '09:00,13:00,20:00'
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    startDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'medications',
    timestamps: true,
    underscored: false
  });

  Medication.associate = (models) => {
    Medication.belongsTo(models.Patient, {
      foreignKey: 'patientId',
      as: 'patient',
      onDelete: 'CASCADE'
    });
  };

  return Medication;
};