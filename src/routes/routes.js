import express from 'express';
import { createAccount, verifyOTP, resendOTP, loginUser, updateProfile, changePassword, sendPasswordChangeOTP } from '../controller/user_controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import multer from 'multer';


const router = express.Router();
const upload = multer({ storage: multer.diskStorage({}) });
// // Public routes
router.post('/register', createAccount);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/login', loginUser);

// Protected routes
router.put('/profile', authenticate, upload.single('profile_img'), updateProfile);
router.post('/send-password-otp', authenticate, sendPasswordChangeOTP);
router.put('/change-password', authenticate, changePassword);

export default router;