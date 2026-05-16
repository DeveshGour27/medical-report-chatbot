import express from "express";
import { chatWithRAG } from "../controllers/chatController.js";

const router = express.Router();

router.post("/rag", chatWithRAG);

export default router;
