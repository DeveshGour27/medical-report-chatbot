import React from "react";
import Button from "../../../components/ui/Button";

const UploadSuccess = ({ uploadedReport, onUploadAnother }) => {
  const data = uploadedReport.extractedData[0] || {};

  return (
    <div className="space-y-6">

      <h2 className="text-2xl font-bold text-center">Report Uploaded Successfully!</h2>

      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Extracted Medical Values</h3>

        <div className="grid grid-cols-2 gap-3">
          {Object.entries(data).map(([key, val]) => (
            <div key={key} className="bg-muted p-3 rounded">
              <p className="text-xs text-muted-foreground uppercase">{key}</p>
              <p className="font-semibold">{val.value} {val.unit}</p>
            </div>
          ))}
        </div>
      </div>

      <Button size="lg" onClick={onUploadAnother} fullWidth>
        Upload Another Report
      </Button>
    </div>
  );
};

export default UploadSuccess;
