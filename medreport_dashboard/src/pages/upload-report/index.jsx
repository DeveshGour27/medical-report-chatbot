import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import Header from "../../components/ui/Header";
import Sidebar from "../../components/ui/Sidebar";
import FileUploadZone from "./components/FileUploadZone";
import FilePreview from "./components/FilePreview";
import UploadProgress from "./components/UploadProgress";
import ReportMetadataForm from "./components/ReportMetadataForm";
import UploadSuccess from "./components/UploadSuccess";
import Icon from "../../components/AppIcon";

const UploadReport = () => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);

  // extractedData MUST always be of shape { "0": {...} }
  const [extractedData, setExtractedData] = useState({});

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);

  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadedReport, setUploadedReport] = useState(null);

  const [metadata, setMetadata] = useState({
    title: "",
    category: "",
    priority: "normal",
    reportDate: new Date().toISOString().split("T")[0],
    doctorName: "",
    patientId: "",
    notes: ""
  });

  // ------------------------------------------------------------------
  // 1️⃣ RECEIVE FILE + EXTRACTED DATA FROM BACKEND
  // ------------------------------------------------------------------
  const handleFileSelect = (file, extracted) => {
    console.log("Extracted from backend:", extracted);

    setSelectedFile(file);

    // ALWAYS FORCE CORRECT SHAPE
    setExtractedData({
      "0": extracted || {}
    });

    setIsUploading(false);
    setCurrentStep(4);
  };

  // Remove file
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setExtractedData({});
    setUploadProgress(0);
    setCurrentStep(1);
  };

  const handleMetadataChange = (meta) => setMetadata(meta);

  // ------------------------------------------------------------------
  // 2️⃣ FINAL SUBMIT — SAVE TO LOCALSTORAGE + BACKEND
  // ------------------------------------------------------------------
  const handleSubmit = async () => {
    if (!selectedFile) return;

    const reportData = {
      id: Date.now().toString(), // 🔥 STRING ID — VERY IMPORTANT
      title: metadata.title || "Uploaded Medical Report",
      category: metadata.category,
      priority: metadata.priority,
      reportDate: metadata.reportDate,
      doctorName: metadata.doctorName,
      patientId: metadata.patientId,
      notes: metadata.notes,

      uploadDate: new Date().toISOString(),
      fileName: selectedFile.name,

      // MUST be exactly { "0": {...} }
      extractedData: extractedData,

      status: "processed"
    };

    console.log("🚀 SENDING TO BACKEND:", reportData);

    // -------------------------
    // 1) SAVE TO LOCAL STORAGE
    // -------------------------
    const existing = JSON.parse(localStorage.getItem("medicalReports") || "[]");
    existing.unshift(reportData);
    localStorage.setItem("medicalReports", JSON.stringify(existing));

    // -------------------------
    // 2) SAVE TO BACKEND
    // -------------------------
    try {
      const res = await axios.post("http://127.0.0.1:8000/save_report", reportData, {
        headers: { "Content-Type": "application/json" }
      });
      console.log("✔ Backend saved:", res.data);
    } catch (err) {
      console.error("❌ Backend save failed:", err);
    }

    // -------------------------
    // 3) UPDATE UI
    // -------------------------
    setUploadedReport(reportData);
    setUploadComplete(true);
  };

  // Reset upload
  const handleUploadAnother = () => {
    setSelectedFile(null);
    setExtractedData({});
    setUploadComplete(false);
    setUploadedReport(null);
    setUploadProgress(0);
    setCurrentStep(1);
  };

  // ------------------------------------------------------------------
  // UI
  // ------------------------------------------------------------------
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

      <main
        className={`pt-16 transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-60"
        }`}
      >
        <div className="p-6 max-w-6xl mx-auto space-y-8">

          {!uploadComplete && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Icon name="Upload" size={24} color="white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Upload Medical Report</h1>
                <p className="text-muted-foreground">
                  Upload a medical PDF to extract test values.
                </p>
              </div>
            </div>
          )}

          {uploadComplete ? (
            <UploadSuccess
              uploadedReport={uploadedReport}
              onUploadAnother={handleUploadAnother}
            />
          ) : (
            <div className="space-y-8">

              <UploadProgress
                isVisible={isUploading}
                progress={uploadProgress}
                currentStep={currentStep}
                totalSteps={1}
              />

              {!selectedFile && !isUploading && (
                <FileUploadZone
                  onFileSelect={handleFileSelect}
                  isUploading={isUploading}
                  setIsUploading={setIsUploading}
                />
              )}

              {selectedFile && !isUploading && (
                <FilePreview
                  files={[selectedFile]}
                  onRemoveFile={handleRemoveFile}
                  extractedData={extractedData}
                />
              )}

              {selectedFile && !isUploading && (
                <ReportMetadataForm
                  metadata={metadata}
                  onMetadataChange={handleMetadataChange}
                  onSubmit={handleSubmit}
                  onCancel={handleRemoveFile}
                  hasFiles={true}
                />
              )}

            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default UploadReport;
