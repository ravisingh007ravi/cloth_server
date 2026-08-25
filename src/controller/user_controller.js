// controllers/userController.js
import User from '../model/user_model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendEmail, generateOTP, getOTPEmailTemplate } from '../mail/all_mail_formate.js';
import { calculateLockDuration, getLockMessage } from '../utils/otpLock.js';

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'your-secret-key', {
        expiresIn: '7d'
    });
};

// Create Account
export const createAccount = async (req, res) => {
    try {
        const { first_name, last_name, gender, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email already registered' 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Create user
        const user =  User.create({
            first_name,
            last_name,
            gender,
            email: email.toLowerCase(),
            password: hashedPassword,
            verification: {
                otp,
                otp_expiry: otpExpiry,
                is_verified: false,
                otp_attempts: 0,
                max_otp_attempts: 3,
                lock_until: null,
                lock_count: 0
            }
        });

    

        getOTPEmailTemplate(first_name,email, otp);
        

        res.status(201).json({
            success: true,
            message: 'Account created successfully. Please verify your email with OTP.',
            data: {
                user_id: user._id,
                email: user.email,
                name: `${first_name} ${last_name}`
            }
        });

    } catch (error) {
        console.error('Create account error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create account',
            error: error.message
        });
    }
};

// Verify OTP
export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user is already verified
        if (user.verification.is_verified) {
            return res.status(400).json({
                success: false,
                message: 'Account already verified'
            });
        }

        // Check if account is locked
        if (user.verification.lock_until && user.verification.lock_until > Date.now()) {
            const lockMessage = getLockMessage(user.verification.lock_until);
            return res.status(429).json({
                success: false,
                message: `Account is locked. ${lockMessage}`,
                lock_until: user.verification.lock_until
            });
        }

        // Check OTP expiry
        if (user.verification.otp_expiry < Date.now()) {
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new OTP.'
            });
        }

        // Verify OTP
        if (user.verification.otp !== otp) {
            // Increment attempts
            user.verification.otp_attempts += 1;

            // Check if max attempts reached
            if (user.verification.otp_attempts >= user.verification.max_otp_attempts) {
                // Lock the account
                const lockDuration = calculateLockDuration(user.verification.lock_count);
                user.verification.lock_until = new Date(Date.now() + lockDuration);
                user.verification.lock_count += 1;
                user.verification.otp_attempts = 0;
                
                await user.save();
                
                const lockMessage = getLockMessage(user.verification.lock_until);
                return res.status(429).json({
                    success: false,
                    message: `Too many failed attempts. ${lockMessage}`,
                    lock_until: user.verification.lock_until,
                    attempts_remaining: 0
                });
            }

            await user.save();
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP',
                attempts_remaining: user.verification.max_otp_attempts - user.verification.otp_attempts
            });
        }

        // OTP is correct - verify user
        user.verification.is_verified = true;
        user.verification.otp = null;
        user.verification.otp_expiry = null;
        user.verification.otp_attempts = 0;
        user.verification.lock_until = null;
        user.verification.lock_count = 0;
        user.is_active = true;

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Account verified successfully',
            data: {
                user_id: user._id,
                email: user.email,
                name: `${user.first_name} ${user.last_name}`
            }
        });

    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify OTP',
            error: error.message
        });
    }
};

// Resend OTP
export const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.verification.is_verified) {
            return res.status(400).json({
                success: false,
                message: 'Account already verified'
            });
        }

        // Check if account is locked
        if (user.verification.lock_until && user.verification.lock_until > Date.now()) {
            const lockMessage = getLockMessage(user.verification.lock_until);
            return res.status(429).json({
                success: false,
                message: `Account is locked. ${lockMessage}`,
                lock_until: user.verification.lock_until
            });
        }

        // Generate new OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        user.verification.otp = otp;
        user.verification.otp_expiry = otpExpiry;
        user.verification.otp_attempts = 0; // Reset attempts

        await user.save();

        getOTPEmailTemplate(user.first_name,email, otp);
       

        res.status(200).json({
            success: true,
            message: 'New OTP sent successfully',
            data: {
                email: user.email,
                expires_in: '5 minutes'
            }
        });

    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resend OTP',
            error: error.message
        });
    }
};

