import React from "react";
// Assuming Icon is used elsewhere, kept for completeness
import Icon from "../../../components/AppIcon"; 
// Import the react-markdown component
import ReactMarkdown from 'react-markdown'; 
// Import GFM (optional, for tables, task lists, etc.)
import remarkGfm from 'remark-gfm'; 

const ChatMessage = ({ message, isUser, timestamp, isTyping, medicalData }) => {
  
  const renderMedicalData = () => {
    if (!medicalData) return null;

    return (
      <div className="mt-3 grid grid-cols-2 gap-2">
        {Object.entries(medicalData).map(([key, obj]) => {
          const low = obj.reference_low;
          const high = obj.reference_high;
          const value = obj.value;

          // Check if value is within the normal range
          const isNormal =
            low !== null &&
            high !== null &&
            value >= low &&
            value <= high;

          return (
            <div
              key={key}
              className={`p-2 rounded text-sm ${
                isNormal ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}
            >
              <strong>{key}</strong>: {value} {obj.unit}
              <br />
              <span className="text-xs">
                Normal: {low}–{high}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={`p-3 rounded-lg max-w-lg ${
        isUser
          ? "ml-auto bg-primary text-white"
          : "mr-auto bg-muted text-foreground"
      }`}
    >
      {!isTyping ? (
        <>
          {/* Use ReactMarkdown here instead of a simple <p> tag */}
          <div className="prose dark:prose-invert max-w-none text-inherit">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message}
            </ReactMarkdown>
          </div>
          {timestamp && (
            <p className="text-xs opacity-70 mt-1">{timestamp}</p>
          )}
          {renderMedicalData()}
        </>
      ) : (
        <div className="flex space-x-2">
          <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse"></div>
          <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse delay-150"></div>
          <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse delay-300"></div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;