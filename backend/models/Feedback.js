module.exports = (sequelize, DataTypes) => {
  const Feedback = sequelize.define('Feedback', {
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
        'ai_analysis',
        'progress_update',
        'risk_alert',
        'motivational',
        'educational'
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
    severity: {
      type: DataTypes.ENUM('info', 'warning', 'alert', 'critical'),
      defaultValue: 'info'
    },
    recommendations: {
      type: DataTypes.JSON
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    dataContext: {
      type: DataTypes.JSON
    }
  }, {
    tableName: 'feedbacks',
    timestamps: true
  });

  Feedback.associate = function(models) {
    Feedback.belongsTo(models.Patient, { foreignKey: 'patientId', as: 'patient' });
  };

  return Feedback;
};