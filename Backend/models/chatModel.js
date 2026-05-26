import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: "Report", default: null },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    topic: { type: String, default: "general" },
  },
  { timestamps: true }
);

// Index for fast user-history lookup
chatSchema.index({ userId: 1, createdAt: -1 });
chatSchema.index({ userId: 1, reportId: 1 });

export default mongoose.model("Chat", chatSchema);
