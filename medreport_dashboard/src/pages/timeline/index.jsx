import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import Icon from '../../components/AppIcon';
import { useAuth } from '../../contexts/AuthContext';
import { API_CHAT } from '../../utils/apiConstants';

const RISK_COLORS = {
  Normal: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  Mild: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  Moderate: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  Severe: 'text-red-400 bg-red-400/10 border-red-400/20',
  Critical: 'text-rose-600 bg-rose-600/10 border-rose-600/20',
  Unknown: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
};

const EVENT_ICONS = {
  report: { icon: 'FileText', bg: 'bg-blue-500/20', color: 'text-blue-400', label: 'Report Uploaded' },
  chat_session: { icon: 'MessageSquare', bg: 'bg-purple-500/20', color: 'text-purple-400', label: 'AI Chat Session' },
  default: { icon: 'Activity', bg: 'bg-gray-500/20', color: 'text-gray-400', label: 'Event' },
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'Unknown Date';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  } catch { return dateStr.slice(0, 10); }
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return ''; }
};

const TimelineEvent = ({ event, index }) => {
  const [expanded, setExpanded] = useState(false);
  const meta = EVENT_ICONS[event.type] || EVENT_ICONS.default;
  const tests = event.tests || [];
  const abnormal = tests.filter(t => t.risk_level && t.risk_level !== 'Normal' && t.risk_level !== 'Unknown');

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="relative flex gap-4"
    >
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border border-border/50 ${meta.bg}`}>
          <Icon name={meta.icon} size={18} className={meta.color} />
        </div>
        <div className="w-px flex-1 bg-border/30 mt-2" />
      </div>

      {/* Event card */}
      <div className="flex-1 pb-6">
        <div
          className="bg-card border border-border/60 rounded-xl p-4 hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${RISK_COLORS[event.priority] || 'text-blue-400 bg-blue-400/10 border-blue-400/20'}`}>
                  {meta.label}
                </span>
                {event.category && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {event.category}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-foreground text-sm">
                {event.title || event.type?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Medical Event'}
              </h3>
              {event.report_id && (
                <p className="text-xs text-muted-foreground mt-0.5">Report ID: {String(event.report_id).slice(-8)}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-medium text-foreground">{formatDate(event.created_at || event.date)}</p>
              <p className="text-xs text-muted-foreground">{formatTime(event.created_at)}</p>
            </div>
          </div>

          {/* Quick stats */}
          {event.type === 'report' && tests.length > 0 && (
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/40">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon name="TestTube" size={13} />
                {tests.length} tests extracted
              </span>
              {abnormal.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-red-400 font-medium">
                  <Icon name="AlertTriangle" size={13} />
                  {abnormal.length} abnormal
                </span>
              )}
            </div>
          )}

          {event.type === 'chat_session' && (
            <div className="mt-3 pt-3 border-t border-border/40">
              <p className="text-xs text-muted-foreground">
                {event.message_count || 0} messages • {event.content || 'Chat session'}
              </p>
            </div>
          )}

          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Icon name={expanded ? 'ChevronUp' : 'ChevronDown'} size={13} />
            <span>{expanded ? 'Hide' : 'Show'} details</span>
          </div>
        </div>

        {/* Expanded: test breakdown */}
        <AnimatePresence>
          {expanded && tests.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 bg-card/50 border border-border/40 rounded-xl overflow-hidden"
            >
              <div className="p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Test Results</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {tests.map((test, i) => (
                    <div key={i} className="bg-background/50 rounded-lg p-2.5 border border-border/30">
                      <p className="text-xs text-muted-foreground capitalize truncate">{test.name}</p>
                      <p className="text-sm font-bold text-foreground">{test.value} <span className="text-xs font-normal text-muted-foreground">{test.unit}</span></p>
                      {test.risk_level && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full border ${RISK_COLORS[test.risk_level] || RISK_COLORS.Unknown}`}>
                          {test.risk_level}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const Timeline = () => {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total_reports: 0, total_tests: 0 });
  const [filter, setFilter] = useState('all');

  const fetchTimeline = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_CHAT}/timeline`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 20000,
      });
      const data = res.data;
      setTimeline(data.timeline || []);
      setStats({
        total_reports: data.total_reports || 0,
        total_tests: data.total_tests || 0,
      });
    } catch (err) {
      console.error('Timeline fetch error:', err);
      setError('Could not load your health timeline. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  const filteredTimeline = timeline.filter(event => {
    if (filter === 'all') return true;
    return event.type === filter;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        isSidebarCollapsed={sidebarCollapsed}
      />
      <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <main className={`pt-16 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          {/* Page header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
                <Icon name="Clock" size={22} className="text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Health Timeline</h1>
                <p className="text-sm text-muted-foreground">Your complete chronological medical history</p>
              </div>
            </div>
            <button
              onClick={fetchTimeline}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-sm font-medium transition-colors"
            >
              <Icon name="RefreshCw" size={15} />
              Refresh
            </button>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            {[
              { label: 'Total Events', value: timeline.length, icon: 'Activity', color: 'text-blue-400' },
              { label: 'Reports Uploaded', value: stats.total_reports, icon: 'FileText', color: 'text-purple-400' },
              { label: 'Tests Tracked', value: stats.total_tests, icon: 'TestTube', color: 'text-emerald-400' },
              { label: 'Chat Sessions', value: timeline.filter(e => e.type === 'chat_session').length, icon: 'MessageSquare', color: 'text-orange-400' },
            ].map((stat, i) => (
              <div key={i} className="bg-card border border-border/60 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon name={stat.icon} size={15} className={stat.color} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            ))}
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-2 flex-wrap"
          >
            {[
              { key: 'all', label: 'All Events', icon: 'LayoutList' },
              { key: 'report', label: 'Reports', icon: 'FileText' },
              { key: 'chat_session', label: 'Chat Sessions', icon: 'MessageSquare' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filter === f.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
                }`}
              >
                <Icon name={f.icon} size={13} />
                {f.label}
              </button>
            ))}
          </motion.div>

          {/* Timeline */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground text-sm">Loading your health timeline...</p>
            </div>
          ) : error ? (
            <div className="bg-card border border-red-500/30 rounded-xl p-8 text-center">
              <Icon name="AlertCircle" size={32} className="text-red-400 mx-auto mb-3" />
              <p className="text-red-400 font-medium">{error}</p>
              <button onClick={fetchTimeline} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">
                Try Again
              </button>
            </div>
          ) : filteredTimeline.length === 0 ? (
            <div className="bg-card border border-border/60 rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Icon name="Clock" size={28} className="text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No events yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Upload medical reports and chat with the AI to build your health timeline.
              </p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-0"
            >
              {filteredTimeline.map((event, index) => (
                <TimelineEvent key={event.id || index} event={event} index={index} />
              ))}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Timeline;
