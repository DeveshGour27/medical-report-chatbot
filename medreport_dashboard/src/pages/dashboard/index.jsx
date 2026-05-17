import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import MetricCard from './components/MetricCard';
import RecentReportCard from './components/RecentReportCard';
import ConversationCard from './components/ConversationCard';
import QuickActions from './components/QuickActions';
import FilterBar from './components/FilterBar';
import { useAuth } from '../../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user's reports from backend
  useEffect(() => {
    fetchUserReports();
  }, []);

  const fetchUserReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('No authentication token found');
        setReports([]);
        setLoading(false);
        return;
      }

      const response = await axios.get('http://localhost:4000/api/reports/list', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const userReports = response.data.reports || [];
      setReports(userReports);
      setFilteredReports(userReports?.slice(0, 6));
      setError(null);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setError('Failed to load reports. Please try again.');
      setReports([]);
      setFilteredReports([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate dashboard metrics from real data
  const dashboardMetrics = [
    {
      title: "Total Reports",
      value: reports.length.toString(),
      icon: "FileText",
      trend: "up",
      color: "primary"
    },
    {
      title: "Processed Reports",
      value: reports.filter(r => r.status === 'processed').length.toString(),
      icon: "BarChart3",
      trend: "up",
      color: "success"
    },
    {
      title: "Latest Upload",
      value: reports.length > 0 ? new Date(reports[0]?.uploadDate).toLocaleDateString() : "No uploads",
      icon: "Upload",
      color: "warning"
    },
    {
      title: "Categories",
      value: new Set(reports.map(r => r.category)).size.toString(),
      icon: "Folder",
      color: "accent"
    }
  ];

  // Mock conversations for now (can be connected to backend later)
  const recentConversations = [
    {
      id: 1,
      topic: "Report Analysis",
      lastMessage: "Your reports have been analyzed. Click to view details.",
      timestamp: new Date()
    }
  ];

  const handleFilterChange = (filters) => {
    let filtered = [...reports];
    
    // Filter by report type (category)
    if (filters?.reportType !== 'all' && filters?.reportType) {
      filtered = filtered?.filter(report => report?.category === filters?.reportType);
    }
    
    setFilteredReports(filtered?.slice(0, 6));
  };

  // Format report for display
  const formatReportForCard = (report) => {
    return {
      id: report._id,
      type: report.category || 'General',
      date: new Date(report.uploadDate).toLocaleDateString(),
      status: report.status || 'processed',
      summary: report.notes || 'No notes available'
    };
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
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
        <div className="p-6 space-y-8">
        {/* Header Section */}
        <motion.div 
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back{user?.username ? `, ${user.username}` : ''}! Here's an overview of your medical reports and AI conversations.
            </p>
          </div>
          <QuickActions />
        </motion.div>

        {/* Metrics Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {dashboardMetrics?.map((metric, index) => (
            <motion.div key={index} variants={itemVariants}>
              <MetricCard {...metric} />
            </motion.div>
          ))}
        </motion.div>

        {/* Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <FilterBar onFilterChange={handleFilterChange} />
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Reports Section */}
          <motion.div 
            className="lg:col-span-2 space-y-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Recent Reports</h2>
              <span className="text-sm text-muted-foreground">
                {filteredReports?.length} of {reports?.length} reports
              </span>
            </div>
            
            {filteredReports?.length > 0 ? (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {filteredReports?.map((report) => (
                  <motion.div key={report?._id} variants={itemVariants}>
                    <RecentReportCard report={formatReportForCard(report)} />
                  </motion.div>
                ))}
              </motion.div>
            ) : loading ? (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <p className="text-muted-foreground">Loading reports...</p>
              </div>
            ) : error ? (
              <div className="bg-card border border-error rounded-lg p-8 text-center">
                <p className="text-error">{error}</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <p className="text-muted-foreground">No reports found. Upload your first report to get started!</p>
              </div>
            )}
          </motion.div>

          {/* Recent Conversations Section */}
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Recent Conversations</h2>
              <span className="text-sm text-muted-foreground">
                {recentConversations?.length} active
              </span>
            </div>
            
            <motion.div 
              className="space-y-3"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {recentConversations?.map((conversation) => (
                <motion.div key={conversation?.id} variants={itemVariants}>
                  <ConversationCard conversation={conversation} />
                </motion.div>
              ))}
            </motion.div>

            {/* Quick Stats */}
            <motion.div 
              className="bg-card border border-border rounded-lg p-4 space-y-3"
              variants={itemVariants}
            >
              <h3 className="font-medium text-foreground">Quick Stats</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Reports</span>
                  <span className="font-medium text-foreground">{reports.length} reports</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Processed</span>
                  <span className="font-medium text-foreground">{reports.filter(r => r.status === 'processed').length} reports</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Categories</span>
                  <span className="font-medium text-foreground">{new Set(reports.map(r => r.category)).size} types</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;