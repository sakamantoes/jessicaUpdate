module.exports = (sequelize, DataTypes) => {
  const Medication = sequelize.define('Medication', {
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
      type: DataTypes.JSON,
      allowNull: false
    },
    purpose: {
      type: DataTypes.STRING
    },
    adherence: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    lastTaken: {
      type: DataTypes.DATE
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'medications',
    timestamps: true
  });

  Medication.associate = function(models) {
    Medication.belongsTo(models.Patient, { foreignKey: 'patientId', as: 'patient' });
  };

  return Medication;
};