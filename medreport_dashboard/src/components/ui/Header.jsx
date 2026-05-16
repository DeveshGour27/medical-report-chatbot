import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const Header = ({ onSidebarToggle, isSidebarCollapsed = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const primaryNavItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: 'LayoutDashboard'
    },
    {
      label: 'Upload Report',
      path: '/upload-report',
      icon: 'Upload'
    },
    {
      label: 'My Reports',
      path: '/my-reports',
      icon: 'FileText'
    },
    {
      label: 'Chat Assistant',
      path: '/chat-assistant',
      icon: 'MessageSquare'
    }
  ];

  const secondaryNavItems = [
    {
      label: 'Profile Settings',
      path: '/profile-settings',
      icon: 'Settings'
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
    <header className="fixed top-0 left-0 right-0 z-100 bg-card border-b border-border">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left Section - Logo and Mobile Toggle */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors duration-150"
          >
            <Icon name="Menu" size={20} />
          </button>

          {/* Desktop Sidebar Toggle */}
          <button
            onClick={onSidebarToggle}
            className="hidden lg:flex p-2 rounded-lg hover:bg-muted transition-colors duration-150"
          >
            <Icon name={isSidebarCollapsed ? "PanelLeftOpen" : "PanelLeftClose"} size={20} />
          </button>

          {/* Logo */}
          <Link to="/dashboard" className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
              <Icon name="Activity" size={20} color="white" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-lg font-semibold text-foreground">MedReport</span>
              <span className="text-xs text-muted-foreground">Dashboard</span>
            </div>
          </Link>
        </div>

        {/* Center Section - Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-1">
          {primaryNavItems?.map((item) => (
            <Link
              key={item?.path}
              to={item?.path}
              className={`flex items-center px-4 py-2 rounded-lg transition-all duration-150 ease-out ${
                isActive(item?.path)
                  ? 'bg-primary text-primary-foreground shadow-card'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon name={item?.icon} size={18} className="mr-2" />
              <span className="font-medium">{item?.label}</span>
            </Link>
          ))}
        </nav>

        {/* Right Section - User Menu and More Options */}
        <div className="flex items-center space-x-2">
          {/* More Menu - Desktop */}
          <div className="hidden lg:block relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center px-3 py-2 rounded-lg hover:bg-muted transition-colors duration-150"
            >
              <Icon name="MoreHorizontal" size={18} className="mr-2" />
              <span className="font-medium text-muted-foreground">More</span>
              <Icon name="ChevronDown" size={16} className="ml-1 text-muted-foreground" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-popover border border-border rounded-lg shadow-modal py-2 z-200">
                {secondaryNavItems?.map((item) => (
                  <Link
                    key={item?.path}
                    to={item?.path}
                    className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors duration-150"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Icon name={item?.icon} size={16} className="mr-3" />
                    {item?.label}
                  </Link>
                ))}
                <hr className="my-2 border-border" />
                <Link
                  to="/help"
                  className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors duration-150"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Icon name="HelpCircle" size={16} className="mr-3" />
                  Help & Support
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm text-error hover:bg-muted transition-colors duration-150"
                >
                  <Icon name="LogOut" size={16} className="mr-3" />
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* User Avatar - Mobile */}
          <div className="lg:hidden">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
              <Icon name="User" size={16} color="white" />
            </div>
          </div>
        </div>
      </div>
      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 z-200 bg-background">
          <div className="p-6 space-y-4">
            {[...primaryNavItems, ...secondaryNavItems]?.map((item) => (
              <Link
                key={item?.path}
                to={item?.path}
                className={`flex items-center px-4 py-3 rounded-lg transition-all duration-150 ease-out ${
                  isActive(item?.path)
                    ? 'bg-primary text-primary-foreground shadow-card'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon name={item?.icon} size={20} className="mr-3" />
                <span className="font-medium">{item?.label}</span>
              </Link>
            ))}
            
            <hr className="my-4 border-border" />
            
            <Link
              to="/help"
              className="flex items-center px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-150"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Icon name="HelpCircle" size={20} className="mr-3" />
              <span className="font-medium">Help & Support</span>
            </Link>
            
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 rounded-lg text-error hover:bg-muted transition-colors duration-150"
            >
              <Icon name="LogOut" size={20} className="mr-3" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;