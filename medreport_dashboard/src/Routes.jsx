import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import ProtectedRoute from "components/ProtectedRoute";

// Pages
import NotFound from "pages/NotFound";
import MyReports from "./pages/my-reports";
import ChatAssistant from "./pages/chat-assistant/index.jsx";
import Dashboard from "./pages/dashboard";
import UploadReport from "./pages/upload-report";
import ProfileSettings from "./pages/profile-settings";
import HelpSupport from "./pages/help/index.jsx";

// NEW: Memory & Intelligence pages
import Timeline from "./pages/timeline/index.jsx";
import HealthProfile from "./pages/health-profile/index.jsx";

// Auth Pages
import Login from "./pages/auth/Login";
import SignUp from "./pages/auth/SignUp";
import VerifyEmail from "./pages/auth/VerifyEmail";
import ResendVerification from "./pages/auth/ResendVerification";
import ForgotPassword from "./pages/auth/ForgotPassword";

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ScrollToTop />
        <RouterRoutes>

          {/* Default route → redirect to LOGIN */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Auth Routes (public) */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/resend-verification" element={<ResendVerification />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected App Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/my-reports" element={<ProtectedRoute><MyReports /></ProtectedRoute>} />
          <Route path="/upload-report" element={<ProtectedRoute><UploadReport /></ProtectedRoute>} />
          <Route path="/chat-assistant" element={<ProtectedRoute><ChatAssistant /></ProtectedRoute>} />
          <Route path="/profile-settings" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
          <Route path="/help" element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />

          {/* NEW: Memory & Intelligence Routes */}
          <Route path="/timeline" element={<ProtectedRoute><Timeline /></ProtectedRoute>} />
          <Route path="/health-profile" element={<ProtectedRoute><HealthProfile /></ProtectedRoute>} />

          {/* 404 Page */}
          <Route path="*" element={<NotFound />} />

        </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
