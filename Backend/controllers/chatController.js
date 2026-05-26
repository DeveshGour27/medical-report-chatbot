import axios from "axios";
import Report from "../models/reportModel.js";
import Chat from "../models/chatModel.js";
import { User } from "../models/userModel.js";

const RAG_URL = process.env.RAG_API_URL || "http://127.0.0.1:8000";

export const chatWithRAG = async (req, res) => {
  try {
    const { message, reportId } = req.body;
    const userId = req.user.id;

    if (!message || !reportId) {
      return res.status(400).json({ error: "Message and reportId are required" });
    }

    // Fetch the report from MongoDB
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ error: "Report not found in database" });
    }

    // Verify report belongs to user
    if (report.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }

    console.log(`[CHAT] Processing message for report ${reportId}, user ${userId}`);

    // Get extracted data with fallback
    let finalData = report.extractedData;

    if (!finalData || Object.keys(finalData).length === 0) {
      if (report.extractedDataStr) {
        try {
          finalData = JSON.parse(report.extractedDataStr);
        } catch (e) {
          console.error("[CHAT] Failed to parse extractedDataStr:", e.message);
          finalData = {};
        }
      }
    }

    if (!finalData || Object.keys(finalData).length === 0) {
      return res.status(400).json({
        error: "No medical data in this report. Please upload a report with extractable medical data.",
      });
    }

    // Save user message to MongoDB
    await Chat.create({
      userId,
      reportId,
      role: "user",
      content: message,
      topic: "medical_chat",
    });

    // Call Python FastAPI RAG with userId for memory
    try {
      const response = await axios.post(
        `${RAG_URL}/chat_with_report`,
        {
          question: message,
          extractedData: finalData,
          rawText: report.rawText || "",
          userId: userId.toString(),
          reportId: reportId.toString(),
          reportDate: report.reportDate || report.uploadDate || "",
        },
        { timeout: 120000 }
      );

      const reply = response.data.answer || response.data.reply || "I couldn't generate a response.";

      // Save AI response to MongoDB
      await Chat.create({
        userId,
        reportId,
        role: "assistant",
        content: reply,
        topic: "medical_chat",
      });

      console.log(`[CHAT] RAG response saved to DB`);
      res.status(200).json({ reply });

    } catch (ragError) {
      console.error(`[CHAT] RAG API error:`, ragError.message);

      if (ragError.code === "ECONNREFUSED") {
        return res.status(503).json({
          error: "RAG API is not running. Please start the Python backend.",
        });
      }

      throw ragError;
    }
  } catch (error) {
    console.error("[CHAT] Error:", error.message);
    res.status(500).json({
      error: `Failed to process your message: ${error.message}`,
    });
  }
};

// GET persistent chat history for a user (all chats or per-report)
export const getChatHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reportId, limit = 50 } = req.query;

    const query = { userId };
    if (reportId) query.reportId = reportId;

    const chats = await Chat.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      history: chats.reverse(),
      count: chats.length,
    });
  } catch (error) {
    console.error("[CHAT HISTORY] Error:", error.message);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
};

// GET health timeline (aggregated from reports + chats)
export const getTimeline = async (req, res) => {
  try {
    const userId = req.user.id;

    // Try to get from Python memory engine first
    try {
      const ragResponse = await axios.get(`${RAG_URL}/timeline/${userId}`, {
        timeout: 15000,
      });
      return res.status(200).json(ragResponse.data);
    } catch (ragErr) {
      console.warn("[TIMELINE] RAG unavailable, falling back to MongoDB data");
    }

    // Fallback: build timeline from MongoDB
    const reports = await Report.find({ userId })
      .sort({ uploadDate: -1 })
      .select("title category priority reportDate uploadDate status notes")
      .lean();

    const chats = await Chat.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const timeline = [
      ...reports.map((r) => ({
        type: "report",
        id: r._id,
        title: r.title || "Medical Report",
        category: r.category,
        priority: r.priority,
        date: r.reportDate || r.uploadDate,
        status: r.status,
        created_at: r.uploadDate,
      })),
      ...chats.map((c) => ({
        type: "chat_session",
        id: c._id,
        role: c.role,
        content: c.content.slice(0, 100) + "...",
        reportId: c.reportId,
        created_at: c.createdAt,
      })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.status(200).json({
      status: "success",
      timeline,
      total_reports: reports.length,
    });
  } catch (error) {
    console.error("[TIMELINE] Error:", error.message);
    res.status(500).json({ error: "Failed to fetch timeline" });
  }
};

// GET/POST health profile
export const getHealthProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Try Python memory engine
    try {
      const ragResponse = await axios.get(`${RAG_URL}/health_profile/${userId}`, {
        timeout: 15000,
      });
      if (ragResponse.data.status === "found") {
        return res.status(200).json(ragResponse.data);
      }
    } catch (ragErr) {
      console.warn("[PROFILE] RAG unavailable, using MongoDB");
    }

    // Fallback: return profile from MongoDB user document
    const user = await User.findById(userId).select("healthProfile").lean();
    if (user?.healthProfile) {
      return res.status(200).json({
        status: "found",
        profile: user.healthProfile,
      });
    }

    res.status(200).json({ status: "not_found", profile: null });
  } catch (error) {
    console.error("[PROFILE] Error:", error.message);
    res.status(500).json({ error: "Failed to fetch health profile" });
  }
};

// POST trigger health profile (re)generation
export const generateHealthProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId)
      .select("username email age gender bloodType dateOfBirth phone medicalId")
      .lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const ragResponse = await axios.post(
      `${RAG_URL}/generate_health_profile`,
      { userId: userId.toString(), userInfo: user },
      { timeout: 60000 }
    );

    const profile = ragResponse.data.profile;

    // Update MongoDB user document with new profile
    if (profile) {
      await User.findByIdAndUpdate(userId, {
        healthProfile: {
          chronicConditions: profile.chronic_conditions || [],
          allergies: profile.allergies || [],
          currentMedications: profile.current_medications || [],
          previousDiagnoses: profile.previous_diagnoses || [],
          riskIndicators: profile.risk_indicators || [],
          recurringSymptoms: profile.recurring_symptoms || [],
          healthSummary: profile.health_summary || "",
          lastUpdated: new Date(),
          totalReports: profile.total_reports || 0,
          totalTestsTracked: profile.total_tests_tracked || 0,
        },
      });
    }

    res.status(200).json(ragResponse.data);
  } catch (error) {
    console.error("[PROFILE GEN] Error:", error.message);
    res.status(500).json({ error: `Failed to generate health profile: ${error.message}` });
  }
};

// POST generate and download PDF
export const downloadPDF = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId)
      .select("username email age gender bloodType dateOfBirth phone medicalId")
      .lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const ragResponse = await axios.post(
      `${RAG_URL}/generate_pdf`,
      {
        userId: userId.toString(),
        userInfo: user,
        aiSummary: req.body.aiSummary || "",
      },
      {
        timeout: 120000,
        responseType: "arraybuffer",
      }
    );

    const username = (user.username || "patient").replace(/\s+/g, "_");
    const date = new Date().toISOString().slice(0, 10);
    const filename = `MedReport_${username}_${date}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(Buffer.from(ragResponse.data));
  } catch (error) {
    console.error("[PDF] Error:", error.message);
    res.status(500).json({ error: `Failed to generate PDF: ${error.message}` });
  }
};
