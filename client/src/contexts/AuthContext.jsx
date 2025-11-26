import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('authToken'));

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('authToken');
      const storedPatient = localStorage.getItem('patient');

      if (storedToken && storedPatient) {
        setToken(storedToken);
        setPatient(JSON.parse(storedPatient));
        
        // Verify token is still valid
        try {
          await authService.getProfile();
        } catch (error) {
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      const { patient: patientData, token: newToken } = response.data.data;
      
      localStorage.setItem('authToken', newToken);
      localStorage.setItem('patient', JSON.stringify(patientData));
      setToken(newToken);
      setPatient(patientData);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const register = async (patientData) => {
    try {
      const response = await authService.register(patientData);
      const { patient: newPatient, token: newToken } = response.data.data;
      
      localStorage.setItem('authToken', newToken);
      localStorage.setItem('patient', JSON.stringify(newPatient));
      setToken(newToken);
      setPatient(newPatient);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('patient');
    setToken(null);
    setPatient(null);
  };

  const updatePatient = (updatedPatient) => {
    setPatient(updatedPatient);
    localStorage.setItem('patient', JSON.stringify(updatedPatient));
  };

  const value = {
    patient,
    token,
    login,
    register,
    logout,
    updatePatient,
    isAuthenticated: !!token && !!patient,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};