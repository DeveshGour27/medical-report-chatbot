import express from "express";
import Report from "../models/reportModel.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.post("/save", auth, async (req, res) => {
  try {
    const report = await Report.create({
      userId: req.user.id,
      ...req.body
    });

    res.json({ status: "saved", report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/list", auth, async (req, res) => {
  const reports = await Report.find({ userId: req.user.id });
  res.json({ reports });
});

router.delete("/delete-all", async (req, res) => {
  try {
    await Report.deleteMany({});
    res.json({ message: "All reports deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;
