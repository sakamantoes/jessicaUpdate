import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Heart, 
  Pill, 
  Target, 
  User,
  X,
  Mail
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = ({ open, setOpen }) => {
  const { patient, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Health Data', href: '/health-data', icon: Heart },
    { name: 'Medications', href: '/medications', icon: Pill },
    { name: 'Goals', href: '/goals', icon: Target },
     { name: 'Email Settings', href: '/email-settings', icon: Mail },
    { name: 'Profile', href: '/profile', icon: User },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div 
          className="fixed inset-0 flex z-40 md:hidden"
          onClick={() => setOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 flex flex-col z-50 bg-white w-64 transform transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 md:static md:inset-0
      `}>
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center">
            <Heart className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">
              Chronic Care AI
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Patient info */}
        <div className="px-4 py-4 border-b border-gray-200">
          <p className="text-sm font-medium text-gray-900">
            {patient?.firstName} {patient?.lastName}
          </p>
          <p className="text-sm text-gray-500">{patient?.email}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setOpen(false)}
                className={`
                  group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                  ${isActive(item.href)
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <Icon className={`
                  mr-3 h-5 w-5
                  ${isActive(item.href) ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                `} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 p-4">
          <button
            onClick={logout}
            className="group flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;