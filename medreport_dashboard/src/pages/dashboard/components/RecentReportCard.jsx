import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const RecentReportCard = ({ report }) => {
  const getReportTypeIcon = (type) => {
    const iconMap = {
      'Blood Test': 'Droplets',
      'X-Ray': 'Scan',
      'MRI': 'Brain',
      'CT Scan': 'ScanLine',
      'ECG': 'Activity',
      'Ultrasound': 'Waves'
    };
    return iconMap?.[type] || 'FileText';
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'Normal': 'text-success',
      'Abnormal': 'text-error',
      'Pending': 'text-warning',
      'Critical': 'text-error'
    };
    return colorMap?.[status] || 'text-muted-foreground';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:shadow-lg transition-all duration-300 ease-out group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
            <Icon name={getReportTypeIcon(report?.type)} size={20} className="text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-200">
              {report?.type}
            </h3>
            <p className="text-sm text-muted-foreground">{report?.date}</p>
          </div>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full bg-muted ${getStatusColor(report?.status)}`}>
          {report?.status}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{report?.summary}</p>
      <div className="flex items-center space-x-2">
        <Link to="/my-reports" className="flex-1">
          <Button 
            variant="outline" 
            size="sm" 
            iconName="Eye" 
            iconPosition="left"
            fullWidth
          >
            View
          </Button>
        </Link>
        <Link to="/chat-assistant" className="flex-1">
          <Button 
            variant="default" 
            size="sm" 
            iconName="MessageSquare" 
            iconPosition="left"
            fullWidth
          >
            Chat
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default RecentReportCard;