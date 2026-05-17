import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { API_REPORTS } from '../../utils/apiConstants';

import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';

import ReportFilters from './components/ReportFilters';
import ReportsTable from './components/ReportsTable';
import BulkActions from './components/BulkActions';
import ReportDetailModal from './components/ReportDetailModal';
import TablePagination from './components/TablePagination';

const MyReports = () => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  // State for API data
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user's reports from backend
  useEffect(() => {
    fetchUserReports();
  }, []);

  const fetchUserReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('No authentication token found');
        setReports([]);
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_REPORTS}/list`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const userReports = response.data.reports || [];
      
      // Format reports for table display
      const formatted = userReports.map((r) => ({
        id: r._id,
        name: r.title || 'Untitled Report',
        patientName: r.patientId || "Unknown Patient",
        patientAge: "-",
        patientGender: "-",
        type: r.category || "general",
        uploadDate: r.uploadDate?.split("T")[0] || new Date().toISOString().split("T")[0],
        status: r.status || "processed",
        fileSize: "—",

        // Convert extractedData to table-friendly format
        keyValues: Object.entries(
          r.extractedData?.["0"] 
          || r.extractedData 
          || (r.extractedDataStr ? (JSON.parse(r.extractedDataStr)?.["0"] || JSON.parse(r.extractedDataStr)) : {}) 
          || {}
        ).map(([key, obj]) => ({
          name: key,
          value: obj?.value,
          unit: obj?.unit,
          normalRange: `${obj?.reference_low}-${obj?.reference_high}`
        })),

        // Add original full report for modal
        fullReport: r
      }));

      setReports(formatted);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setError('Failed to load reports. Make sure you are logged in.');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

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
    navigate("/chat-assistant", { state: { selectedReportId: report.id } });
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_REPORTS}/${reportId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Remove from local state
      setReports(reports.filter(r => r.id !== reportId));
      toast.success('Report deleted successfully');
    } catch (err) {
      console.error('Failed to delete report:', err);
      toast.error('Failed to delete report');
    }
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

      <main className={`pt-16 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
        <div className="p-6">
          {/* -------- HEADER -------- */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 flex items-center justify-center bg-primary/10 rounded-lg">
                  <Icon name="FileText" size={24} className="text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">My Reports</h1>
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
          <div className="space-y-6">

            {loading && (
              <div className="bg-card border border-border rounded-lg p-12 text-center">
                <p className="text-muted-foreground">Loading your reports...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <p className="text-red-700">⚠️ {error}</p>
              </div>
            )}

            {!loading && !error && reports.length === 0 && (
              <div className="bg-card border border-border rounded-lg p-12 text-center">
                <Icon name="FileText" size={48} className="text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">No reports yet</p>
                <p className="text-sm text-muted-foreground mt-2">Upload your first medical report to get started</p>
                <Button
                  onClick={() => navigate("/upload-report")}
                  className="mt-6"
                >
                  Upload Report
                </Button>
              </div>
            )}

            {!loading && !error && reports.length > 0 && (
              <>
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
                  onDeleteReport={handleDeleteReport}
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
              </>
            )}
          </div>
        </div>
      </main>

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
