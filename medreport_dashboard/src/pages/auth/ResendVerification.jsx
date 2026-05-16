import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";

const ResendVerification = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const { resendVerification } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const { data, error: resendError } = await resendVerification(email);

      if (resendError) {
        const errorMsg = resendError.message || "Failed to resend verification email";
        setError(errorMsg);
        toast.error(errorMsg);
      } else {
        setSuccess(true);
        toast.success("Verification email sent! Check your inbox.");
      }
    } catch (err) {
      const errorMsg = "An unexpected error occurred";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (error) setError("");
    if (success) setSuccess(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-center text-3xl font-extrabold text-gray-900">
              Resend Verification Email
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter your email address and we'll send you a new verification link
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 flex">
                <AlertCircle className="h-5 w-5 text-red-400 mr-3 mt-0.5" />
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <CheckCircle className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-green-800">
                      Verification email sent successfully!
                    </div>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Check your email inbox and click the verification link to activate your account.</p>
                      <p className="mt-2">
                        <Link to="/login" className="font-medium underline hover:text-green-900">
                          Go to Login
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <div className="mt-1 relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="pl-10"
                  disabled={success}
                />
                <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={loading || success}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Sending..." : success ? "Email Sent" : "Send Verification Email"}
              </Button>
            </div>

            <div className="text-center text-sm">
              <Link
                to="/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResendVerification;
