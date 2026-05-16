import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  title: String,
  category: String,
  priority: String,
  reportDate: String,
  doctorName: String,
  patientId: String,
  notes: String,

  uploadDate: String,
  fileName: String,
  
  extractedData: {},   // store extraction result
  status: { type: String, default: "processed" }
});

export default mongoose.model("Report", reportSchema);
