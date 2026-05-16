import React from 'react';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';

const ReportMetadataForm = ({ 
  metadata, 
  onMetadataChange, 
  onSubmit, 
  onCancel, 
  isSubmitting,
  hasFiles 
}) => {
  const reportCategories = [
    { value: 'blood-test', label: 'Blood Test' },
    { value: 'urine-test', label: 'Urine Analysis' },
    { value: 'imaging', label: 'Medical Imaging' },
    { value: 'pathology', label: 'Pathology Report' },
    { value: 'cardiology', label: 'Cardiology' },
    { value: 'endocrinology', label: 'Endocrinology' },
    { value: 'general', label: 'General Report' }
  ];

  const priorityLevels = [
    { value: 'low', label: 'Low Priority' },
    { value: 'normal', label: 'Normal Priority' },
    { value: 'high', label: 'High Priority' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const handleInputChange = (field, value) => {
    onMetadataChange({
      ...metadata,
      [field]: value
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      <h3 className="text-lg font-semibold text-foreground">Report Information</h3>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Report Title */}
        <Input
          label="Report Title"
          type="text"
          placeholder="Enter report title"
          value={metadata?.title}
          onChange={(e) => handleInputChange('title', e?.target?.value)}
          required
          className="md:col-span-2"
        />

        {/* Category */}
        <Select
          label="Report Category"
          placeholder="Select category"
          options={reportCategories}
          value={metadata?.category}
          onChange={(value) => handleInputChange('category', value)}
          required
        />

        {/* Priority */}
        <Select
          label="Priority Level"
          placeholder="Select priority"
          options={priorityLevels}
          value={metadata?.priority}
          onChange={(value) => handleInputChange('priority', value)}
          required
        />

        {/* Report Date */}
        <Input
          label="Report Date"
          type="date"
          value={metadata?.reportDate}
          onChange={(e) => handleInputChange('reportDate', e?.target?.value)}
          required
        />

        {/* Doctor/Lab Name */}
        <Input
          label="Doctor/Lab Name"
          type="text"
          placeholder="Enter doctor or lab name"
          value={metadata?.doctorName}
          onChange={(e) => handleInputChange('doctorName', e?.target?.value)}
        />

        {/* Patient ID */}
        <Input
          label="Patient ID"
          type="text"
          placeholder="Enter patient ID"
          value={metadata?.patientId}
          onChange={(e) => handleInputChange('patientId', e?.target?.value)}
          className="md:col-span-2"
        />

        {/* Notes */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-foreground mb-2">
            Additional Notes
          </label>
          <textarea
            className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
            rows={4}
            placeholder="Enter any additional notes or observations..."
            value={metadata?.notes}
            onChange={(e) => handleInputChange('notes', e?.target?.value)}
          />
        </div>
      </div>
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
        <Button
          variant="default"
          size="lg"
          iconName="Upload"
          iconPosition="left"
          onClick={onSubmit}
          disabled={!hasFiles || isSubmitting}
          loading={isSubmitting}
          className="sm:flex-1"
        >
          {isSubmitting ? 'Processing...' : 'Upload Report'}
        </Button>
        
        <Button
          variant="outline"
          size="lg"
          iconName="RotateCcw"
          iconPosition="left"
          onClick={onCancel}
          disabled={isSubmitting}
          className="sm:w-auto"
        >
          Clear All
        </Button>
      </div>
      {/* Upload Guidelines */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-2">Upload Guidelines</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Ensure all personal information is clearly visible</li>
          <li>• Medical values should be legible for accurate extraction</li>
          <li>• Multiple pages can be uploaded as separate files</li>
          <li>• Reports will be processed using AI for data extraction</li>
        </ul>
      </div>
    </div>
  );
};

export default ReportMetadataForm;