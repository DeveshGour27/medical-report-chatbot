import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const Sidebar = ({ isCollapsed = false, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navigationItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: 'LayoutDashboard',
      tooltip: 'Overview and analytics'
    },
    {
      label: 'Upload Report',
      path: '/upload-report',
      icon: 'Upload',
      tooltip: 'Submit new medical reports'
    },
    {
      label: 'My Reports',
      path: '/my-reports',
      icon: 'FileText',
      tooltip: 'Browse and manage reports'
    },
    {
      label: 'Chat Assistant',
      path: '/chat-assistant',
      icon: 'MessageSquare',
      tooltip: 'AI-powered report analysis'
    }
  ];

  const isActive = (path) => location?.pathname === path;

  const handleLogout = async () => {
    const { error } = await signOut();
    if (!error) {
      toast.success('Signed out successfully. See you soon!');
      localStorage.removeItem('navigationState');
      setTimeout(() => {
        navigate('/login');
      }, 500);
    } else {
      toast.error('Failed to sign out. Please try again.');
    }
  };

  return (
    <aside 
      className={`fixed left-0 top-0 z-100 h-full bg-card border-r border-border transition-all duration-300 ease-out ${
        isCollapsed ? 'w-16' : 'w-60'
      } lg:translate-x-0`}
    >
      {/* Logo Section */}
      <div className="flex items-center h-16 px-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
            <Icon name="Activity" size={20} color="white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-foreground">MedReport</span>
              <span className="text-xs text-muted-foreground">Dashboard</span>
            </div>
          )}
        </div>
      </div>
      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigationItems?.map((item) => (
          <Link
            key={item?.path}
            to={item?.path}
            className={`flex items-center px-3 py-3 rounded-lg transition-all duration-150 ease-out group ${
              isActive(item?.path)
                ? 'bg-primary text-primary-foreground shadow-card'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title={isCollapsed ? item?.tooltip : ''}
          >
            <Icon 
              name={item?.icon} 
              size={20} 
              className={`${isCollapsed ? 'mx-auto' : 'mr-3'} transition-colors duration-150`}
            />
            {!isCollapsed && (
              <span className="font-medium">{item?.label}</span>
            )}
          </Link>
        ))}
      </nav>
      {/* User Profile Section */}
      <div className="border-t border-border p-4">
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={`flex items-center w-full px-3 py-3 rounded-lg transition-all duration-150 ease-out hover:bg-muted ${
              isCollapsed ? 'justify-center' : 'space-x-3'
            }`}
          >
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
              <Icon name="User" size={16} color="white" />
            </div>
            {!isCollapsed && (
              <>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-foreground">
                    {user?.username || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.email || 'No email'}
                  </p>
                </div>
                <Icon
                  name={userMenuOpen ? "ChevronUp" : "ChevronDown"}
                  size={16}
                  className="text-muted-foreground"
                />
              </>
            )}
          </button>

          {/* User Dropdown Menu */}
          {userMenuOpen && !isCollapsed && (
            <>
              {/* Invisible full-screen overlay — clicking anywhere outside closes the dropdown */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border border-border rounded-lg shadow-modal py-2 z-50">
                <Link
                  to="/profile-settings"
                  className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors duration-150"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Icon name="Settings" size={16} className="mr-3" />
                  Settings
                </Link>
                <Link
                  to="/help"
                  className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors duration-150"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Icon name="HelpCircle" size={16} className="mr-3" />
                  Help & Support
                </Link>
                <hr className="my-2 border-border" />
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-error hover:bg-muted transition-colors duration-150"
                >
                  <Icon name="LogOut" size={16} className="mr-3" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;