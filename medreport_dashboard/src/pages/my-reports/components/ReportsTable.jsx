import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';

const ReportsTable = ({ 
  reports, 
  onViewReport, 
  onChatWithReport, 
  selectedReports, 
  onSelectionChange,
  sortConfig,
  onSort
}) => {
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleRowExpansion = (reportId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded?.has(reportId)) {
      newExpanded?.delete(reportId);
    } else {
      newExpanded?.add(reportId);
    }
    setExpandedRows(newExpanded);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      onSelectionChange(reports?.map(report => report?.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectReport = (reportId, checked) => {
    if (checked) {
      onSelectionChange([...selectedReports, reportId]);
    } else {
      onSelectionChange(selectedReports?.filter(id => id !== reportId));
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      processed: { color: 'bg-success text-success-foreground', label: 'Processed' },
      pending: { color: 'bg-warning text-warning-foreground', label: 'Pending' },
      reviewed: { color: 'bg-accent text-accent-foreground', label: 'Reviewed' },
      flagged: { color: 'bg-error text-error-foreground', label: 'Flagged' }
    };

    const config = statusConfig?.[status] || statusConfig?.processed;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config?.color}`}>
        {config?.label}
      </span>
    );
  };

  const getValueBadge = (value, normal, unit) => {
    const numValue = parseFloat(value);
    const [min, max] = normal?.split('-')?.map(v => parseFloat(v));
    
    let colorClass = 'bg-success text-success-foreground';
    if (numValue < min || numValue > max) {
      colorClass = 'bg-error text-error-foreground';
    }

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
        {value} {unit}
      </span>
    );
  };

  const getSortIcon = (column) => {
    if (sortConfig?.key !== column) {
      return <Icon name="ArrowUpDown" size={14} className="text-muted-foreground" />;
    }
    return sortConfig?.direction === 'asc' 
      ? <Icon name="ArrowUp" size={14} className="text-foreground" />
      : <Icon name="ArrowDown" size={14} className="text-foreground" />;
  };

  const allSelected = reports?.length > 0 && selectedReports?.length === reports?.length;
  const someSelected = selectedReports?.length > 0 && selectedReports?.length < reports?.length;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={(e) => handleSelectAll(e?.target?.checked)}
                />
              </th>
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-muted-foreground/10 transition-colors"
                onClick={() => onSort('name')}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-foreground">Report Name</span>
                  {getSortIcon('name')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-muted-foreground/10 transition-colors"
                onClick={() => onSort('type')}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-foreground">Type</span>
                  {getSortIcon('type')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-muted-foreground/10 transition-colors"
                onClick={() => onSort('uploadDate')}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-foreground">Upload Date</span>
                  {getSortIcon('uploadDate')}
                </div>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-sm font-medium text-foreground">Status</span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-sm font-medium text-foreground">Key Values</span>
              </th>
              <th className="px-4 py-3 text-center">
                <span className="text-sm font-medium text-foreground">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {reports?.map((report) => (
              <React.Fragment key={report?.id}>
                <tr className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-4">
                    <Checkbox
                      checked={selectedReports?.includes(report?.id)}
                      onChange={(e) => handleSelectReport(report?.id, e?.target?.checked)}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-lg">
                        <Icon name="FileText" size={16} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{report?.name}</p>
                        <p className="text-xs text-muted-foreground">{report?.patientName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-foreground capitalize">{report?.type?.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-foreground">{report?.uploadDate}</span>
                  </td>
                  <td className="px-4 py-4">
                    {getStatusBadge(report?.status)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {report?.keyValues?.slice(0, 2)?.map((value, index) => (
                        <div key={index}>
                          {getValueBadge(value?.value, value?.normalRange, value?.unit)}
                        </div>
                      ))}
                      {report?.keyValues?.length > 2 && (
                        <button
                          onClick={() => toggleRowExpansion(report?.id)}
                          className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs font-medium hover:bg-muted-foreground/20 transition-colors"
                        >
                          +{report?.keyValues?.length - 2} more
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewReport(report)}
                        iconName="Eye"
                        iconPosition="left"
                      >
                        View
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => onChatWithReport(report)}
                        iconName="MessageSquare"
                        iconPosition="left"
                      >
                        Chat
                      </Button>
                    </div>
                  </td>
                </tr>
                
                {/* Expanded Row Details */}
                {expandedRows?.has(report?.id) && (
                  <tr className="bg-muted/30 border-b border-border">
                    <td colSpan="7" className="px-4 py-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {report?.keyValues?.map((value, index) => (
                          <div key={index} className="flex flex-col space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">{value?.name}</span>
                            {getValueBadge(value?.value, value?.normalRange, value?.unit)}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4 p-4">
        {reports?.map((report) => (
          <div key={report?.id} className="bg-background border border-border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={selectedReports?.includes(report?.id)}
                  onChange={(e) => handleSelectReport(report?.id, e?.target?.checked)}
                />
                <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-lg">
                  <Icon name="FileText" size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{report?.name}</p>
                  <p className="text-xs text-muted-foreground">{report?.patientName}</p>
                </div>
              </div>
              {getStatusBadge(report?.status)}
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              <div>
                <span className="text-muted-foreground">Type: </span>
                <span className="text-foreground capitalize">{report?.type?.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Date: </span>
                <span className="text-foreground">{report?.uploadDate}</span>
              </div>
            </div>
            
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-2">Key Values:</p>
              <div className="flex flex-wrap gap-1">
                {report?.keyValues?.slice(0, 3)?.map((value, index) => (
                  <div key={index}>
                    {getValueBadge(value?.value, value?.normalRange, value?.unit)}
                  </div>
                ))}
                {report?.keyValues?.length > 3 && (
                  <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs">
                    +{report?.keyValues?.length - 3} more
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewReport(report)}
                iconName="Eye"
                iconPosition="left"
                fullWidth
              >
                View
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => onChatWithReport(report)}
                iconName="MessageSquare"
                iconPosition="left"
                fullWidth
              >
                Chat
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportsTable;