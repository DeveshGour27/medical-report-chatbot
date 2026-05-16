import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import MetricCard from './components/MetricCard';
import RecentReportCard from './components/RecentReportCard';
import ConversationCard from './components/ConversationCard';
import QuickActions from './components/QuickActions';
import FilterBar from './components/FilterBar';
import { useAuth } from '../../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [filteredReports, setFilteredReports] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);

  // Mock data for dashboard metrics
  const dashboardMetrics = [
    {
      title: "Total Reports",
      value: "247",
      icon: "FileText",
      trend: "up",
      trendValue: "+12%",
      color: "primary"
    },
    {
      title: "AI Conversations",
      value: "89",
      icon: "MessageSquare",
      trend: "up", 
      trendValue: "+8%",
      color: "accent"
    },
    {
      title: "Reports Analyzed",
      value: "156",
      icon: "BarChart3",
      trend: "up",
      trendValue: "+15%",
      color: "success"
    },
    {
      title: "Latest Upload",
      value: "2h ago",
      icon: "Upload",
      color: "warning"
    }
  ];

  // Mock data for recent reports
  const recentReports = [
    {
      id: 1,
      type: "Blood Test",
      date: "Dec 3, 2024",
      status: "Normal",
      summary: "Complete blood count shows all parameters within normal range. Hemoglobin: 14.2 g/dL, WBC: 7,200/μL"
    },
    {
      id: 2,
      type: "X-Ray",
      date: "Dec 2, 2024", 
      status: "Normal",
      summary: "Chest X-ray reveals clear lung fields with no signs of infection or abnormalities"
    },
    {
      id: 3,
      type: "MRI",
      date: "Dec 1, 2024",
      status: "Pending",
      summary: "Brain MRI scan completed. Awaiting radiologist review for detailed analysis"
    },
    {
      id: 4,
      type: "ECG",
      date: "Nov 30, 2024",
      status: "Normal",
      summary: "12-lead ECG shows normal sinus rhythm with heart rate of 72 bpm"
    },
    {
      id: 5,
      type: "CT Scan",
      date: "Nov 29, 2024",
      status: "Abnormal",
      summary: "Abdominal CT shows minor inflammation in the lower abdomen. Follow-up recommended"
    },
    {
      id: 6,
      type: "Ultrasound",
      date: "Nov 28, 2024",
      status: "Normal",
      summary: "Abdominal ultrasound reveals normal organ structure and function"
    }
  ];

  // Mock data for recent conversations
  const recentConversations = [
    {
      id: 1,
      topic: "Blood Test Results Analysis",
      lastMessage: "Your hemoglobin levels are within the normal range. The slight increase in white blood cells could indicate...",
      timestamp: new Date(Date.now() - 900000) // 15 minutes ago
    },
    {
      id: 2,
      topic: "X-Ray Interpretation",
      lastMessage: "The chest X-ray shows clear lung fields. There are no signs of pneumonia or other respiratory issues...",
      timestamp: new Date(Date.now() - 3600000) // 1 hour ago
    },
    {
      id: 3,
      topic: "MRI Scan Questions",
      lastMessage: "I can help explain the MRI findings once the radiologist completes the review. In the meantime...",
      timestamp: new Date(Date.now() - 7200000) // 2 hours ago
    },
    {
      id: 4,
      topic: "ECG Reading Discussion",
      lastMessage: "Your ECG shows a normal sinus rhythm. The heart rate of 72 bpm is excellent for your age group...",
      timestamp: new Date(Date.now() - 86400000) // 1 day ago
    },
    {
      id: 5,
      topic: "CT Scan Follow-up",
      lastMessage: "The CT scan shows minor inflammation. I recommend discussing treatment options with your doctor...",
      timestamp: new Date(Date.now() - 172800000) // 2 days ago
    }
  ];

  useEffect(() => {
    setFilteredReports(recentReports?.slice(0, 6));
    setFilteredConversations(recentConversations?.slice(0, 4));
  }, []);

  const handleFilterChange = (filters) => {
    let filtered = [...recentReports];
    
    // Filter by report type
    if (filters?.reportType !== 'all') {
      filtered = filtered?.filter(report => report?.type === filters?.reportType);
    }
    
    // Filter by date range
    if (filters?.dateRange !== 'all') {
      const now = new Date();
      const reportDate = new Date();
      
      switch (filters?.dateRange) {
        case 'today':
          filtered = filtered?.filter(report => {
            const date = new Date(report.date);
            return date?.toDateString() === now?.toDateString();
          });
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          filtered = filtered?.filter(report => {
            const date = new Date(report.date);
            return date >= weekAgo;
          });
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          filtered = filtered?.filter(report => {
            const date = new Date(report.date);
            return date >= monthAgo;
          });
          break;
        default:
          break;
      }
    }
    
    setFilteredReports(filtered?.slice(0, 6));
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
                {filteredReports?.length} of {recentReports?.length} reports
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
                  <motion.div key={report?.id} variants={itemVariants}>
                    <RecentReportCard report={report} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <p className="text-muted-foreground">No reports found matching the selected filters.</p>
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
                {filteredConversations?.length} active
              </span>
            </div>
            
            <motion.div 
              className="space-y-3"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {filteredConversations?.map((conversation) => (
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
                  <span className="text-muted-foreground">This Week</span>
                  <span className="font-medium text-foreground">12 reports</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">AI Interactions</span>
                  <span className="font-medium text-foreground">28 chats</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg. Response</span>
                  <span className="font-medium text-foreground">2.3 min</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;