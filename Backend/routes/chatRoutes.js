import express from "express";
import auth from "../middleware/auth.js";
import {
  chatWithRAG,
  getChatHistory,
  getTimeline,
  getHealthProfile,
  generateHealthProfile,
  downloadPDF,
} from "../controllers/chatController.js";

const router = express.Router();

// Chat endpoint (memory-augmented)
router.post("/rag", auth, chatWithRAG);

// Get persistent chat history
router.get("/history", auth, getChatHistory);

// Health timeline
router.get("/timeline", auth, getTimeline);

// Health profile (get or generate)
router.get("/health-profile", auth, getHealthProfile);
router.post("/health-profile/generate", auth, generateHealthProfile);

// PDF download
router.post("/download-pdf", auth, downloadPDF);

export default router;
