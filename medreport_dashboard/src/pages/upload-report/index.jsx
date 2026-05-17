import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

import Header from "../../components/ui/Header";
import Sidebar from "../../components/ui/Sidebar";
import FileUploadZone from "./components/FileUploadZone";
import FilePreview from "./components/FilePreview";
import UploadProgress from "./components/UploadProgress";
import ReportMetadataForm from "./components/ReportMetadataForm";
import UploadSuccess from "./components/UploadSuccess";
import Icon from "../../components/AppIcon";
import { API_REPORTS } from "../../utils/apiConstants";

const UploadReport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [extractedData, setExtractedData] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);  // F11: will be updated
  const [currentStep, setCurrentStep] = useState(1);

  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadedReport, setUploadedReport] = useState(null);
  const [rawText, setRawText] = useState("");

  const [metadata, setMetadata] = useState({
    title: "",
    category: "",
    priority: "normal",
    reportDate: new Date().toISOString().split("T")[0],
    doctorName: "",
    patientId: "",
    notes: ""
  });

  // F11: simulate progress during extraction step
  const simulateProgress = (onDone) => {
    setUploadProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 90) {
        clearInterval(interval);
        setUploadProgress(90);
        onDone();
      } else {
        setUploadProgress(Math.round(progress));
      }
    }, 300);
    return interval;
  };

  const handleFileSelect = (file, extracted, rawText) => {
    setSelectedFile(file);
    setExtractedData({ "0": extracted?.["0"] || extracted || {} });
    setRawText(rawText || "");
    setIsUploading(false);
    setUploadProgress(0);
    setCurrentStep(4);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setExtractedData({});
    setUploadProgress(0);
    setCurrentStep(1);
  };

  const handleMetadataChange = (meta) => setMetadata(meta);

  const handleSubmit = async () => {
    if (!selectedFile) return;

    const reportData = {
      title: metadata.title || "Uploaded Medical Report",
      category: metadata.category,
      priority: metadata.priority,
      reportDate: metadata.reportDate,
      doctorName: metadata.doctorName,
      patientId: metadata.patientId,
      notes: metadata.notes,
      uploadDate: new Date().toISOString(),
      fileName: selectedFile.name,
      extractedData: extractedData,
      rawText: rawText,
      status: "processed"
    };

    try {
      setIsUploading(true);
      setUploadProgress(10);

      const token = localStorage.getItem('token');

      if (!token) {
        toast.error('Session expired. Please log in again.');  // F3: toast instead of alert
        navigate('/login');
        return;
      }

      // F11: animate progress while saving
      simulateProgress(() => {});

      const res = await axios.post(`${API_REPORTS}/save`, reportData, {  // B5: use constant
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      setUploadProgress(100);
      setUploadedReport(reportData);
      setUploadComplete(true);
      toast.success('Report uploaded successfully!');
    } catch (err) {
      setUploadProgress(0);
      toast.error('Failed to upload report. Please try again.');  // F3: toast instead of alert
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadAnother = () => {
    setSelectedFile(null);
    setExtractedData({});
    setUploadComplete(false);
    setUploadedReport(null);
    setUploadProgress(0);
    setCurrentStep(1);
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
