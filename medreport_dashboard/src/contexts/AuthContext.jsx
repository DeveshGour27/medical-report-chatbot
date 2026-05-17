import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { API_USERS } from "../utils/apiConstants";

const AuthContext = createContext({});

const API_URL = API_USERS; // centralized in apiConstants.js

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Check for existing token on mount
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Sign up with email and password
  const signUp = async (email, password, username) => {
    try {
      const response = await axios.post(`${API_URL}/signUp`, {
        username,
        email,
        password,
      });

      const { user: userData, message } = response.data;

      // DON'T store token yet - user needs to verify email first
      // Just return success so UI can show verification message
      return {
        data: {
          user: userData,
          message: message,
        },
        error: null,
      };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to create account";
      return {
        data: null,
        error: { message: errorMessage },
      };
    }
  };

  // Sign in with email and password
  const signIn = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/login`, {
        email,
        password,
      });

      const { user: userData, token: authToken } = response.data;

      // Store token and user only after successful login (email must be verified)
      localStorage.setItem("token", authToken);
      localStorage.setItem("user", JSON.stringify(userData));

      setToken(authToken);
      setUser(userData);

      return {
        data: {
          user: userData,
          session: { access_token: authToken },
        },
        error: null,
      };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || error.message || "Failed to sign in";
      return {
        data: null,
        error: { message: errorMessage },
      };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      // Clear token and user
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Clear reports and chat data for security
      localStorage.removeItem("medicalReports");
      localStorage.removeItem("chatMessages");

      setToken(null);
      setUser(null);

      return { error: null };
    } catch (error) {
      return { error: { message: error.message } };
    }
  };

  // Update user profile in context and localStorage
  const updateUser = (updatedUserData) => {
    const merged = { ...user, ...updatedUserData };
    setUser(merged);
    localStorage.setItem("user", JSON.stringify(merged));
  };

  // Reset password (placeholder - implement backend endpoint)
  const resetPassword = async (email) => {
    try {
      // TODO: Implement backend endpoint for password reset
      await axios.post(`${API_URL}/reset-password`, { email });
      return { error: null };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to reset password";
      return { error: { message: errorMessage } };
    }
  };

  // Update password (placeholder - implement backend endpoint)
  const updatePassword = async (password) => {
    try {
      // TODO: Implement backend endpoint for password update
      const response = await axios.patch(
        `${API_URL}/update-password`,
        { password },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return { data: response.data, error: null };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to update password";
      return { data: null, error: { message: errorMessage } };
    }
  };

  // Verify email with token
  const verifyEmail = async (token) => {
    try {
      const response = await axios.get(
        `${API_URL}/verify-email?token=${token}`
      );

      return {
        data: {
          message: response.data.message || "Email verified successfully!",
        },
        error: null,
      };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data ||
        error.message ||
        "Failed to verify email";
      return {
        data: null,
        error: { message: errorMessage },
      };
    }
  };

  // Resend email verification
  const resendVerification = async (email) => {
    try {
      const response = await axios.post(`${API_URL}/resend-verification`, {
        email,
      });
      return {
        data: { message: response.data.message || "Verification email sent!" },
        error: null,
      };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data ||
        error.message ||
        "Failed to resend verification";
      return {
        data: null,
        error: { message: errorMessage },
      };
    }
  };

  const value = {
    user,
    session: token ? { access_token: token } : null,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    verifyEmail,
    resendVerification,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
