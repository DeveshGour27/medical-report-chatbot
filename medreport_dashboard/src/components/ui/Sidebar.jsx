import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const Sidebar = ({ isCollapsed = false, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);

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
    },
  ];

  // NEW: Memory & Intelligence items (replace profile name slot)
  const memoryItems = [
    {
      label: 'Health Timeline',
      path: '/timeline',
      icon: 'Clock',
      tooltip: 'Your chronological health history'
    },
    {
      label: 'Health Profile',
      path: '/health-profile',
      icon: 'HeartPulse',
      tooltip: 'AI-generated health summary & PDF'
    },
  ];

  const isActive = (path) => location?.pathname === path;

  const handleLogout = async () => {
    const { error } = await signOut();
    if (!error) {
      toast.success('Signed out successfully. See you soon!');
      localStorage.removeItem('navigationState');
      setTimeout(() => navigate('/login'), 500);
    } else {
      toast.error('Failed to sign out. Please try again.');
    }
  };

  const NavLink = ({ item }) => (
    <Link
      to={item.path}
      className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-150 ease-out group ${
        isActive(item.path)
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
      title={isCollapsed ? item.tooltip : ''}
    >
      <Icon
        name={item.icon}
        size={18}
        className={`${isCollapsed ? 'mx-auto' : 'mr-3'} flex-shrink-0 transition-colors duration-150`}
      />
      {!isCollapsed && (
        <span className="font-medium text-sm">{item.label}</span>
      )}
    </Link>
  );

  return (
    <aside
      className={`fixed left-0 top-0 z-[100] h-full bg-card border-r border-border transition-all duration-300 ease-out ${
        isCollapsed ? 'w-16' : 'w-60'
      } lg:translate-x-0 flex flex-col`}
    >
      {/* Logo Section */}
      <div className="flex items-center h-16 px-4 border-b border-border flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg flex-shrink-0">
            <Icon name="Activity" size={18} color="white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold text-foreground leading-tight">MedReport</span>
              <span className="text-xs text-muted-foreground">AI Assistant</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation scroll area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* Main navigation */}
        {navigationItems.map((item) => (
          <NavLink key={item.path} item={item} />
        ))}

        {/* Divider + Memory section */}
        <div className="pt-3 pb-1">
          {!isCollapsed && (
            <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest px-3 mb-2">
              Memory & Insights
            </p>
          )}
          {isCollapsed && <div className="border-t border-border/40 mb-1" />}
        </div>

        {memoryItems.map((item) => (
          <NavLink key={item.path} item={item} />
        ))}

        {/* Help link */}
        <div className="pt-3">
          {!isCollapsed && <div className="border-t border-border/40 mb-3" />}
          <NavLink item={{ label: 'Help & Support', path: '/help', icon: 'HelpCircle', tooltip: 'Help & Support' }} />
        </div>
      </div>

      {/* Bottom: Sign Out only (profile is in header) */}
      <div className="border-t border-border p-3 flex-shrink-0">
        <div className="relative">
          <button
            onClick={() => setLogoutOpen(!logoutOpen)}
            className={`flex items-center w-full px-3 py-2.5 rounded-lg transition-all duration-150 ease-out hover:bg-muted text-muted-foreground hover:text-foreground ${
              isCollapsed ? 'justify-center' : 'space-x-3'
            }`}
            title={isCollapsed ? 'Account' : ''}
          >
            <div className="w-7 h-7 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Icon name="User" size={14} className="text-primary" />
            </div>
            {!isCollapsed && (
              <>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {user?.email || 'Account'}
                  </p>
                </div>
                <Icon
                  name={logoutOpen ? 'ChevronUp' : 'ChevronDown'}
                  size={14}
                  className="text-muted-foreground flex-shrink-0"
                />
              </>
            )}
          </button>

          {/* Logout dropdown */}
          {logoutOpen && !isCollapsed && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setLogoutOpen(false)} />
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border border-border rounded-xl shadow-xl py-1 z-50">
                <Link
                  to="/profile-settings"
                  className="flex items-center px-4 py-2.5 text-sm text-popover-foreground hover:bg-muted transition-colors"
                  onClick={() => setLogoutOpen(false)}
                >
                  <Icon name="Settings" size={15} className="mr-3 text-muted-foreground" />
                  Profile Settings
                </Link>
                <hr className="my-1 border-border" />
                <button
                  onClick={() => { setLogoutOpen(false); handleLogout(); }}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-red-400 hover:bg-muted transition-colors"
                >
                  <Icon name="LogOut" size={15} className="mr-3" />
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