import React from 'react';
import Icon from '../../../components/AppIcon';

const StatsOverview = ({ stats }) => {
  const statItems = [
    {
      label: 'Total Reports',
      value: stats?.totalReports,
      icon: 'FileText',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      label: 'AI Conversations',
      value: stats?.totalConversations,
      icon: 'MessageSquare',
      color: 'text-accent',
      bgColor: 'bg-accent/10'
    },
    {
      label: 'Reports Analyzed',
      value: stats?.reportsAnalyzed,
      icon: 'BarChart3',
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      label: 'Account Age',
      value: `${stats?.accountAge} days`,
      icon: 'Clock',
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    }
  ];

  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Account Statistics</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems?.map((item, index) => (
          <div key={index} className="text-center">
            <div className={`w-12 h-12 ${item?.bgColor} rounded-lg flex items-center justify-center mx-auto mb-2`}>
              <Icon name={item?.icon} size={24} className={item?.color} />
            </div>
            <div className="text-2xl font-bold text-foreground">{item?.value}</div>
            <div className="text-sm text-muted-foreground">{item?.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsOverview;