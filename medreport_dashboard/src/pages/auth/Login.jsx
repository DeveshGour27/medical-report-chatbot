import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";
import { Eye, EyeOff, Mail, Lock, AlertCircle, Info } from "lucide-react";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isVerificationError, setIsVerificationError] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) { setError(""); setIsVerificationError(false); }
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
      const { data, error: signInError } = await signIn(formData.email, formData.password);
      if (signInError) {
        const errorMsg = signInError.message || "Failed to sign in";
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
        setTimeout(() => navigate("/dashboard"), 800);
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
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Logo + Title */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
        </div>
        <h2 className="text-center text-3xl font-bold text-foreground">Sign in to your account</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Or{" "}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            create a new account
          </Link>
        </p>
      </div>

      {/* Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card border border-border py-8 px-6 shadow rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Error Banner */}
            {error && (
              <div className={`border rounded-md p-4 ${isVerificationError ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20'}`}>
                <div className="flex">
                  {isVerificationError
                    ? <Info className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                    : <AlertCircle className="h-5 w-5 text-destructive mr-3 mt-0.5 flex-shrink-0" />
                  }
                  <div>
                    <div className={`text-sm ${isVerificationError ? 'text-primary' : 'text-destructive'}`}>{error}</div>
                    {isVerificationError && (
                      <div className="mt-2 text-sm text-primary">
                        <p>
                          Didn't receive the email?{" "}
                          <Link to="/resend-verification" className="font-medium underline hover:opacity-80">
                            Resend verification email
                          </Link>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                Email address
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <Mail className="h-5 w-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <Lock className="h-5 w-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot your password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
