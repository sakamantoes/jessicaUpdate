import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-indigo-950 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-white mb-2 md:mb-0">
            &copy; {currentYear} Chronic Care AI. All rights reserved.
          </div>
          <div className="text-sm text-gray-500">
            Empowering better health management 
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;