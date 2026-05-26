import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
const userSchema = new Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationExpires: { type: Date },
    age: { type: Number },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer-not-to-say'] },
    bloodType: { type: String },
    medicalId: { type: String },
    phone: { type: String },
    dateOfBirth: { type: String },
    // AI-generated and auto-updated health profile
    healthProfile: {
      chronicConditions: [{ type: String }],
      allergies: [{ type: String }],
      currentMedications: [{ type: String }],
      previousDiagnoses: [{ type: String }],
      riskIndicators: [{ type: String }],
      recurringSymptoms: [{ type: String }],
      healthSummary: { type: String },
      lastUpdated: { type: Date },
      totalReports: { type: Number, default: 0 },
      totalTestsTracked: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  // Hash the password with a salt of 10
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
userSchema.methods.isPasswordCorrect = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};


export const User = mongoose.model("User", userSchema);
