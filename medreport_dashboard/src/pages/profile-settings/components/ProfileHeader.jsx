import React, { useState } from 'react';
import Image from '../../../components/AppImage';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ProfileHeader = ({ userProfile, onProfileUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState(userProfile);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (event) => {
    const file = event?.target?.files?.[0];
    if (file) {
      setIsUploading(true);
      // Simulate image upload processing
      setTimeout(() => {
        const newImageUrl = `https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face`;
        setProfileData(prev => ({ ...prev, avatar: newImageUrl }));
        onProfileUpdate({ ...profileData, avatar: newImageUrl });
        setIsUploading(false);
      }, 2000);
    }
  };

  const handleSave = () => {
    onProfileUpdate(profileData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setProfileData(userProfile);
    setIsEditing(false);
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
          {/* Profile Picture */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center">
              {profileData?.avatar ? (
                <Image
                  src={profileData?.avatar}
                  alt="Profile picture"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Icon name="User" size={32} className="text-muted-foreground" />
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <Icon name="Loader2" size={24} className="text-white animate-spin" />
                </div>
              )}
            </div>
            <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
              <Icon name="Camera" size={16} color="white" />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={isUploading}
              />
            </label>
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={profileData?.name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, name: e?.target?.value }))}
                  className="text-xl font-semibold bg-input border border-border rounded-lg px-3 py-2 w-full max-w-xs"
                  placeholder="Full Name"
                />
                <input
                  type="text"
                  value={profileData?.title}
                  onChange={(e) => setProfileData(prev => ({ ...prev, title: e?.target?.value }))}
                  className="text-muted-foreground bg-input border border-border rounded-lg px-3 py-2 w-full max-w-xs"
                  placeholder="Professional Title"
                />
              </div>
            ) : (
              <div>
                <h1 className="text-xl font-semibold text-foreground">{profileData?.name}</h1>
                <p className="text-muted-foreground">{profileData?.title}</p>
                <div className="flex items-center mt-2 text-sm text-muted-foreground">
                  <Icon name="MapPin" size={16} className="mr-1" />
                  <span>{profileData?.location}</span>
                  <span className="mx-2">•</span>
                  <Icon name="Calendar" size={16} className="mr-1" />
                  <span>Joined {profileData?.joinDate}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 mt-4 lg:mt-0">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Changes
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)} iconName="Edit2" iconPosition="left">
              Edit Profile
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;