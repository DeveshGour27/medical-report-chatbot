import axios from "axios";
import Report from "../models/reportModel.js";

export const chatWithRAG = async (req, res) => {
  try {
    const { message, reportId } = req.body;

    if (!message || !reportId) {
      return res.status(400).json({ error: "Message and reportId are required" });
    }

    // Fetch the report from MongoDB so we can pass the data to Python
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ error: "Report not found in database" });
    }

    console.log(`[CHAT] Processing message for report ${reportId}`);
    console.log(`[CHAT] Report extractedData keys:`, Object.keys(report.extractedData || {}));
    
    // Get extracted data with fallback
    let finalData = report.extractedData;
    
    if (!finalData || Object.keys(finalData).length === 0) {
      // Try parsing from string if object is empty
      if (report.extractedDataStr) {
        try {
          finalData = JSON.parse(report.extractedDataStr);
        } catch (e) {
          console.error('[CHAT] Failed to parse extractedDataStr:', e.message);
          finalData = {};
        }
      }
    }

    if (!finalData || Object.keys(finalData).length === 0) {
      return res.status(400).json({
        error: "No medical data in this report. Please upload a report with extractable medical data."
      });
    }

    console.log(`[CHAT] Sending data to RAG with keys:`, Object.keys(finalData));

    // Call your Python FastAPI RAG model, sending the exact data
    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/chat_with_report",
        {
          question: message,
          extractedData: finalData,
          rawText: report.rawText || "",
        },
        { timeout: 60000 }
      );

      console.log(`[CHAT] RAG response received`);

      res.status(200).json({
        reply: response.data.answer || response.data.reply || "I couldn't generate a response."
      });
    } catch (ragError) {
      console.error(`[CHAT] RAG API error:`, ragError.message);
      
      if (ragError.code === 'ECONNREFUSED') {
        return res.status(503).json({
          error: "RAG API is not running. Please start the Python backend at http://127.0.0.1:8000"
        });
      }
      
      if (ragError.response?.status === 404) {
        return res.status(400).json({
          error: "RAG API endpoint not found. Please check if the RAG API is properly configured."
        });
      }

      throw ragError;
    }

  } catch (error) {
    console.error("[CHAT] Error:", error.message);

    res.status(500).json({
      error: `Failed to process your message: ${error.message}. Please check if the RAG API is running.`
    });
  }
};
