import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Icon from '../../components/AppIcon';
import toast from 'react-hot-toast';
import { API_USERS } from '../../utils/apiConstants';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_USERS}/resend-verification`, { email });
      setSent(true);
      toast.success('Reset link sent! Check your inbox.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset email. Check the address and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <Icon name="Activity" size={28} color="white" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-bold text-foreground">Reset your password</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Enter your email and we'll send you a verification link
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card border border-border py-8 px-6 shadow rounded-lg">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                <Icon name="Mail" size={32} className="text-success" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Check your inbox</h3>
              <p className="text-muted-foreground text-sm">
                We sent a link to <strong>{email}</strong>. Click it to verify your account and set a new password.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center text-sm text-primary hover:underline"
              >
                <Icon name="ArrowLeft" size={16} className="mr-1" />
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <p className="text-center text-sm text-muted-foreground">
                Remember your password?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
