import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';
import Icon from '../../../components/AppIcon';

const DataExportTab = ({ exportHistory, onExport }) => {
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [selectedData, setSelectedData] = useState({
    reports: true,
    conversations: true,
    profile: false,
    analytics: false
  });
  const [dateRange, setDateRange] = useState('all');
  const [isExporting, setIsExporting] = useState(false);

  const formatOptions = [
    { value: 'pdf', label: 'PDF Document' },
    { value: 'csv', label: 'CSV Spreadsheet' },
    { value: 'json', label: 'JSON Data' },
    { value: 'xml', label: 'XML Format' }
  ];

  const dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
    { value: '1year', label: 'Last Year' }
  ];

  const handleDataTypeChange = (type, checked) => {
    setSelectedData(prev => ({ ...prev, [type]: checked }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    // Simulate export process
    setTimeout(() => {
      const exportData = {
        format: selectedFormat,
        dataTypes: selectedData,
        dateRange: dateRange,
        timestamp: new Date()?.toISOString()
      };
      onExport(exportData);
      setIsExporting(false);
    }, 3000);
  };

  const getDataTypeIcon = (type) => {
    const icons = {
      reports: 'FileText',
      conversations: 'MessageSquare',
      profile: 'User',
      analytics: 'BarChart3'
    };
    return icons?.[type] || 'File';
  };

  const getDataTypeDescription = (type) => {
    const descriptions = {
      reports: 'All uploaded medical reports and their analysis results',
      conversations: 'Chat history with AI assistant and all interactions',
      profile: 'Personal information, settings, and account details',
      analytics: 'Usage statistics, trends, and performance metrics'
    };
    return descriptions?.[type] || '';
  };

  const recentExports = [
    {
      id: 1,
      format: 'PDF',
      dataTypes: ['Reports', 'Conversations'],
      date: '2025-01-02',
      size: '2.4 MB',
      status: 'completed'
    },
    {
      id: 2,
      format: 'CSV',
      dataTypes: ['Reports'],
      date: '2024-12-28',
      size: '1.1 MB',
      status: 'completed'
    },
    {
      id: 3,
      format: 'JSON',
      dataTypes: ['Profile', 'Analytics'],
      date: '2024-12-15',
      size: '0.8 MB',
      status: 'completed'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Export Configuration */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Export Your Data</h3>
        <p className="text-muted-foreground mb-6">
          Download a copy of your medical data in your preferred format. All exports are encrypted and secure.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Select
            label="Export Format"
            options={formatOptions}
            value={selectedFormat}
            onChange={setSelectedFormat}
            description="Choose the file format for your data export"
          />

          <Select
            label="Date Range"
            options={dateRangeOptions}
            value={dateRange}
            onChange={setDateRange}
            description="Select the time period for your data"
          />
        </div>

        {/* Data Type Selection */}
        <div className="mb-6">
          <h4 className="font-medium text-foreground mb-4">Select Data to Export</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(selectedData)?.map(([type, checked]) => (
              <div key={type} className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mt-1">
                  <Icon name={getDataTypeIcon(type)} size={20} className="text-primary" />
                </div>
                <div className="flex-1">
                  <Checkbox
                    label={type?.charAt(0)?.toUpperCase() + type?.slice(1)}
                    description={getDataTypeDescription(type)}
                    checked={checked}
                    onChange={(e) => handleDataTypeChange(type, e?.target?.checked)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Export Summary */}
        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <h5 className="font-medium text-foreground mb-2">Export Summary</h5>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>Format: {formatOptions?.find(f => f?.value === selectedFormat)?.label}</div>
            <div>Date Range: {dateRangeOptions?.find(d => d?.value === dateRange)?.label}</div>
            <div>
              Data Types: {Object.entries(selectedData)?.filter(([_, checked]) => checked)?.map(([type, _]) => type?.charAt(0)?.toUpperCase() + type?.slice(1))?.join(', ') || 'None selected'}
            </div>
          </div>
        </div>

        <Button
          onClick={handleExport}
          loading={isExporting}
          disabled={!Object.values(selectedData)?.some(Boolean)}
          iconName="Download"
          iconPosition="left"
          fullWidth
        >
          {isExporting ? 'Preparing Export...' : 'Export Data'}
        </Button>
      </div>
      {/* Export History */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Exports</h3>
        <div className="space-y-4">
          {recentExports?.map((exportItem) => (
            <div key={exportItem?.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                  <Icon name="FileDown" size={20} className="text-success" />
                </div>
                <div>
                  <div className="font-medium text-foreground">
                    {exportItem?.format} Export
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {exportItem?.dataTypes?.join(', ')} • {exportItem?.size}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(exportItem.date)?.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 bg-success/10 text-success text-xs rounded-full">
                  Completed
                </span>
                <Button variant="outline" size="sm" iconName="Download">
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Data Retention Policy */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Data Retention & Deletion</h3>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <Icon name="Info" size={20} className="text-primary mt-0.5" />
            <div>
              <p className="text-foreground font-medium">Data Retention Policy</p>
              <p className="text-muted-foreground text-sm">
                Your medical data is retained for 7 years in compliance with healthcare regulations. 
                You can request data deletion at any time, subject to legal requirements.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Icon name="Shield" size={20} className="text-success mt-0.5" />
            <div>
              <p className="text-foreground font-medium">Data Security</p>
              <p className="text-muted-foreground text-sm">
                All exports are encrypted with AES-256 encryption and are only accessible to you. 
                Export files are automatically deleted from our servers after 30 days.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <Button variant="destructive" iconName="Trash2" iconPosition="left">
            Request Account Deletion
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            This action cannot be undone. All your data will be permanently deleted.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DataExportTab;