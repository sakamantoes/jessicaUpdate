module.exports = (sequelize, DataTypes) => {
  const Reminder = sequelize.define('Reminder', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'patients',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM(
        'medication',
        'appointment',
        'measurement',
        'exercise',
        'diet',
        'motivational'
      ),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    scheduledFor: {
      type: DataTypes.DATE,
      allowNull: false
    },
    isCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      defaultValue: 'medium'
    },
    recurrence: {
      type: DataTypes.JSON
    }
  }, {
    tableName: 'reminders',
    timestamps: true,
    indexes: [
      {
        fields: ['patientId', 'scheduledFor', 'isCompleted']
      }
    ]
  });

  Reminder.associate = function(models) {
    Reminder.belongsTo(models.Patient, { foreignKey: 'patientId', as: 'patient' });
  };

  return Reminder;
};