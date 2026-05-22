import React from "react";
import Icon from "../../../components/AppIcon"; 
import ReactMarkdown from 'react-markdown'; 
import remarkGfm from 'remark-gfm'; 

const ChatMessage = ({ message, isUser, timestamp, isTyping, medicalData }) => {
  const isAssistant = !isUser;

  const renderMedicalData = () => {
    if (!medicalData) return null;

    return (
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {Object.entries(medicalData).map(([key, obj]) => {
          const low = obj.reference_low;
          const high = obj.reference_high;
          const value = obj.value;

          const isNormal =
            low !== null &&
            high !== null &&
            value >= low &&
            value <= high;

          return (
            <div
              key={key}
              className={`flex flex-col p-3.5 rounded-xl border transition-all duration-200 ${
                isNormal 
                  ? "bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/20 text-emerald-800 dark:text-emerald-300 shadow-sm" 
                  : "bg-rose-50/30 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/20 text-rose-800 dark:text-rose-300 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm capitalize">{key}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                  isNormal 
                    ? "bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200" 
                    : "bg-rose-100/50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200"
                }`}>
                  {isNormal ? "Normal" : "Abnormal"}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-bold tracking-tight">{value}</span>
                <span className="text-xs opacity-80 ml-0.5">{obj.unit}</span>
              </div>
              {low !== null && high !== null && (
                <div className="mt-1.5 flex items-center justify-between text-xs opacity-75 border-t border-current/10 pt-1.5">
                  <span>Reference Range:</span>
                  <span className="font-medium text-data">{low} – {high} {obj.unit}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`w-full py-6 flex ${isUser ? "justify-end" : "justify-start border-b border-border/30"}`}>
      <div className={`flex items-start gap-4 w-full ${isUser ? "max-w-xl justify-end" : "max-w-3xl"}`}>
        
        {/* Assistant Avatar */}
        {isAssistant && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shadow-sm text-primary dark:text-blue-400">
            <Icon name="Activity" size={18} />
          </div>
        )}

        {/* Message Bubble Container */}
        <div className={`flex flex-col min-w-0 ${isUser ? "items-end" : "items-start flex-1"}`}>
          
          <div
            className={`text-sm ${
              isUser
                ? "bg-primary text-white rounded-2xl rounded-tr-none px-4 py-2.5 shadow-sm leading-relaxed"
                : "text-foreground w-full leading-relaxed"
            }`}
          >
            {!isTyping ? (
              <div className={isUser ? "" : "prose dark:prose-invert max-w-none text-foreground/95"}>
                {isUser ? (
                  <p className="whitespace-pre-line">{message}</p>
                ) : (
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-lg font-bold text-foreground mt-4 mb-2 border-b pb-1 border-border/40" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-base font-semibold text-foreground mt-4 mb-2 flex items-center gap-1.5" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-sm font-semibold text-foreground mt-3 mb-1" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-2 space-y-1.5 text-foreground/90" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2 space-y-1.5 text-foreground/90" {...props} />,
                      li: ({node, ...props}) => <li className="leading-relaxed pl-0.5 text-sm" {...props} />,
                      p: ({node, ...props}) => <p className="leading-relaxed text-sm mb-3" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold text-foreground" {...props} />,
                    }}
                  >
                    {message}
                  </ReactMarkdown>
                )}
              </div>
            ) : (
              <div className="flex space-x-1.5 py-1.5 px-3 bg-muted rounded-2xl">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce delay-150"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce delay-300"></div>
              </div>
            )}
          </div>

          {timestamp && !isTyping && (
            <span className={`text-[10px] opacity-50 mt-1 ${isUser ? "mr-1 text-right" : "ml-0 text-left"}`}>
              {timestamp}
            </span>
          )}

          {renderMedicalData()}
        </div>

        {/* User Avatar (Optional - represented by alignment, or we can add it for completeness) */}
        {isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-sm text-white text-xs font-semibold uppercase">
            U
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;