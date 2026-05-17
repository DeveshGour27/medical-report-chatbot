import express from "express";
import Report from "../models/reportModel.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Save report — only whitelist known fields (B3 fix: no more req.body spread)
router.post("/save", auth, async (req, res) => {
  try {
    const {
      title,
      category,
      priority,
      reportDate,
      doctorName,
      patientId,
      notes,
      uploadDate,
      fileName,
      extractedData,
      status
    } = req.body;

    const report = await Report.create({
      userId: req.user.id,
      title,
      category,
      priority,
      reportDate,
      doctorName,
      patientId,
      notes,
      uploadDate,
      fileName,
      extractedData,
      extractedDataStr: JSON.stringify(extractedData || {}),
      rawText: req.body.rawText || "",
      status: status || "processed"
    });

    res.json({ status: "saved", report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List user's own reports (B4 fix: added try/catch)
router.get("/list", auth, async (req, res) => {
  try {
    const reports = await Report.find({ userId: req.user.id }).sort({ uploadDate: -1 });
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete all — PROTECTED with auth + only deletes current user's reports (B1 fix)
router.delete("/delete-all", auth, async (req, res) => {
  try {
    await Report.deleteMany({ userId: req.user.id });
    res.json({ message: "All your reports deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a specific report by ID
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    // Only allow user to delete their own reports
    if (report.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: "Not authorized to delete this report" });
    }

    await Report.findByIdAndDelete(id);
    res.json({ message: "Report deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
