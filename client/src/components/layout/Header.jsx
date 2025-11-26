import React from 'react';
import { Menu, Bell, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Header = ({ onMenuClick }) => {
  const { patient } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left side - Menu button */}
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Right side - Notifications & User */}
        <div className="flex items-center space-x-4">
          <button className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100">
            <Bell className="h-5 w-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-900">
                {patient?.firstName} {patient?.lastName}
              </p>
              <p className="text-xs text-gray-500">Patient</p>
            </div>
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-blue-600" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;