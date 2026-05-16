import React, { useState, useCallback } from "react";
import axios from "axios";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";

const FileUploadZone = ({ onFileSelect, isUploading, setIsUploading }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev + 1);

    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragCounter((prev) => prev - 1);
      if (dragCounter === 1) setIsDragOver(false);
    },
    [dragCounter]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // ---------------------------------------------------
  // REAL PDF → FASTAPI EXTRACTION
  // ---------------------------------------------------
  const processFileWithRAG = async (file) => {
    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(
        "http://127.0.0.1:8000/extract_report",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      setIsUploading(false);
      return res.data.extractedData;
    } catch (error) {
      console.error("RAG extract error:", error);
      setIsUploading(false);
      return null;
    }
  };

  // ---------------------------------------------------
  // DRAG + DROP UPLOAD
  // ---------------------------------------------------
  const handleDrop = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      setDragCounter(0);

      const file = e.dataTransfer.files[0];
      if (!file) return;

      if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
        alert("Only PDF or image files are allowed.");
        return;
      }

      const extracted = await processFileWithRAG(file);

      // Pass both file + extracted data to parent
      onFileSelect(file, extracted);
    },
    [onFileSelect]
  );

  // ---------------------------------------------------
  // BROWSE BUTTON UPLOAD
  // ---------------------------------------------------
  const handleFileInput = useCallback(
    async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
        alert("Only PDF or image files are allowed.");
        return;
      }

      const extracted = await processFileWithRAG(file);

      onFileSelect(file, extracted);
    },
    [onFileSelect]
  );

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 ${
        isDragOver
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-border hover:border-primary/50 hover:bg-muted/30"
      } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center space-y-6">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center ${
            isDragOver ? "bg-primary text-white scale-110" : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon name={isDragOver ? "Upload" : "FileText"} size={32} />
        </div>

        <h3 className="text-xl font-semibold text-foreground">
          {isDragOver ? "Drop file here" : "Upload Medical Report"}
        </h3>

        <p className="text-muted-foreground max-w-md">
          PDF or image — AI extracts real values using your RAG model.
        </p>

        <div className="relative">
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          <Button variant="outline" size="lg" iconName="FolderOpen" iconPosition="left">
            Browse File
          </Button>
        </div>
      </div>

      {isUploading && (
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-foreground font-medium">Extracting medical values…</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadZone;
