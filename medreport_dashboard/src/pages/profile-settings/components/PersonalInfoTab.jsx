import React, { useState } from 'react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';

const PersonalInfoTab = ({ userProfile, onUpdate }) => {
  const [formData, setFormData] = useState(userProfile);
  const [isLoading, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: 'prefer-not-to-say', label: 'Prefer not to say' }
  ];

  const bloodTypeOptions = [
    { value: 'A+', label: 'A+' },
    { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' },
    { value: 'B-', label: 'B-' },
    { value: 'AB+', label: 'AB+' },
    { value: 'AB-', label: 'AB-' },
    { value: 'O+', label: 'O+' },
    { value: 'O-', label: 'O-' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors?.[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData?.name?.trim()) {
      newErrors.name = 'Full name is required';
    }
    
    if (!formData?.email?.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(formData?.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData?.medicalId?.trim()) {
      newErrors.medicalId = 'Medical ID is required';
    }

    if (!formData?.phone?.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    // Simulate API call
    setTimeout(() => {
      onUpdate(formData);
      setSaving(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Full Name"
          type="text"
          value={formData?.name || ''}
          onChange={(e) => handleInputChange('name', e?.target?.value)}
          error={errors?.name}
          required
          placeholder="Enter your full name"
        />

        <Input
          label="Email Address"
          type="email"
          value={formData?.email || ''}
          onChange={(e) => handleInputChange('email', e?.target?.value)}
          error={errors?.email}
          required
          placeholder="your.email@example.com"
        />

        <Input
          label="Medical ID"
          type="text"
          value={formData?.medicalId || ''}
          onChange={(e) => handleInputChange('medicalId', e?.target?.value)}
          error={errors?.medicalId}
          required
          placeholder="MED-12345"
          description="Your unique medical identification number"
        />

        <Input
          label="Phone Number"
          type="tel"
          value={formData?.phone || ''}
          onChange={(e) => handleInputChange('phone', e?.target?.value)}
          error={errors?.phone}
          required
          placeholder="+1 (555) 123-4567"
        />

        <Input
          label="Date of Birth"
          type="date"
          value={formData?.dateOfBirth || ''}
          onChange={(e) => handleInputChange('dateOfBirth', e?.target?.value)}
        />

        <Select
          label="Gender"
          options={genderOptions}
          value={formData?.gender || ''}
          onChange={(value) => handleInputChange('gender', value)}
          placeholder="Select gender"
        />

        <Select
          label="Blood Type"
          options={bloodTypeOptions}
          value={formData?.bloodType || ''}
          onChange={(value) => handleInputChange('bloodType', value)}
          placeholder="Select blood type"
        />

        <Input
          label="Emergency Contact"
          type="tel"
          value={formData?.emergencyContact || ''}
          onChange={(e) => handleInputChange('emergencyContact', e?.target?.value)}
          placeholder="+1 (555) 987-6543"
          description="Emergency contact phone number"
        />
      </div>
      <div className="space-y-4">
        <Input
          label="Healthcare Provider"
          type="text"
          value={formData?.healthcareProvider || ''}
          onChange={(e) => handleInputChange('healthcareProvider', e?.target?.value)}
          placeholder="General Hospital Medical Center"
        />

        <Input
          label="Insurance Provider"
          type="text"
          value={formData?.insuranceProvider || ''}
          onChange={(e) => handleInputChange('insuranceProvider', e?.target?.value)}
          placeholder="Blue Cross Blue Shield"
        />

        <Input
          label="Policy Number"
          type="text"
          value={formData?.policyNumber || ''}
          onChange={(e) => handleInputChange('policyNumber', e?.target?.value)}
          placeholder="INS-789456123"
        />
      </div>
      <div className="flex justify-end pt-4 border-t border-border">
        <Button
          onClick={handleSave}
          loading={isLoading}
          iconName="Save"
          iconPosition="left"
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default PersonalInfoTab;