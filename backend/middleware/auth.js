const jwt = require('jsonwebtoken');
const { Patient } = require('../models');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    // Check if header has Bearer format
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'chronic-care-ai-secret-key');
    
    // Check if patient exists
    const patient = await Patient.findByPk(decoded.patientId, {
      attributes: { exclude: ['password'] }
    });

    if (!patient) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token. Patient not found.' 
      });
    }

    // Add patient to request
    req.patientId = decoded.patientId;
    req.patient = patient;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token.' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired.' 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Authentication failed.' 
    });
  }
};

// Optional auth middleware (doesn't throw error if no token)
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return next();
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'chronic-care-ai-secret-key');
    const patient = await Patient.findByPk(decoded.patientId, {
      attributes: { exclude: ['password'] }
    });

    if (patient) {
      req.patientId = decoded.patientId;
      req.patient = patient;
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

module.exports = authMiddleware;
module.exports.optionalAuth = optionalAuthMiddleware;