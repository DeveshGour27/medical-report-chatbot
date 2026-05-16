import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';

const BulkActions = ({ selectedReports, onExport, onBulkAnalysis, onClearSelection }) => {
  const [exportFormat, setExportFormat] = useState('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const exportOptions = [
    { value: 'csv', label: 'CSV Format' },
    { value: 'pdf', label: 'PDF Summary' },
    { value: 'json', label: 'JSON Data' }
  ];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(selectedReports, exportFormat);
    } finally {
      setIsExporting(false);
    }
  };

  const handleBulkAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      await onBulkAnalysis(selectedReports);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (selectedReports?.length === 0) {
    return null;
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-lg">
            <Icon name="CheckSquare" size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {selectedReports?.length} report{selectedReports?.length !== 1 ? 's' : ''} selected
            </p>
            <p className="text-xs text-muted-foreground">
              Choose an action to perform on selected reports
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
          {/* Export Section */}
          <div className="flex items-center space-x-2">
            <Select
              options={exportOptions}
              value={exportFormat}
              onChange={setExportFormat}
              className="w-32"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              loading={isExporting}
              iconName="Download"
              iconPosition="left"
            >
              Export
            </Button>
          </div>

          {/* Analysis Button */}
          <Button
            variant="default"
            size="sm"
            onClick={handleBulkAnalysis}
            loading={isAnalyzing}
            iconName="Brain"
            iconPosition="left"
          >
            Bulk Analysis
          </Button>

          {/* Clear Selection */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            iconName="X"
            iconPosition="left"
          >
            Clear
          </Button>
        </div>
      </div>
      {/* Quick Stats */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-lg font-semibold text-foreground">{selectedReports?.length}</p>
            <p className="text-xs text-muted-foreground">Selected</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-success">
              {Math.floor(selectedReports?.length * 0.8)}
            </p>
            <p className="text-xs text-muted-foreground">Processed</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-warning">
              {Math.floor(selectedReports?.length * 0.15)}
            </p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-error">
              {Math.floor(selectedReports?.length * 0.05)}
            </p>
            <p className="text-xs text-muted-foreground">Flagged</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkActions;