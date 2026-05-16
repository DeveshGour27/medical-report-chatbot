import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

import ReportFilters from './components/ReportFilters';
import ReportsTable from './components/ReportsTable';
import BulkActions from './components/BulkActions';
import ReportDetailModal from './components/ReportDetailModal';
import TablePagination from './components/TablePagination';

const MyReports = () => {
  const navigate = useNavigate();

  const [selectedReports, setSelectedReports] = useState([]);
  const [filters, setFilters] = useState({
    searchTerm: '',
    reportType: '',
    dateRange: { start: '', end: '' },
    status: ''
  });
  const [sortConfig, setSortConfig] = useState({ key: 'uploadDate', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ------------------------------------------------------------------
  // LOAD REAL UPLOADED REPORTS FROM LOCALSTORAGE
  // ------------------------------------------------------------------
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("medicalReports") || "[]");

    const formatted = stored.map((r) => ({
      id: r.id,
      name: r.title,
      patientName: r.patientId || "Unknown Patient",
      patientAge: "-",
      patientGender: "-",
      type: r.category || "general",
      uploadDate: r.uploadDate?.split("T")[0],
      status: r.status || "processed",
      fileSize: "—",

      // Convert extractedData to table-friendly format
      keyValues: Object.entries(r.extractedData[0] || {}).map(([key, obj]) => ({
        name: key,
        value: obj.value,
        unit: obj.unit,
        normalRange: `${obj.reference_low}-${obj.reference_high}`
      })),

      // Add original full report for opening modal
      fullReport: r
    }));

    setReports(formatted);
  }, []);

  // ------------------------------------------------------------------
  // FILTER & SORT
  // ------------------------------------------------------------------
  const filteredAndSortedReports = useMemo(() => {
    let filtered = reports.filter(report => {
      const matchesSearch =
        !filters.searchTerm ||
        report.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        report.patientName.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        report.keyValues.some(v =>
          v.name.toLowerCase().includes(filters.searchTerm.toLowerCase())
        );

      const matchesType = !filters.reportType || report.type === filters.reportType;
      const matchesStatus = !filters.status || report.status === filters.status;

      const matchesDateRange =
        (!filters.dateRange.start || report.uploadDate >= filters.dateRange.start) &&
        (!filters.dateRange.end || report.uploadDate <= filters.dateRange.end);

      return matchesSearch && matchesType && matchesStatus && matchesDateRange;
    });

    // SORT
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === "uploadDate") {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [filters, reports, sortConfig]);

  // ------------------------------------------------------------------
  // PAGINATION
  // ------------------------------------------------------------------
  const totalPages = Math.ceil(filteredAndSortedReports.length / itemsPerPage);
  const paginatedReports = filteredAndSortedReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => setCurrentPage(1), [filters]);

  const handleViewReport = (report) => {
    setSelectedReport(report.fullReport);
    setIsModalOpen(true);
  };

  const handleChatWithReport = (report) => {
    navigate("/chat-assistant", { state: { selectedReport: report.fullReport } });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* -------- HEADER -------- */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 flex items-center justify-center bg-primary/10 rounded-lg">
              <Icon name="FileText" size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">My Reports</h1>
              <p className="text-muted-foreground">Your uploaded medical reports</p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => navigate("/upload-report")}
            iconName="Upload"
            iconPosition="left"
          >
            Upload New Report
          </Button>
        </div>
      </div>

      {/* -------- MAIN CONTENT -------- */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Filters */}
        <ReportFilters
          onFiltersChange={setFilters}
          totalReports={reports.length}
          filteredCount={filteredAndSortedReports.length}
        />

        {/* Bulk Actions */}
        <BulkActions
          selectedReports={selectedReports}
          onClearSelection={() => setSelectedReports([])}
        />

        {/* Reports Table */}
        <ReportsTable
          reports={paginatedReports}
          onViewReport={handleViewReport}
          onChatWithReport={handleChatWithReport}
          selectedReports={selectedReports}
          onSelectionChange={setSelectedReports}
          sortConfig={sortConfig}
          onSort={setSortConfig}
        />

        {/* Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredAndSortedReports.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      {/* Report Modal */}
      <ReportDetailModal
        report={selectedReport}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onChatWithReport={handleChatWithReport}
      />
    </div>
  );
};

export default MyReports;
