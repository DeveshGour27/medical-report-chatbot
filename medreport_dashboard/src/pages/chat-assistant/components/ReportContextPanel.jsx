import React from 'react';
import Icon from '../../../components/AppIcon';

const ReportContextPanel = ({ selectedReport, onReportSelect, reports }) => {

  // Helper: find correct report by ID (handles string/number mismatch)
  const getReportById = (id) => {
    return reports?.find(r => String(r.id) === String(id));
  };

  // Dropdown handler
  const handleChange = (e) => {
    const report = getReportById(e.target.value);
    if (report) onReportSelect(report);
  };

  // -----------------------------------------------------
  // NO REPORT SELECTED → Show picker
  // -----------------------------------------------------
  if (!selectedReport) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <div className="text-center">
          <Icon name="FileText" size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Report Selected
          </h3>
          <p className="text-muted-foreground mb-4">
            Select a report to start a conversation about your medical data
          </p>

          <select
            onChange={handleChange}
            className="px-4 py-2 border border-border rounded-lg bg-input text-foreground"
            value=""
          >
            <option value="">Choose a report...</option>
            {reports?.map(report => (
              <option key={report.id} value={report.id}>
                {report.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------
  // REPORT SELECTED → Show summary + dropdown
  // -----------------------------------------------------
  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">

        {/* Report Header */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Icon name="FileText" size={20} color="white" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {selectedReport.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {new Date(selectedReport.uploadDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Dropdown for switching reports */}
        <select
          onChange={handleChange}
          className="px-3 py-2 border border-border rounded-lg bg-input text-foreground text-sm"
          value={selectedReport.id}
        >
          {reports?.map(report => (
            <option key={report.id} value={report.id}>
              {report.name}
            </option>
          ))}
        </select>
      </div>

      {/* Extracted Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {selectedReport?.extractedData?.[0] &&
          Object.entries(selectedReport.extractedData[0]).map(([key, obj], index) => (
            <div key={index} className="bg-muted rounded-lg p-4">

              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  {key.replace(/([A-Z])/g, " $1")}
                </span>

                <span className={`text-xs px-2 py-1 rounded-full ${
                  obj?.status === 'Normal'
                    ? 'bg-success text-success-foreground'
                    : 'bg-error text-error-foreground'
                }`}>
                  {obj?.status || "—"}
                </span>
              </div>

              <div className="flex items-baseline space-x-2">
                <span className="text-lg font-semibold text-foreground">
                  {obj?.value}
                </span>
                <span className="text-sm text-muted-foreground">
                  {obj?.unit}
                </span>
              </div>

              <div className="text-xs text-muted-foreground mt-1">
                Normal: {obj?.reference_low}–{obj?.reference_high}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default ReportContextPanel;
