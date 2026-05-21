import React, { useState } from 'react';
import { Checkbox, CheckboxGroup } from '../../../components/ui/Checkbox';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { useTheme } from '../../../contexts/ThemeContext';

const PreferencesTab = ({ preferences, onUpdate }) => {
  const { theme, toggleTheme } = useTheme();
  const [formData, setFormData] = useState(preferences);
  const [isSaving, setIsSaving] = useState(false);

  const unitOptions = [
    { value: 'metric', label: 'Metric (kg, cm, °C)' },
    { value: 'imperial', label: 'Imperial (lbs, ft, °F)' }
  ];

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' }
  ];

  const exportFormatOptions = [
    { value: 'pdf', label: 'PDF Document' },
    { value: 'csv', label: 'CSV Spreadsheet' },
    { value: 'json', label: 'JSON Data' },
    { value: 'xml', label: 'XML Format' }
  ];

  const reportCategoryOptions = [
    { value: 'blood-work', label: 'Blood Work' },
    { value: 'imaging', label: 'Medical Imaging' },
    { value: 'cardiology', label: 'Cardiology' },
    { value: 'general', label: 'General Health' }
  ];

  const handleNotificationChange = (type, checked) => {
    setFormData(prev => ({
      ...prev,
      notifications: {
        ...prev?.notifications,
        [type]: checked
      }
    }));
  };

  const handlePrivacyChange = (setting, checked) => {
    setFormData(prev => ({
      ...prev,
      privacy: {
        ...prev?.privacy,
        [setting]: checked
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      onUpdate(formData);
      setIsSaving(false);
    }, 1500);
  };

  const criticalValueThresholds = [
    {
      name: 'Blood Pressure (Systolic)',
      value: formData?.criticalThresholds?.bloodPressureSystolic || 140,
      unit: 'mmHg',
      key: 'bloodPressureSystolic'
    },
    {
      name: 'Heart Rate',
      value: formData?.criticalThresholds?.heartRate || 100,
      unit: 'bpm',
      key: 'heartRate'
    },
    {
      name: 'Blood Sugar',
      value: formData?.criticalThresholds?.bloodSugar || 180,
      unit: 'mg/dL',
      key: 'bloodSugar'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Display Preferences - Theme Toggle */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Display Preferences</h3>
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon name={theme === 'dark' ? 'Moon' : 'Sun'} size={20} className={theme === 'dark' ? 'text-yellow-400' : 'text-yellow-500'} />
            </div>
            <div>
              <span className="font-medium text-foreground">Theme</span>
              <div className="text-sm text-muted-foreground">
                Current: <span className="capitalize font-semibold">{theme} mode</span>
              </div>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Icon name={theme === 'dark' ? 'Sun' : 'Moon'} size={18} />
            <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </div>
      {/* General Preferences */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">General Preferences</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Measurement Units"
            options={unitOptions}
            value={formData?.units || 'metric'}
            onChange={(value) => setFormData(prev => ({ ...prev, units: value }))}
          />

          <Select
            label="Language"
            options={languageOptions}
            value={formData?.language || 'en'}
            onChange={(value) => setFormData(prev => ({ ...prev, language: value }))}
          />

          <Select
            label="Default Export Format"
            options={exportFormatOptions}
            value={formData?.exportFormat || 'pdf'}
            onChange={(value) => setFormData(prev => ({ ...prev, exportFormat: value }))}
          />

          <Select
            label="Default Report Category"
            options={reportCategoryOptions}
            value={formData?.defaultCategory || 'general'}
            onChange={(value) => setFormData(prev => ({ ...prev, defaultCategory: value }))}
          />
        </div>
      </div>
      {/* Notification Settings */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Notification Preferences</h3>
        <CheckboxGroup label="Choose which notifications you'd like to receive">
          <Checkbox
            label="Email Notifications"
            description="Receive updates about new reports and analysis results"
            checked={formData?.notifications?.email || false}
            onChange={(e) => handleNotificationChange('email', e?.target?.checked)}
          />
          <Checkbox
            label="Critical Value Alerts"
            description="Get notified when test results exceed critical thresholds"
            checked={formData?.notifications?.criticalAlerts || false}
            onChange={(e) => handleNotificationChange('criticalAlerts', e?.target?.checked)}
          />
          <Checkbox
            label="Report Processing Updates"
            description="Notifications about report upload and processing status"
            checked={formData?.notifications?.processing || false}
            onChange={(e) => handleNotificationChange('processing', e?.target?.checked)}
          />
          <Checkbox
            label="Weekly Summary"
            description="Weekly digest of your health data and trends"
            checked={formData?.notifications?.weeklySummary || false}
            onChange={(e) => handleNotificationChange('weeklySummary', e?.target?.checked)}
          />
        </CheckboxGroup>
      </div>
      {/* Privacy Settings */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Privacy & Data Settings</h3>
        <CheckboxGroup label="Control how your medical data is handled">
          <Checkbox
            label="Allow Data Analytics"
            description="Help improve our AI by allowing anonymous analysis of your data"
            checked={formData?.privacy?.allowAnalytics || false}
            onChange={(e) => handlePrivacyChange('allowAnalytics', e?.target?.checked)}
          />
          <Checkbox
            label="Share with Healthcare Providers"
            description="Allow authorized healthcare providers to access your reports"
            checked={formData?.privacy?.shareWithProviders || false}
            onChange={(e) => handlePrivacyChange('shareWithProviders', e?.target?.checked)}
          />
          <Checkbox
            label="Research Participation"
            description="Contribute anonymized data to medical research studies"
            checked={formData?.privacy?.researchParticipation || false}
            onChange={(e) => handlePrivacyChange('researchParticipation', e?.target?.checked)}
          />
        </CheckboxGroup>
      </div>
      {/* Critical Value Thresholds */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Critical Value Alert Thresholds</h3>
        <p className="text-muted-foreground mb-6">
          Set custom thresholds for when you want to be alerted about critical health values
        </p>
        <div className="space-y-4">
          {criticalValueThresholds?.map((threshold) => (
            <div key={threshold?.key} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                  <Icon name="AlertTriangle" size={20} className="text-warning" />
                </div>
                <div>
                  <span className="font-medium text-foreground">{threshold?.name}</span>
                  <div className="text-sm text-muted-foreground">
                    Alert when above {threshold?.value} {threshold?.unit}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={threshold?.value}
                  onChange={(e) => {
                    const newThresholds = {
                      ...formData?.criticalThresholds,
                      [threshold?.key]: parseInt(e?.target?.value)
                    };
                    setFormData(prev => ({ ...prev, criticalThresholds: newThresholds }));
                  }}
                  className="w-20 px-2 py-1 text-sm border border-border rounded bg-input"
                />
                <span className="text-sm text-muted-foreground">{threshold?.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end pt-4 border-t border-border">
        <Button
          onClick={handleSave}
          loading={isSaving}
          iconName="Save"
          iconPosition="left"
        >
          Save Preferences
        </Button>
      </div>
    </div>
  );
};

export default PreferencesTab;