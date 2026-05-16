import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';


const ReportDetailModal = ({ report, isOpen, onClose, onChatWithReport }) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen || !report) return null;

  const getStatusBadge = (status) => {
    const statusConfig = {
      processed: { color: 'bg-success text-success-foreground', label: 'Processed' },
      pending: { color: 'bg-warning text-warning-foreground', label: 'Pending Analysis' },
      reviewed: { color: 'bg-accent text-accent-foreground', label: 'Reviewed' },
      flagged: { color: 'bg-error text-error-foreground', label: 'Flagged' }
    };

    const config = statusConfig?.[status] || statusConfig?.processed;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config?.color}`}>
        {config?.label}
      </span>
    );
  };

  const getValueStatus = (value, normal) => {
    const numValue = parseFloat(value);
    const [min, max] = normal?.split('-')?.map(v => parseFloat(v));
    
    if (numValue < min) return { status: 'low', color: 'text-warning' };
    if (numValue > max) return { status: 'high', color: 'text-error' };
    return { status: 'normal', color: 'text-success' };
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'FileText' },
    { id: 'values', label: 'Medical Values', icon: 'Activity' },
    { id: 'history', label: 'History', icon: 'Clock' }
  ];

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-modal w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
              <Icon name="FileText" size={24} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{report?.name}</h2>
              <p className="text-sm text-muted-foreground">Patient: {report?.patientName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {getStatusBadge(report?.status)}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              iconName="X"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex space-x-8 px-6">
            {tabs?.map((tab) => (
              <button
                key={tab?.id}
                onClick={() => setActiveTab(tab?.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab?.id
                    ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon name={tab?.icon} size={16} />
                <span className="font-medium">{tab?.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Report Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Report Type:</span>
                      <span className="text-foreground capitalize">{report?.type?.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Upload Date:</span>
                      <span className="text-foreground">{report?.uploadDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">File Size:</span>
                      <span className="text-foreground">{report?.fileSize || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lab:</span>
                      <span className="text-foreground">{report?.lab || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Patient Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Patient Name:</span>
                      <span className="text-foreground">{report?.patientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Age:</span>
                      <span className="text-foreground">{report?.patientAge || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gender:</span>
                      <span className="text-foreground">{report?.patientGender || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Doctor:</span>
                      <span className="text-foreground">{report?.doctor || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Summary</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {report?.summary || `This ${report?.type?.replace('_', ' ')} report shows comprehensive analysis of the patient's current health status. The results indicate several key findings that require attention and follow-up care. Overall health indicators are within acceptable ranges with some areas requiring monitoring.`}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'values' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Medical Values</h3>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-success rounded-full"></div>
                    <span className="text-muted-foreground">Normal</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-warning rounded-full"></div>
                    <span className="text-muted-foreground">Low</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-error rounded-full"></div>
                    <span className="text-muted-foreground">High</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report?.keyValues?.map((value, index) => {
                  const valueStatus = getValueStatus(value?.value, value?.normalRange);
                  return (
                    <div key={index} className="bg-background border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-foreground">{value?.name}</h4>
                        <Icon 
                          name={valueStatus?.status === 'normal' ? 'CheckCircle' : 'AlertCircle'} 
                          size={16} 
                          className={valueStatus?.color}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Value:</span>
                          <span className={`font-semibold ${valueStatus?.color}`}>
                            {value?.value} {value?.unit}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Normal Range:</span>
                          <span className="text-foreground">{value?.normalRange} {value?.unit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <span className={`capitalize font-medium ${valueStatus?.color}`}>
                            {valueStatus?.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-foreground">Report History</h3>
              <div className="space-y-4">
                {[
                  { date: '2025-01-04 14:30', action: 'Report uploaded', user: report?.doctor || 'Healthcare Provider', status: 'success' },
                  { date: '2025-01-04 14:35', action: 'AI analysis completed', user: 'System', status: 'success' },
                  { date: '2025-01-04 15:20', action: 'Report reviewed', user: report?.doctor || 'Healthcare Provider', status: 'success' },
                  { date: '2025-01-04 16:45', action: 'Shared with patient', user: report?.doctor || 'Healthcare Provider', status: 'info' }
                ]?.map((event, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 bg-background border border-border rounded-lg">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      event?.status === 'success' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                    }`}>
                      <Icon name={event?.status === 'success' ? 'CheckCircle' : 'Info'} size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{event?.action}</p>
                      <p className="text-xs text-muted-foreground">by {event?.user}</p>
                      <p className="text-xs text-muted-foreground">{event?.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-muted/30">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Icon name="Calendar" size={16} />
            <span>Last updated: {report?.uploadDate}</span>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              variant="default"
              onClick={() => onChatWithReport(report)}
              iconName="MessageSquare"
              iconPosition="left"
            >
              Chat with AI
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDetailModal;