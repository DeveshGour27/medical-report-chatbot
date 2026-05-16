import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/ui/Button';

const QuickActions = () => {
  return (
    <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3">
      <Link to="/upload-report" className="w-full sm:w-auto">
        <Button 
          variant="default" 
          iconName="Upload" 
          iconPosition="left"
          fullWidth
          className="sm:w-auto"
        >
          Upload Report
        </Button>
      </Link>
      <Link to="/my-reports" className="w-full sm:w-auto">
        <Button 
          variant="outline" 
          iconName="FileText" 
          iconPosition="left"
          fullWidth
          className="sm:w-auto"
        >
          View All Reports
        </Button>
      </Link>
    </div>
  );
};

export default QuickActions;