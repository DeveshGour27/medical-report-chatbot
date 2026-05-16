import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const ChatInput = ({ onSendMessage, isLoading, disabled }) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (message?.trim() && !isLoading && !disabled) {
      onSendMessage(message?.trim());
      setMessage('');
      if (textareaRef?.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e?.key === 'Enter' && !e?.shiftKey) {
      e?.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTextareaChange = (e) => {
    setMessage(e?.target?.value);
    
    // Auto-resize textarea
    if (textareaRef?.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef?.current?.scrollHeight, 120) + 'px';
    }
  };

  useEffect(() => {
    if (textareaRef?.current && !message) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message]);

  const inputVariants = {
    focused: { 
      scale: 1.02,
      transition: { duration: 0.2, ease: "easeOut" }
    },
    unfocused: { 
      scale: 1,
      transition: { duration: 0.2, ease: "easeOut" }
    }
  };

  return (
    <div className="sticky bottom-0 bg-background border-t border-border p-4">
      <motion.form
        onSubmit={handleSubmit}
        variants={inputVariants}
        animate={isFocused ? "focused" : "unfocused"}
        className="max-w-4xl mx-auto"
      >
        <div className={`bg-card border-2 rounded-lg transition-colors duration-200 ${
          isFocused ? 'border-primary' : 'border-border'
        } ${disabled ? 'opacity-50' : ''}`}>
          <div className="flex items-end space-x-3 p-4">
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleTextareaChange}
                onKeyPress={handleKeyPress}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={disabled ? "Select a report to start chatting..." : "Ask about your medical report..."}
                disabled={disabled || isLoading}
                className="w-full resize-none border-0 bg-transparent text-foreground placeholder-muted-foreground focus:outline-none focus:ring-0 text-sm leading-relaxed min-h-[20px] max-h-[120px]"
                rows={1}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              {isLoading && (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs">Analyzing...</span>
                </div>
              )}
              
              <Button
                type="submit"
                size="sm"
                disabled={!message?.trim() || isLoading || disabled}
                iconName="Send"
                iconSize={16}
                className="flex-shrink-0"
              >
                Send
              </Button>
            </div>
          </div>
          
          {!disabled && (
            <div className="px-4 pb-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center space-x-1">
                    <Icon name="Keyboard" size={12} />
                    <span>Press Enter to send, Shift+Enter for new line</span>
                  </span>
                </div>
                <span className={`${message?.length > 500 ? 'text-warning' : ''}`}>
                  {message?.length}/1000
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.form>
      {disabled && (
        <div className="max-w-4xl mx-auto mt-3">
          <div className="bg-muted rounded-lg p-3">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Icon name="Info" size={16} />
              <span className="text-sm">Select a medical report from the context panel above to start a conversation.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInput;