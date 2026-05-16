import React from 'react';
import Icon from '../../../components/AppIcon';

const MetricCard = ({ title, value, icon, trend, trendValue, color = "primary" }) => {
  const colorClasses = {
    primary: "bg-primary text-primary-foreground",
    success: "bg-success text-success-foreground", 
    warning: "bg-warning text-warning-foreground",
    accent: "bg-accent text-accent-foreground"
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-all duration-300 ease-out">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold text-foreground mb-2">{value}</p>
          {trend && (
            <div className="flex items-center space-x-1">
              <Icon 
                name={trend === 'up' ? 'TrendingUp' : 'TrendingDown'} 
                size={16} 
                className={trend === 'up' ? 'text-success' : 'text-error'}
              />
              <span className={`text-sm font-medium ${trend === 'up' ? 'text-success' : 'text-error'}`}>
                {trendValue}
              </span>
              <span className="text-sm text-muted-foreground">vs last month</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg ${colorClasses?.[color]} flex items-center justify-center`}>
          <Icon name={icon} size={24} />
        </div>
      </div>
    </div>
  );
};

export default MetricCard;