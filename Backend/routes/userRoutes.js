import express from "express";
import {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerification,
  updateUserProfile,
} from "../controllers/userController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.post("/signUp", registerUser);
router.post("/login", loginUser);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.put("/profile", auth, updateUserProfile);

export default router;
