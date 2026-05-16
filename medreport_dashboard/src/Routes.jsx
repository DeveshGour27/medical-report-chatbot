import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";

// Pages
import NotFound from "pages/NotFound";
import MyReports from "./pages/my-reports";
import ChatAssistant from "./pages/chat-assistant/index.jsx";
import Dashboard from "./pages/dashboard";
import UploadReport from "./pages/upload-report";
import ProfileSettings from "./pages/profile-settings";

// Auth Pages
import Login from "./pages/auth/Login";
import SignUp from "./pages/auth/SignUp";
import VerifyEmail from "./pages/auth/VerifyEmail";
import ResendVerification from "./pages/auth/ResendVerification";

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ScrollToTop />
        <RouterRoutes>

          {/* Default route → redirect to LOGIN */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/resend-verification" element={<ResendVerification />} />

          {/* App Routes */}
          <Route path="/chat-assistant" element={<ChatAssistant />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-reports" element={<MyReports />} />
          <Route path="/upload-report" element={<UploadReport />} />
          <Route path="/profile-settings" element={<ProfileSettings />} />

          {/* 404 Page */}
          <Route path="*" element={<NotFound />} />

        </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
