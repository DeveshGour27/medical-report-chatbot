import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Header from "../../components/ui/Header";
import Sidebar from "../../components/ui/Sidebar";

// Components
import ReportContextPanel from "./components/ReportContextPanel";
import ChatMessage from "./components/ChatMessage";
import SuggestedQuestions from "./components/SuggestedQuestions";
import ChatInput from "./components/ChatInput";
import ConversationHistory from "./components/ConversationHistory";

import Icon from "../../components/AppIcon";
import axios from "axios";
import { useLocation } from "react-router-dom";

const ChatAssistant = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const location = useLocation();

  const [reports, setReports] = useState([]);

  // ------------------------------------------------------------
  // 1️⃣ LOAD REPORTS FROM LOCAL STORAGE
  // ------------------------------------------------------------
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("medicalReports") || "[]");

    const formatted = stored.map((r) => ({
      id: r.id,
      name: r.title || "Medical Report",
      uploadDate: r.uploadDate,
      extractedData: r.extractedData,
      fullReport: r
    }));

    setReports(formatted);
  }, []);

  // ------------------------------------------------------------
  // 2️⃣ NEW USE EFFECT — AUTO SYNC REPORTS TO BACKEND
  // ------------------------------------------------------------
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("medicalReports") || "[]");

    if (stored.length === 0) return;

    console.log("🔄 Syncing reports to backend…");

    stored.forEach(async (report) => {
      try {
        await axios.post("http://127.0.0.1:8000/save_report", report);
      } catch (err) {
        console.log("Sync error:", err);
      }
    });

    console.log("✅ Sync complete. Reports sent:", stored.length);
  }, []);

  // ------------------------------------------------------------
  // 3️⃣ AUTO SELECT REPORT IF COMING FROM MY-REPORTS
  // ------------------------------------------------------------
  useEffect(() => {
    if (location.state?.selectedReport) {
      setSelectedReport(location.state.selectedReport);
    }
  }, [location.state]);

  // ------------------------------------------------------------
  // 4️⃣ AUTO SCROLL CHAT
  // ------------------------------------------------------------
  useEffect(() => {
    messagesEndRef?.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ------------------------------------------------------------
  // 5️⃣ SEND MESSAGE TO FASTAPI
  // ------------------------------------------------------------
  const sendRAGMessage = async (question) => {
    const res = await axios.post("http://127.0.0.1:8000/chat_with_report", {
      report_id: String(selectedReport.id), // ensure string
      question: question,
    });

    return res.data.answer;
  };

  // ------------------------------------------------------------
  // 6️⃣ HANDLE MESSAGE SEND
  // ------------------------------------------------------------
  const handleSendMessage = async (text) => {
    if (!selectedReport) return;

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
          text: "⚠️ Unable to process your request. Please try again.",
          isUser: false,
        },
      ]);
    }

    setIsLoading(false);
  };

  // ------------------------------------------------------------
  // 7️⃣ WHEN USER SELECTS REPORT
  // ------------------------------------------------------------
  const handleReportSelect = (report) => {
    setSelectedReport(report);
    setMessages([]); // clear chat
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
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Icon name="MessageSquare" size={22} color="white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Chat Assistant</h1>
              <p className="text-muted-foreground">
                Chat with AI using your REAL medical report
              </p>
            </div>
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
