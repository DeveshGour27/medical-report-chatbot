import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';
import DateInput from '../../../components/ui/DateInput';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';

const ReportFilters = ({ onFiltersChange, totalReports, filteredCount }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [reportType, setReportType] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [status, setStatus] = useState('');

  const reportTypeOptions = [
    { value: '', label: 'All Report Types' },
    { value: 'blood_test', label: 'Blood Test' },
    { value: 'radiology', label: 'Radiology' },
    { value: 'pathology', label: 'Pathology' },
    { value: 'cardiology', label: 'Cardiology' },
    { value: 'endocrinology', label: 'Endocrinology' }
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'processed', label: 'Processed' },
    { value: 'pending', label: 'Pending Analysis' },
    { value: 'reviewed', label: 'Reviewed' },
    { value: 'flagged', label: 'Flagged' }
  ];

  const handleSearchChange = (e) => {
    const value = e?.target?.value;
    setSearchTerm(value);
    applyFilters({ searchTerm: value, reportType, dateRange, status });
  };

  const handleReportTypeChange = (value) => {
    setReportType(value);
    applyFilters({ searchTerm, reportType: value, dateRange, status });
  };

  const handleStatusChange = (value) => {
    setStatus(value);
    applyFilters({ searchTerm, reportType, dateRange, status: value });
  };

  const handleDateRangeChange = (field, value) => {
    const newDateRange = { ...dateRange, [field]: value };
    setDateRange(newDateRange);
    applyFilters({ searchTerm, reportType, dateRange: newDateRange, status });
  };

  const applyFilters = (filters) => {
    onFiltersChange(filters);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setReportType('');
    setDateRange({ start: '', end: '' });
    setStatus('');
    onFiltersChange({ searchTerm: '', reportType: '', dateRange: { start: '', end: '' }, status: '' });
  };

  const hasActiveFilters = searchTerm || reportType || dateRange?.start || dateRange?.end || status;

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4">
        <div className="flex items-center space-x-2 mb-4 lg:mb-0">
          <Icon name="Filter" size={20} className="text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Filter Reports</h3>
          <div className="bg-muted px-2 py-1 rounded-full">
            <span className="text-sm font-medium text-muted-foreground">
              {filteredCount} of {totalReports}
            </span>
          </div>
        </div>
        
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            iconName="X"
            iconPosition="left"
          >
            Clear Filters
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Input */}
        <div className="lg:col-span-2">
          <Input
            type="search"
            placeholder="Search reports by name, patient, or values..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full"
          />
        </div>

        {/* Report Type Filter */}
        <Select
          placeholder="Filter by type"
          options={reportTypeOptions}
          value={reportType}
          onChange={handleReportTypeChange}
        />

        {/* Status Filter */}
        <Select
          placeholder="Filter by status"
          options={statusOptions}
          value={status}
          onChange={handleStatusChange}
        />

        {/* Date Range Filters */}
        <DateInput
          label="From Date"
          value={dateRange?.start}
          onChange={(e) => handleDateRangeChange('start', e?.target?.value)}
        />

        <DateInput
          label="To Date"
          value={dateRange?.end}
          onChange={(e) => handleDateRangeChange('end', e?.target?.value)}
        />
      </div>
    </div>
  );
};

export default ReportFilters;