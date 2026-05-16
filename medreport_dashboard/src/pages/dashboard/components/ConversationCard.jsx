import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';

const ConversationCard = ({ conversation }) => {
  const formatTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <Link 
      to="/chat-assistant" 
      className="block bg-card border border-border rounded-lg p-4 hover:shadow-lg hover:border-primary/20 transition-all duration-300 ease-out group"
    >
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
          <Icon name="Bot" size={16} color="white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-medium text-foreground group-hover:text-primary transition-colors duration-200">
              AI Assistant
            </h4>
            <span className="text-xs text-muted-foreground">{formatTime(conversation?.timestamp)}</span>
          </div>
          <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{conversation?.topic}</p>
          <p className="text-sm text-foreground line-clamp-2">{conversation?.lastMessage}</p>
        </div>
        <Icon name="ChevronRight" size={16} className="text-muted-foreground group-hover:text-primary transition-colors duration-200" />
      </div>
    </Link>
  );
};

export default ConversationCard;