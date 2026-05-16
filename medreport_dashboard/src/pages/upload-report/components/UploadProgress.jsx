import React from 'react';
import Icon from '../../../components/AppIcon';

const UploadProgress = ({ isVisible, progress, currentStep, totalSteps }) => {
  const steps = [
    { id: 1, label: 'Uploading Files', icon: 'Upload' },
    { id: 2, label: 'Parsing Content', icon: 'FileSearch' },
    { id: 3, label: 'Extracting Data', icon: 'Brain' },
    { id: 4, label: 'Finalizing Report', icon: 'CheckCircle' }
  ];

  if (!isVisible) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Processing Report</h3>
        <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
      </div>
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Step {currentStep} of {totalSteps}: {steps?.[currentStep - 1]?.label}
        </p>
      </div>
      {/* Steps */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {steps?.map((step) => {
          const isCompleted = step?.id < currentStep;
          const isCurrent = step?.id === currentStep;
          const isPending = step?.id > currentStep;

          return (
            <div key={step?.id} className="flex flex-col items-center space-y-2">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                isCompleted 
                  ? 'bg-success text-white' 
                  : isCurrent 
                    ? 'bg-primary text-white animate-pulse' :'bg-muted text-muted-foreground'
              }`}>
                <Icon 
                  name={isCompleted ? 'Check' : step?.icon} 
                  size={20} 
                />
              </div>
              <span className={`text-xs text-center font-medium ${
                isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {step?.label}
              </span>
            </div>
          );
        })}
      </div>
      {/* Current Activity */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {steps?.[currentStep - 1]?.label}
            </p>
            <p className="text-xs text-muted-foreground">
              {currentStep === 1 && "Uploading files to secure storage..."}
              {currentStep === 2 && "Reading document content and structure..."}
              {currentStep === 3 && "Identifying medical values and parameters..."}
              {currentStep === 4 && "Saving report and generating summary..."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadProgress;