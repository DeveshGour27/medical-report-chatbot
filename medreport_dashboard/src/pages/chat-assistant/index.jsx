import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import Header from "../../components/ui/Header";
import Sidebar from "../../components/ui/Sidebar";
import { useAuth } from "../../contexts/AuthContext";

// Components
import ReportContextPanel from "./components/ReportContextPanel";
import ChatMessage from "./components/ChatMessage";
import ChatInput from "./components/ChatInput";

import Icon from "../../components/AppIcon";
import { useLocation } from "react-router-dom";
import { API_REPORTS, API_CHAT } from "../../utils/apiConstants";

const ChatAssistant = () => {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const location = useLocation();

  const [reports, setReports] = useState([]);

  // Load persisted chat from localStorage when selectedReport changes
  useEffect(() => {
    if (user?.id && selectedReport?.id) {
      const saved = localStorage.getItem(`chat_messages_${user.id}_${selectedReport.id}`);
      if (saved) {
        try { 
          setMessages(JSON.parse(saved)); 
        } catch { 
          setMessages([]); 
        }
      } else {
        setMessages([]); // start fresh for this report
      }
    } else {
      setMessages([]);
    }
  }, [user?.id, selectedReport?.id]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (user?.id && selectedReport?.id) {
      if (messages.length > 0) {
        localStorage.setItem(`chat_messages_${user.id}_${selectedReport.id}`, JSON.stringify(messages));
      } else {
        localStorage.removeItem(`chat_messages_${user.id}_${selectedReport.id}`);
      }
    }
  }, [messages, user?.id, selectedReport?.id]);

  // Load user's reports from backend
  useEffect(() => {
    fetchUserReports();
  }, []);

  const fetchUserReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        setError('No authentication token found');
        setReports([]);
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_REPORTS}/list`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const userReports = response.data.reports || [];

      const formatted = userReports.map((r) => ({
        id: r._id,
        name: r.title || "Medical Report",
        uploadDate: r.uploadDate,
        extractedData: r.extractedData,
        fullReport: r
      }));

      setReports(formatted);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setError('Failed to load reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto select report if coming from My-Reports
  useEffect(() => {
    if (location.state?.selectedReportId && reports.length > 0) {
      const match = reports.find(r => r.id === location.state.selectedReportId);
      if (match) setSelectedReport(match);
    }
  }, [location.state, reports]);

  // Auto scroll chat
  useEffect(() => {
    messagesEndRef?.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message to Node backend (which calls Python RAG)
  const sendRAGMessage = async (question) => {
    try {
      console.log('[CHAT] Sending message:', question);
      console.log('[CHAT] Selected report:', selectedReport);
      console.log('[CHAT] Report ID to send:', selectedReport?.id || selectedReport?._id);
      
      const reportId = selectedReport?.id || selectedReport?._id;
      
      if (!reportId) {
        throw new Error('Report ID is missing');
      }
      
      const res = await axios.post(`${API_CHAT}/rag`, {
        message: question,
        reportId: reportId
      }, { timeout: 60000 });

      console.log('[CHAT] Response received:', res.data);
      return res.data.reply || res.data.answer || "No response from AI";
    } catch (err) {
      console.error('[CHAT] Error sending message:', err);
      
      const errorMessage = err.response?.data?.error || err.message || 'Failed to get AI response';
      throw new Error(errorMessage);
    }
  };

  // Handle message send
  const handleSendMessage = async (text) => {
    if (!selectedReport) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: "Please select a report first before asking questions.",
          isUser: false,
        },
      ]);
      return;
    }

    const userMessage = {
      id: Date.now(),
      text,
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const reply = await sendRAGMessage(text);

      const aiMessage = {
        id: Date.now() + 1,
        text: reply,
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
        medicalData: null,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: "⚠️ " + (err.message || "Unable to process your request. Please try again."),
          isUser: false,
        },
      ]);
    }

    setIsLoading(false);
  };

  const handleReportSelect = (report) => {
    setSelectedReport(report);
  };

  // Clear chat history
  const handleClearChat = () => {
    setMessages([]);
  };

  // Animation
  const pageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        isSidebarCollapsed={sidebarCollapsed}
      />

      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <motion.main
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        className={`pt-16 transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-60"
        }`}
      >
        <div className="max-w-6xl mx-auto p-6">
          {/* HEADER */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Icon name="MessageSquare" size={22} color="white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Chat Assistant</h1>
                <p className="text-muted-foreground">
                  Chat with AI using your medical report
                </p>
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <Icon name="Trash2" size={14} />
                <span>Clear Chat</span>
              </button>
            )}
          </div>

          {/* REPORT PICKER */}
          <ReportContextPanel
            selectedReport={selectedReport}
            onReportSelect={handleReportSelect}
            reports={reports}
          />

          {/* CHAT PANEL */}
          {selectedReport && (
            <div className="bg-card border border-border rounded-lg p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">Conversation</h3>

              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    isUser={msg.isUser}
                    message={msg.text}
                    timestamp={msg.timestamp}
                    medicalData={msg.medicalData}
                  />
                ))}

                {isLoading && <ChatMessage isTyping={true} isUser={false} />}

                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          {/* EMPTY STATE */}
          {!selectedReport && (
            <div className="bg-card border border-border p-10 mt-6 rounded-lg text-center">
              <Icon
                name="Bot"
                size={60}
                className="mx-auto text-muted-foreground"
              />
              <h2 className="text-xl font-bold mt-4">Select a report to begin</h2>
              <p className="text-muted-foreground mt-2">
                Upload a report first, then return here to chat with AI about it.
              </p>
            </div>
          )}

          {/* INPUT AREA */}
          {selectedReport && (
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
          )}
        </div>
      </motion.main>
    </div>
  );
};

export default ChatAssistant;
