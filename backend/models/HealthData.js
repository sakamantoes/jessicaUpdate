module.exports = (sequelize, DataTypes) => {
  const HealthData = sequelize.define('HealthData', {
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
    dataType: {
      type: DataTypes.ENUM(
        'blood_pressure',
        'blood_sugar',
        'heart_rate',
        'weight',
        'cholesterol',
        'oxygen_saturation',
        'activity_level',
        'sleep_quality'
      ),
      allowNull: false
    },
    value: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT
    },
    recordedAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    riskLevel: {
      type: DataTypes.ENUM('low', 'moderate', 'high', 'critical'),
      defaultValue: 'low'
    },
    aiAnalysis: {
      type: DataTypes.JSON
    }
  }, {
    tableName: 'health_data',
    timestamps: true,
    indexes: [
      {
        fields: ['patientId', 'dataType', 'recordedAt']
      }
    ]
  });

  HealthData.associate = function(models) {
    HealthData.belongsTo(models.Patient, { foreignKey: 'patientId', as: 'patient' });
  };

  return HealthData;
};