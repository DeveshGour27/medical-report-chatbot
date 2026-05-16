import React, { useState } from 'react';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';

const FilterBar = ({ onFilterChange }) => {
  const [dateRange, setDateRange] = useState('all');
  const [reportType, setReportType] = useState('all');

  const dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' }
  ];

  const reportTypeOptions = [
    { value: 'all', label: 'All Reports' },
    { value: 'Blood Test', label: 'Blood Test' },
    { value: 'X-Ray', label: 'X-Ray' },
    { value: 'MRI', label: 'MRI' },
    { value: 'CT Scan', label: 'CT Scan' },
    { value: 'ECG', label: 'ECG' },
    { value: 'Ultrasound', label: 'Ultrasound' }
  ];

  const handleFilterChange = (type, value) => {
    if (type === 'dateRange') {
      setDateRange(value);
    } else if (type === 'reportType') {
      setReportType(value);
    }
    
    onFilterChange?.({
      dateRange: type === 'dateRange' ? value : dateRange,
      reportType: type === 'reportType' ? value : reportType
    });
  };

  const clearFilters = () => {
    setDateRange('all');
    setReportType('all');
    onFilterChange?.({ dateRange: 'all', reportType: 'all' });
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 p-4 bg-muted/50 rounded-lg border border-border">
      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 flex-1">
        <Select
          placeholder="Select date range"
          options={dateRangeOptions}
          value={dateRange}
          onChange={(value) => handleFilterChange('dateRange', value)}
          className="w-full sm:w-48"
        />
        <Select
          placeholder="Select report type"
          options={reportTypeOptions}
          value={reportType}
          onChange={(value) => handleFilterChange('reportType', value)}
          className="w-full sm:w-48"
        />
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={clearFilters}
        iconName="X"
        iconPosition="left"
      >
        Clear
      </Button>
    </div>
  );
};

export default FilterBar;