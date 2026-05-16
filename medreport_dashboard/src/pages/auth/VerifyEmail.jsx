import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../../components/ui/Button";
import { CheckCircle, XCircle, Mail, Loader2, Info } from "lucide-react";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();

  const [status, setStatus] = useState("verifying"); // verifying, success, error, already_verified
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link. No token provided.");
      return;
    }

    const handleVerification = async () => {
      try {
        const { data, error } = await verifyEmail(token);

        if (error) {
          const errorMsg = error.message || "Email verification failed";

          // Check if error indicates already verified
          if (errorMsg.toLowerCase().includes("already verified")) {
            setStatus("already_verified");
            setMessage("Your email is already verified. You can login now.");
          } else {
            setStatus("error");
            setMessage(errorMsg);
          }
        } else {
          setStatus("success");
          setMessage(
            data?.message || "Your email has been verified successfully!"
          );
        }
      } catch (err) {
        setStatus("error");
        setMessage("An unexpected error occurred during verification.");
      }
    };

    handleVerification();
  }, [searchParams, verifyEmail]);

  const handleContinue = () => {
    if (status === "success" || status === "already_verified") {
      navigate("/login");
    } else {
      navigate("/signup");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {/* Icon based on status */}
            {status === "verifying" && (
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-blue-100 mb-6">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
              </div>
            )}

            {status === "success" && (
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            )}

            {status === "already_verified" && (
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-blue-100 mb-6">
                <Info className="h-12 w-12 text-blue-600" />
              </div>
            )}

            {status === "error" && (
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6">
                <XCircle className="h-12 w-12 text-red-600" />
              </div>
            )}

            {/* Title based on status */}
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {status === "verifying" && "Verifying Your Email"}
              {status === "success" && "Email Verified!"}
              {status === "already_verified" && "Already Verified"}
              {status === "error" && "Verification Failed"}
            </h2>

            {/* Message */}
            <p className="text-sm text-gray-600 mb-6">
              {status === "verifying" &&
                "Please wait while we verify your email address..."}
              {status !== "verifying" && message}
            </p>

            {/* Action buttons - only show when not verifying */}
            {status !== "verifying" && (
              <div className="space-y-3">
                <Button
                  onClick={handleContinue}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {status === "success" || status === "already_verified"
                    ? "Continue to Login"
                    : "Back to Sign Up"}
                </Button>

                {status === "error" && (
                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      Need a new verification link?{" "}
                      <Link
                        to="/resend-verification"
                        className="font-medium text-blue-600 hover:text-blue-500"
                      >
                        Resend verification email
                      </Link>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
