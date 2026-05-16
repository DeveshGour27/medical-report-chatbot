import React, { useState } from 'react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import Icon from '../../../components/AppIcon';

const SecurityTab = ({ securitySettings, onUpdate }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(securitySettings?.twoFactorEnabled);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password?.length >= 8) strength += 25;
    if (/[A-Z]/?.test(password)) strength += 25;
    if (/[0-9]/?.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/?.test(password)) strength += 25;
    return strength;
  };

  const handleNewPasswordChange = (value) => {
    setNewPassword(value);
    setPasswordStrength(calculatePasswordStrength(value));
    if (errors?.newPassword) {
      setErrors(prev => ({ ...prev, newPassword: '' }));
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 50) return 'bg-error';
    if (passwordStrength < 75) return 'bg-warning';
    return 'bg-success';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 25) return 'Very Weak';
    if (passwordStrength < 50) return 'Weak';
    if (passwordStrength < 75) return 'Good';
    return 'Strong';
  };

  const validatePasswordForm = () => {
    const newErrors = {};
    
    if (!currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    
    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword?.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }
    
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handlePasswordChange = async () => {
    if (!validatePasswordForm()) return;
    
    setIsChangingPassword(true);
    // Simulate API call
    setTimeout(() => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordStrength(0);
      setIsChangingPassword(false);
      // Show success message
    }, 2000);
  };

  const handleTwoFactorToggle = (checked) => {
    setTwoFactorEnabled(checked);
    onUpdate({ ...securitySettings, twoFactorEnabled: checked });
  };

  const loginSessions = [
    {
      id: 1,
      device: 'Chrome on Windows',
      location: 'New York, NY',
      lastActive: '2 minutes ago',
      current: true
    },
    {
      id: 2,
      device: 'Safari on iPhone',
      location: 'New York, NY',
      lastActive: '1 hour ago',
      current: false
    },
    {
      id: 3,
      device: 'Firefox on MacOS',
      location: 'Boston, MA',
      lastActive: '2 days ago',
      current: false
    }
  ];

  return (
    <div className="space-y-8">
      {/* Change Password Section */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Change Password</h3>
        <div className="space-y-4 max-w-md">
          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e?.target?.value)}
            error={errors?.currentPassword}
            placeholder="Enter current password"
          />

          <div>
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => handleNewPasswordChange(e?.target?.value)}
              error={errors?.newPassword}
              placeholder="Enter new password"
            />
            {newPassword && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Password Strength</span>
                  <span className={`font-medium ${passwordStrength >= 75 ? 'text-success' : passwordStrength >= 50 ? 'text-warning' : 'text-error'}`}>
                    {getPasswordStrengthText()}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                    style={{ width: `${passwordStrength}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e?.target?.value)}
            error={errors?.confirmPassword}
            placeholder="Confirm new password"
          />

          <Button
            onClick={handlePasswordChange}
            loading={isChangingPassword}
            iconName="Lock"
            iconPosition="left"
          >
            Update Password
          </Button>
        </div>
      </div>
      {/* Two-Factor Authentication */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Two-Factor Authentication</h3>
        <div className="flex items-start space-x-4">
          <div className="flex-1">
            <Checkbox
              label="Enable Two-Factor Authentication"
              description="Add an extra layer of security to your account by requiring a verification code from your phone"
              checked={twoFactorEnabled}
              onChange={(e) => handleTwoFactorToggle(e?.target?.checked)}
            />
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${twoFactorEnabled ? 'bg-success/10' : 'bg-muted'}`}>
            <Icon 
              name={twoFactorEnabled ? "Shield" : "ShieldOff"} 
              size={24} 
              className={twoFactorEnabled ? 'text-success' : 'text-muted-foreground'} 
            />
          </div>
        </div>
        {twoFactorEnabled && (
          <div className="mt-4 p-4 bg-success/10 rounded-lg">
            <div className="flex items-center space-x-2">
              <Icon name="CheckCircle" size={16} className="text-success" />
              <span className="text-sm text-success font-medium">Two-factor authentication is enabled</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Your account is protected with an additional security layer
            </p>
          </div>
        )}
      </div>
      {/* Active Sessions */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Active Sessions</h3>
        <div className="space-y-4">
          {loginSessions?.map((session) => (
            <div key={session?.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Icon name="Monitor" size={20} className="text-primary" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-foreground">{session?.device}</span>
                    {session?.current && (
                      <span className="px-2 py-1 bg-success text-success-foreground text-xs rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {session?.location} • {session?.lastActive}
                  </div>
                </div>
              </div>
              {!session?.current && (
                <Button variant="outline" size="sm">
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SecurityTab;