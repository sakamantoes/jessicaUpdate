import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="min-h-full">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default Layout;