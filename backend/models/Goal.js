module.exports = (sequelize, DataTypes) => {
  const Goal = sequelize.define('Goal', {
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
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    targetValue: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    currentValue: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    unit: {
      type: DataTypes.STRING
    },
    deadline: {
      type: DataTypes.DATE
    },
    category: {
      type: DataTypes.ENUM(
        'medication_adherence',
        'blood_pressure',
        'blood_sugar',
        'weight',
        'exercise',
        'diet'
      ),
      allowNull: false
    },
    progress: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    isAchieved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'goals',
    timestamps: true
  });

  Goal.associate = function(models) {
    Goal.belongsTo(models.Patient, { foreignKey: 'patientId', as: 'patient' });
  };

  return Goal;
};