import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import Icon from '../../components/AppIcon';
import ProfileHeader from './components/ProfileHeader';
import StatsOverview from './components/StatsOverview';
import PersonalInfoTab from './components/PersonalInfoTab';
import SecurityTab from './components/SecurityTab';
import PreferencesTab from './components/PreferencesTab';
import DataExportTab from './components/DataExportTab';
import { useAuth } from '../../contexts/AuthContext';
import { API_REPORTS } from '../../utils/apiConstants';

const ProfileSettings = () => {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [loadingStats, setLoadingStats] = useState(true);

  const [userProfile, setUserProfile] = useState({
    name: user?.username || "",
    title: "Patient",
    email: user?.email || "",
    avatar: "",
    location: "",
    joinDate: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "",
    medicalId: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    bloodType: "",
    emergencyContact: "",
    healthcareProvider: "",
    insuranceProvider: "",
    policyNumber: ""
  });

  // Calculate real stats from user data
  const [userStats, setUserStats] = useState({
    totalReports: 0,
    reportsAnalyzed: 0,
    accountAge: 0
  });

  // Keep security settings (not user-specific without backend)
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    lastPasswordChange: "Not set",
    activeSessions: 1
  });

  // User preferences (stored locally or in backend)
  const [preferences, setPreferences] = useState({
    units: "metric",
    language: "en",
    exportFormat: "pdf",
    defaultCategory: "general",
    notifications: {
      email: true,
      criticalAlerts: true,
      processing: false,
      weeklySummary: true
    },
    privacy: {
      allowAnalytics: false,
      shareWithProviders: true,
      researchParticipation: false
    },
    criticalThresholds: {
      bloodPressureSystolic: 140,
      heartRate: 100,
      bloodSugar: 180
    }
  });

  const [exportHistory, setExportHistory] = useState([]);

  // Fetch user stats and profile data from backend
  useEffect(() => {
    if (user) {
      calculateUserStats();
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      // Update with current user data from auth context
      if (user) {
        setUserProfile(prev => ({
          ...prev,
          name: user?.username || "User",
          email: user?.email || "",
          age: user?.age || "",
          gender: user?.gender || "",
          bloodType: user?.bloodType || "",
          medicalId: user?.medicalId || "",
          phone: user?.phone || "",
          dateOfBirth: user?.dateOfBirth || ""
        }));
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
    }
  };

  const calculateUserStats = async () => {
    try {
      setLoadingStats(true);
      const token = localStorage.getItem('token');

      if (!token) {
        setLoadingStats(false);
        return;
      }

      const response = await axios.get(`${API_REPORTS}/list`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const userReports = response.data.reports || [];
      const accountCreated = new Date(user?.createdAt);
      const accountAgeDays = Math.floor((Date.now() - accountCreated) / (1000 * 60 * 60 * 24));

      setUserStats({
        totalReports: userReports.length,
        reportsAnalyzed: userReports.filter(r => r.status === 'processed').length,
        accountAge: accountAgeDays
      });
    } catch (err) {
      console.error('Failed to calculate stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const tabs = [
    {
      id: 'personal',
      label: 'Personal Info',
      icon: 'User',
      description: 'Manage your personal and medical information'
    },
    {
      id: 'security',
      label: 'Security',
      icon: 'Shield',
      description: 'Password, 2FA, and account security settings'
    },
    {
      id: 'preferences',
      label: 'Preferences',
      icon: 'Settings',
      description: 'Notifications, privacy, and medical preferences'
    },
    {
      id: 'export',
      label: 'Data Export',
      icon: 'Download',
      description: 'Export your medical data and manage retention'
    }
  ];

  useEffect(() => {
    // Update user profile when user data changes
    if (user) {
      setUserProfile(prev => ({
        ...prev,
        name: user?.username || "User",
        email: user?.email || ""
      }));
    }
  }, [user]);

  const handleProfileUpdate = (updatedProfile) => {
    setUserProfile(updatedProfile);
    // Simulate API call to update profile
    console.log('Profile updated:', updatedProfile);
  };

  const handleSecurityUpdate = (updatedSecurity) => {
    setSecuritySettings(updatedSecurity);
    console.log('Security settings updated:', updatedSecurity);
  };

  const handlePreferencesUpdate = (updatedPreferences) => {
    setPreferences(updatedPreferences);
    console.log('Preferences updated:', updatedPreferences);
  };

  const handleDataExport = (exportData) => {
    const newExport = {
      id: Date.now(),
      ...exportData,
      status: 'completed',
      size: '2.1 MB'
    };
    setExportHistory(prev => [newExport, ...prev]);
    console.log('Data export initiated:', exportData);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'personal':
        return (
          <PersonalInfoTab
            userProfile={userProfile}
            onUpdate={handleProfileUpdate}
          />
        );
      case 'security':
        return (
          <SecurityTab
            securitySettings={securitySettings}
            onUpdate={handleSecurityUpdate}
          />
        );
      case 'preferences':
        return (
          <PreferencesTab
            preferences={preferences}
            onUpdate={handlePreferencesUpdate}
          />
        );
      case 'export':
        return (
          <DataExportTab
            exportHistory={exportHistory}
            onExport={handleDataExport}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Helmet>
        <title>Profile Settings - MedReport Dashboard</title>
        <meta name="description" content="Manage your personal information, security settings, and preferences in MedReport Dashboard" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Header 
          onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          isSidebarCollapsed={sidebarCollapsed}
        />
        <Sidebar 
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <main className={`pt-16 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
          <div className="p-6 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Icon name="Settings" size={24} className="text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
                  <p className="text-muted-foreground">Manage your account information and preferences</p>
                </div>
              </div>
            </div>

            {/* Profile Header */}
            <ProfileHeader
              userProfile={userProfile}
              onProfileUpdate={handleProfileUpdate}
            />

            {/* Stats Overview */}
            <StatsOverview stats={userStats} />

            {/* Settings Content */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Settings Navigation */}
              <div className="lg:col-span-1">
                <div className="bg-card rounded-lg border border-border p-4 sticky top-24">
                  <nav className="space-y-2">
                    {tabs?.map((tab) => (
                      <button
                        key={tab?.id}
                        onClick={() => setActiveTab(tab?.id)}
                        className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-all duration-150 ${
                          activeTab === tab?.id
                            ? 'bg-primary text-primary-foreground shadow-card'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <Icon name={tab?.icon} size={20} />
                        <div className="flex-1">
                          <div className="font-medium">{tab?.label}</div>
                          <div className={`text-xs ${activeTab === tab?.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                            {tab?.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </nav>
                </div>
              </div>

              {/* Settings Content */}
              <div className="lg:col-span-3">
                <div className="bg-card rounded-lg border border-border p-6">
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-foreground">
                      {tabs?.find(tab => tab?.id === activeTab)?.label}
                    </h2>
                    <p className="text-muted-foreground">
                      {tabs?.find(tab => tab?.id === activeTab)?.description}
                    </p>
                  </div>
                  {renderTabContent()}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default ProfileSettings;