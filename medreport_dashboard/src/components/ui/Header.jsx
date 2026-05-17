import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const Header = ({ onSidebarToggle, isSidebarCollapsed = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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
    <header className="fixed top-0 left-0 right-0 z-40 bg-card border-b border-border">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left Section - Logo and Mobile Toggle */}
        <div className="flex items-center space-x-3">
          {/* Mobile Sidebar Toggle */}
          <button
            onClick={onSidebarToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors duration-150"
          >
            <Icon name={isSidebarCollapsed ? "Menu" : "X"} size={20} />
          </button>

          {/* Logo */}
          <Link to="/dashboard" className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
              <Icon name="Activity" size={20} color="white" />
            </div>
            <span className="hidden md:inline text-lg font-semibold text-foreground">MedReport</span>
          </Link>
        </div>

        {/* Right Section - User Menu */}
        <div className="flex items-center space-x-4">
          {/* User Info and Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors duration-150"
            >
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium text-foreground">{user?.username || 'User'}</span>
                <span className="text-xs text-muted-foreground">{user?.email || ''}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Icon name="User" size={16} />
              </div>
            </button>

            {/* User Dropdown Menu */}
            {userMenuOpen && (
              <>
                {/* Invisible full-screen overlay — clicking anywhere outside closes the dropdown */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserMenuOpen(false)}
                />
                {/* Dropdown panel — sits above the overlay at z-50 */}
                <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg py-2 z-50">
                  <Link
                    to="/profile-settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center space-x-3 px-4 py-2 hover:bg-muted transition-colors text-sm"
                  >
                    <Icon name="Settings" size={16} />
                    <span>Profile Settings</span>
                  </Link>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-muted transition-colors text-sm text-red-500"
                  >
                    <Icon name="LogOut" size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
