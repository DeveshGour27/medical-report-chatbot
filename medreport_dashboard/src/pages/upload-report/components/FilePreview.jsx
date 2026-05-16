import React from "react";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";
import Image from "../../../components/AppImage";

const FilePreview = ({ files, onRemoveFile, extractedData }) => {
  if (!files || files.length === 0) return null;

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (file) => {
    if (file?.type === "application/pdf") return "FileText";
    if (file?.type?.startsWith("image/")) return "Image";
    return "File";
  };

  const getFilePreview = (file) => {
    if (file?.type?.startsWith("image/")) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  // helper: decide color
  const getValueColor = (obj) => {
    if (obj.reference_low == null || obj.reference_high == null) {
      return "text-yellow-600"; // no range available
    }
    if (obj.value < obj.reference_low || obj.value > obj.reference_high) {
      return "text-red-600 font-semibold"; // out of normal range
    }
    return "text-green-600 font-semibold"; // normal
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Selected File</h3>

      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        {files.map((file, index) => {
          const previewUrl = getFilePreview(file);

          // correct extracted structure
          const dataForFile = extractedData?.[index];

          return (
            <div key={index} className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {previewUrl ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <Image
                        src={previewUrl}
                        alt={file?.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon name={getFileIcon(file)} size={24} className="text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{file?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)} • {file?.type}
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  iconName="X"
                  onClick={() => onRemoveFile(index)}
                  className="flex-shrink-0 ml-2"
                />
              </div>

              {/* Extracted Data */}
              {dataForFile ? (
                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-medium mb-3">Extracted Medical Data</h4>

                  <div className="grid gap-2 sm:grid-cols-2">

                    {Object.entries(dataForFile).map(([key, obj]) => {
                      const color = getValueColor(obj);

                      return (
                        <div key={key} className="bg-muted/50 rounded-lg p-3">
                          <span className="text-xs text-muted-foreground uppercase">
                            {key.replace(/([A-Z])/g, " $1")}
                          </span>

                          {/* VALUE with color */}
                          <p className={`mt-1 text-sm ${color}`}>
                            {obj?.value} {obj?.unit}
                          </p>

                          {/* Normal Range */}
                          {(obj.reference_low != null && obj.reference_high != null) && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Normal: {obj.reference_low} – {obj.reference_high} {obj.unit}
                            </p>
                          )}
                        </div>
                      );
                    })}

                  </div>
                </div>
              ) : (
                <div className="border-t border-border pt-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-muted-foreground">
                      Analyzing medical data...
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FilePreview;
