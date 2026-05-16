import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";
import { Eye, EyeOff, Mail, Lock, AlertCircle, Info } from "lucide-react";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isVerificationError, setIsVerificationError] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (error) {
      setError("");
      setIsVerificationError(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error: signInError } = await signIn(
        formData.email,
        formData.password
      );

      if (signInError) {
        const errorMsg = signInError.message || "Failed to sign in";

        // Check if error is related to email verification
        if (errorMsg.includes("verify") || errorMsg.includes("verification") || errorMsg.includes("not verified")) {
          setError("Please verify your email before logging in. Check your inbox for the verification link.");
          setIsVerificationError(true);
          toast.error("Email not verified. Please check your inbox.");
        } else {
          setError(errorMsg);
          setIsVerificationError(false);
          toast.error(errorMsg);
        }
        return;
      }

      if (data?.user) {
        toast.success(`Welcome back, ${data.user.username}!`);
        setTimeout(() => {
          navigate("/dashboard");
        }, 800);
      }
    } catch (err) {
      const errorMsg = "An unexpected error occurred";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Sign in to your account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Or{" "}
              <Link
                to="/signup"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                create a new account
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className={`border rounded-md p-4 ${isVerificationError ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex">
                  {isVerificationError ? (
                    <Info className="h-5 w-5 text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <div className={`text-sm ${isVerificationError ? 'text-blue-700' : 'text-red-700'}`}>{error}</div>
                    {isVerificationError && (
                      <div className="mt-2 text-sm text-blue-600">
                        <p>
                          Didn't receive the email?{" "}
                          <Link
                            to="/resend-verification"
                            className="font-medium underline hover:text-blue-800"
                          >
                            Resend verification email
                          </Link>
                        </p>
                      </div>
                    )}
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
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="pl-10"
                />
                <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="mt-1 relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="pl-10 pr-10"
                />
                <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
