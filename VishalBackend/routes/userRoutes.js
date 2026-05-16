import express from "express";
import {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerification,
} from "../controllers/userController.js";

const router = express.Router();

router.post("/signUp", registerUser);
router.post("/login", loginUser);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);

export default router;
