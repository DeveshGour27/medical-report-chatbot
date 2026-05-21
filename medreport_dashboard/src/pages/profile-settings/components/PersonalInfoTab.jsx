import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Input from '../../../components/ui/Input';
import DateInput from '../../../components/ui/DateInput';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { API_USERS } from '../../../utils/apiConstants';

const PersonalInfoTab = ({ userProfile, onUpdate }) => {
  const { updateUser } = useAuth();
  const [formData, setFormData] = useState(userProfile);
  const [isLoading, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Re-sync formData whenever parent passes in updated userProfile
  // (needed because useState only captures the initial value at mount,
  //  but AuthContext may still be loading at that point)
  useEffect(() => {
    setFormData(userProfile);
  }, [userProfile]);

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
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData?.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_USERS}/profile`,
        {
          gender: formData.gender,
          bloodType: formData.bloodType,
          medicalId: formData.medicalId,
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Sync the saved data back to AuthContext + localStorage so it persists on refresh
      const savedUser = response.data.user;
      updateUser(savedUser);

      onUpdate(formData);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
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

        <DateInput
          label="Date of Birth"
          value={formData?.dateOfBirth || ''}
          onChange={(e) => handleInputChange('dateOfBirth', e?.target?.value)}
          placeholder="dd-mm-yyyy"
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