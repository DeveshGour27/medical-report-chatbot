import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon';

const ConversationHistory = ({ conversations, onConversationSelect, selectedConversationId, onClearHistory }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredConversations = conversations?.filter(conv =>
    conv?.title?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
    conv?.lastMessage?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
    conv?.reportName?.toLowerCase()?.includes(searchTerm?.toLowerCase())
  );

  const containerVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { 
      opacity: 1, 
      height: 'auto',
      transition: { duration: 0.3, ease: "easeOut" }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  if (conversations?.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <div className="text-center">
          <Icon name="MessageSquare" size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Conversations Yet</h3>
          <p className="text-muted-foreground">Start a conversation about your medical reports to see your chat history here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg mb-6">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
              <Icon name="History" size={16} color="white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Conversation History</h3>
              <p className="text-sm text-muted-foreground">{conversations?.length} conversations</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              iconName={isExpanded ? "ChevronUp" : "ChevronDown"}
              iconSize={16}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
            
            {conversations?.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearHistory}
                iconName="Trash2"
                iconSize={16}
                className="text-error hover:text-error"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <Input
                type="search"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e?.target?.value)}
                className="mb-4"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="max-h-80 overflow-y-auto"
          >
            <div className="p-4 space-y-3">
              {filteredConversations?.length === 0 ? (
                <div className="text-center py-8">
                  <Icon name="Search" size={32} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No conversations match your search.</p>
                </div>
              ) : (
                filteredConversations?.map((conversation, index) => (
                  <motion.div
                    key={conversation?.id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: index * 0.05 }}
                  >
                    <button
                      onClick={() => onConversationSelect(conversation)}
                      className={`w-full text-left p-4 rounded-lg border transition-all duration-200 hover:shadow-card ${
                        selectedConversationId === conversation?.id
                          ? 'border-primary bg-primary/5' :'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-foreground truncate pr-2">{conversation?.title}</h4>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {new Date(conversation.lastUpdated)?.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2 mb-2">
                        <Icon name="FileText" size={14} className="text-primary" />
                        <span className="text-sm text-muted-foreground">{conversation?.reportName}</span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground truncate">{conversation?.lastMessage}</p>
                      
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-muted-foreground">
                          {conversation?.messageCount} messages
                        </span>
                        <div className="flex items-center space-x-1">
                          <Icon name="MessageSquare" size={12} className="text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {Math.floor((Date.now() - new Date(conversation.lastUpdated)) / (1000 * 60))}m ago
                          </span>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConversationHistory;