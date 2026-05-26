import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import Icon from '../../components/AppIcon';
import { useAuth } from '../../contexts/AuthContext';
import { API_CHAT } from '../../utils/apiConstants';
import toast from 'react-hot-toast';

const RISK_COLORS = {
  Normal: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  Mild: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', dot: 'bg-yellow-400' },
  Moderate: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', dot: 'bg-orange-400' },
  Severe: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', dot: 'bg-red-400' },
  Critical: { bg: 'bg-rose-600/10', text: 'text-rose-400', border: 'border-rose-600/20', dot: 'bg-rose-600' },
  single_reading: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', dot: 'bg-blue-400' },
  stable: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  increasing: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', dot: 'bg-orange-400' },
  decreasing: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', dot: 'bg-blue-400' },
};

const TREND_ICONS = { increasing: 'TrendingUp', decreasing: 'TrendingDown', stable: 'Minus', single_reading: 'Dot', unknown: 'Minus' };

const SectionCard = ({ title, icon, children, className = '', badge = null }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-card border border-border/60 rounded-2xl overflow-hidden ${className}`}
  >
    <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
          <Icon name={icon} size={16} className="text-primary" />
        </div>
        <h2 className="font-semibold text-foreground">{title}</h2>
      </div>
      {badge && (
        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">{badge}</span>
      )}
    </div>
    <div className="p-5">{children}</div>
  </motion.div>
);

const EmptyTag = ({ text }) => (
  <span className="text-xs text-muted-foreground italic">{text || 'None identified'}</span>
);

const TagList = ({ items, colorClass = 'bg-primary/10 text-primary border-primary/20' }) => {
  if (!items || items.length === 0) return <EmptyTag />;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span key={i} className={`text-xs px-3 py-1 rounded-full border font-medium ${colorClass}`}>
          {item}
        </span>
      ))}
    </div>
  );
};

const HealthProfile = () => {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profile, setProfile] = useState(null);
  const [labTrends, setLabTrends] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_CHAT}/health-profile`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      });
      if (res.data.status === 'found' && res.data.profile) {
        setProfile(res.data.profile);
        setLabTrends(res.data.profile.lab_trends || {});
        setLastUpdated(res.data.last_updated || res.data.profile.last_updated);
      }
    } catch (err) {
      console.error('Health profile fetch error:', err);
      setError('Could not load your health profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  const generateProfile = async () => {
    try {
      setGenerating(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_CHAT}/health-profile/generate`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 90000,
      });
      if (res.data.profile) {
        setProfile(res.data.profile);
        setLabTrends(res.data.profile.lab_trends || {});
        toast.success('Health profile updated!');
      }
    } catch (err) {
      console.error('Profile generation error:', err);
      toast.error('Failed to generate profile. Check if the AI service is running.');
    } finally {
      setGenerating(false);
    }
  };

  const downloadPDF = async () => {
    try {
      setDownloadingPdf(true);
      toast.loading('Generating your medical history PDF...', { id: 'pdf-gen' });
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_CHAT}/download-pdf`,
        { aiSummary: profile?.health_summary || '' },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 120000,
          responseType: 'blob',
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      const username = (user?.username || 'patient').replace(/\s+/g, '_');
      link.setAttribute('download', `MedReport_${username}_${new Date().toISOString().slice(0, 10)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded!', { id: 'pdf-gen' });
    } catch (err) {
      console.error('PDF download error:', err);
      toast.error('Failed to generate PDF. Ensure the AI service is running.', { id: 'pdf-gen' });
    } finally {
      setDownloadingPdf(false);
    }
  };

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const labEntries = Object.entries(labTrends || {});
  const riskItems = profile?.risk_indicators || [];

  return (
    <div className="min-h-screen bg-background">
      <Header
        onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        isSidebarCollapsed={sidebarCollapsed}
      />
      <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <main className={`pt-16 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
        <div className="p-6 max-w-5xl mx-auto space-y-6">
          {/* Page header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
                <Icon name="HeartPulse" size={22} className="text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Health Profile</h1>
                <p className="text-sm text-muted-foreground">
                  {lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleDateString()}` : 'AI-generated from your medical history'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={generateProfile}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              >
                <Icon name={generating ? 'Loader2' : 'RefreshCw'} size={15} className={generating ? 'animate-spin' : ''} />
                {generating ? 'Generating...' : 'Regenerate Profile'}
              </button>
              <button
                onClick={downloadPDF}
                disabled={downloadingPdf}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-semibold transition-all shadow-md disabled:opacity-50"
              >
                <Icon name={downloadingPdf ? 'Loader2' : 'Download'} size={15} className={downloadingPdf ? 'animate-spin' : ''} />
                {downloadingPdf ? 'Generating PDF...' : 'Download PDF Report'}
              </button>
            </div>
          </motion.div>

          {/* Critical Alerts */}
          <AnimatePresence>
            {riskItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-500/5 border border-red-500/30 rounded-2xl p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="AlertTriangle" size={18} className="text-red-400" />
                  <h3 className="font-semibold text-red-400">Health Alerts — Consult Your Doctor</h3>
                </div>
                <div className="space-y-2">
                  {riskItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1.5 flex-shrink-0" />
                      <p className="text-sm text-red-300/80">{item}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground text-sm">Loading your health profile...</p>
            </div>
          ) : error ? (
            <div className="bg-card border border-red-500/30 rounded-2xl p-8 text-center">
              <Icon name="AlertCircle" size={36} className="text-red-400 mx-auto mb-3" />
              <p className="text-red-400 font-medium">{error}</p>
              <button onClick={fetchProfile} className="mt-4 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm">Retry</button>
            </div>
          ) : !profile ? (
            <div className="bg-card border border-border/60 rounded-2xl p-12 text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Icon name="HeartPulse" size={36} className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No Health Profile Yet</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
                Upload medical reports and let the AI analyze them. Then click <strong>Regenerate Profile</strong> to build your personal health profile.
              </p>
              <button
                onClick={generateProfile}
                disabled={generating}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold"
              >
                {generating ? 'Generating...' : 'Generate My Profile'}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Stats bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total Reports', value: profile.total_reports || 0, icon: 'FileText', color: 'text-blue-400' },
                  { label: 'Tests Tracked', value: profile.total_tests_tracked || 0, icon: 'TestTube', color: 'text-purple-400' },
                  { label: 'Risk Alerts', value: riskItems.length, icon: 'AlertTriangle', color: 'text-red-400' },
                  { label: 'Normal Tests', value: labEntries.filter(([, v]) => v.risk_level === 'Normal').length, icon: 'CheckCircle', color: 'text-emerald-400' },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.07 }}
                    className="bg-card border border-border/60 rounded-xl p-4"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon name={stat.icon} size={14} className={stat.color} />
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </motion.div>
                ))}
              </div>

              {/* AI Health Summary */}
              {profile.health_summary && (
                <SectionCard title="AI Health Summary" icon="Brain">
                  <div className="prose prose-sm max-w-none">
                    {profile.health_summary.split('\n').filter(l => l.trim()).map((line, i) => (
                      <p key={i} className="text-sm text-foreground/80 leading-relaxed mb-2">
                        {line.replace(/^[-•]\s*/, '• ')}
                      </p>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border/40">
                    ⚕️ This is AI-generated analysis for informational purposes only. Always consult your doctor.
                  </p>
                </SectionCard>
              )}

              {/* Medical Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <SectionCard title="Chronic Conditions" icon="Heart">
                  <TagList items={profile.chronic_conditions} colorClass="bg-red-500/10 text-red-400 border-red-500/20" />
                </SectionCard>
                <SectionCard title="Known Allergies" icon="ShieldAlert">
                  <TagList items={profile.allergies} colorClass="bg-orange-500/10 text-orange-400 border-orange-500/20" />
                </SectionCard>
                <SectionCard title="Current Medications" icon="Pill">
                  <TagList items={profile.current_medications} colorClass="bg-blue-500/10 text-blue-400 border-blue-500/20" />
                </SectionCard>
                <SectionCard title="Previous Diagnoses" icon="Stethoscope">
                  <TagList items={profile.previous_diagnoses} colorClass="bg-purple-500/10 text-purple-400 border-purple-500/20" />
                </SectionCard>
              </div>

              {/* Lab Trends */}
              {labEntries.length > 0 && (
                <SectionCard title="Lab Value Trends" icon="TrendingUp" badge={`${labEntries.length} tests`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {labEntries.map(([testName, data]) => {
                      const riskStyle = RISK_COLORS[data.risk_level] || RISK_COLORS.stable;
                      const trendStyle = RISK_COLORS[data.trend] || RISK_COLORS.stable;
                      const trendIcon = TREND_ICONS[data.trend] || 'Minus';
                      
                      return (
                        <div
                          key={testName}
                          className={`rounded-xl p-4 border ${riskStyle.bg} ${riskStyle.border}`}
                        >
                          <p className="text-xs text-muted-foreground capitalize mb-1 truncate">{testName}</p>
                          <p className="text-xl font-bold text-foreground">
                            {data.latest_value}
                            <span className="text-xs font-normal text-muted-foreground ml-1">{data.unit}</span>
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${riskStyle.bg} ${riskStyle.text} border ${riskStyle.border}`}>
                              {data.risk_level}
                            </span>
                            <div className={`flex items-center gap-1 text-xs ${trendStyle.text}`}>
                              <Icon name={trendIcon} size={12} />
                              <span className="capitalize">{data.trend?.replace('_', ' ')}</span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{data.readings} reading{data.readings !== 1 ? 's' : ''}</p>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>
              )}

              {/* PDF Download CTA */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">📄 Download Full Medical History PDF</h3>
                  <p className="text-sm text-muted-foreground">
                    Get a professional, clinic-style PDF with your complete health history, lab trends, timeline, and AI insights.
                  </p>
                </div>
                <button
                  onClick={downloadPDF}
                  disabled={downloadingPdf}
                  className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold text-sm transition-all shadow-lg hover:shadow-primary/25 disabled:opacity-50 whitespace-nowrap"
                >
                  <Icon name={downloadingPdf ? 'Loader2' : 'Download'} size={16} className={downloadingPdf ? 'animate-spin' : ''} />
                  {downloadingPdf ? 'Generating...' : 'Download PDF'}
                </button>
              </motion.div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default HealthProfile;