// Login User
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if user is deleted
        if (user.is_deleted) {
            return res.status(403).json({
                success: false,
                message: 'Account has been deleted'
            });
        }

        // Check if account is active
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive. Please verify your email.'
            });
        }

        // Check if account is locked (due to OTP attempts)
        if (user.verification.lock_until && user.verification.lock_until > Date.now()) {
            const lockMessage = getLockMessage(user.verification.lock_until);
            return res.status(429).json({
                success: false,
                message: `Account is locked. ${lockMessage}`,
                lock_until: user.verification.lock_until
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update last login
        user.last_login = new Date();
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user._id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    role: user.role,
                    profile_img: user.profile_img
                },
                token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to login',
            error: error.message
        });
    }
};

// Update Profile
export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id; // From auth middleware
        const { first_name, last_name, gender, address_list } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update fields
        if (first_name) user.first_name = first_name;
        if (last_name) user.last_name = last_name;
        if (gender) user.gender = gender;
        if (address_list) user.address_list = address_list;

        // Handle profile image if uploaded
        if (req.file) {
            // Upload to cloud storage logic here
            // Example with Cloudinary
            // const result = await cloudinary.uploader.upload(req.file.path);
            // user.profile_img = { url: result.secure_url, public_id: result.public_id };
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: {
                    id: user._id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    gender: user.gender,
                    email: user.email,
                    profile_img: user.profile_img,
                    address_list: user.address_list
                }
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message
        });
    }
};

// Change Password (requires OTP verification)
export const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { current_password, new_password, otp } = req.body;

        if (!current_password || !new_password || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Current password, new password, and OTP are required'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(current_password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Check OTP lock
        if (user.verification.lock_until && user.verification.lock_until > Date.now()) {
            const lockMessage = getLockMessage(user.verification.lock_until);
            return res.status(429).json({
                success: false,
                message: `Account is locked. ${lockMessage}`,
                lock_until: user.verification.lock_until
            });
        }

        // Verify OTP
        if (user.verification.otp !== otp || user.verification.otp_expiry < Date.now()) {
            user.verification.otp_attempts += 1;

            if (user.verification.otp_attempts >= user.verification.max_otp_attempts) {
                const lockDuration = calculateLockDuration(user.verification.lock_count);
                user.verification.lock_until = new Date(Date.now() + lockDuration);
                user.verification.lock_count += 1;
                user.verification.otp_attempts = 0;
                await user.save();
                
                const lockMessage = getLockMessage(user.verification.lock_until);
                return res.status(429).json({
                    success: false,
                    message: `Too many failed attempts. ${lockMessage}`,
                    lock_until: user.verification.lock_until
                });
            }

            await user.save();
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP',
                attempts_remaining: user.verification.max_otp_attempts - user.verification.otp_attempts
            });
        }

        // Change password
        const hashedPassword = await bcrypt.hash(new_password, 10);
        user.password = hashedPassword;
        user.verification.otp = null;
        user.verification.otp_expiry = null;
        user.verification.otp_attempts = 0;
        user.verification.lock_until = null;

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password',
            error: error.message
        });
    }
};

// Send OTP for password change
export const sendPasswordChangeOTP = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if account is locked
        if (user.verification.lock_until && user.verification.lock_until > Date.now()) {
            const lockMessage = getLockMessage(user.verification.lock_until);
            return res.status(429).json({
                success: false,
                message: `Account is locked. ${lockMessage}`,
                lock_until: user.verification.lock_until
            });
        }

        // Generate OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        user.verification.otp = otp;
        user.verification.otp_expiry = otpExpiry;
        user.verification.otp_attempts = 0;

        await user.save();

        // Send OTP email
        const emailHtml = getOTPEmailTemplate(user.first_name, otp);
        await sendEmail({
            to: user.email,
            subject: 'OTP for Password Change - E-Shop',
            html: emailHtml
        });

        res.status(200).json({
            success: true,
            message: 'OTP sent to your registered email',
            data: {
                email: user.email,
                expires_in: '10 minutes'
            }
        });

    } catch (error) {
        console.error('Send password change OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send OTP',
            error: error.message
        });
    }
};