import User from '../model/user_model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendEmail, generateOTP, getOTPEmailTemplate } from '../mail/all_mail_formate.js';
import { calculateLockDuration, getLockMessage } from '../utils/otpLock.js';
import { ValidEmail, ValidName, ValidGender, ValidPassword } from "../validation/all_validatiom.js"
import dotenv from 'dotenv';
import { allError } from "../middleware/errorhandling.js";
dotenv.config({ quiet: true });

const generateToken = (userId) => { return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' }); };

export const createAccount = async (req, res) => {
    try {
        const { first_name, last_name, gender, email, password } = req.body;

        if (!first_name) return res.status(400).json({ success: false, message: 'First name is required' });
        if (!last_name) return res.status(400).json({ success: false, message: 'Last name is required' });
        if (!gender) return res.status(400).json({ success: false, message: 'Gender is required' });
        if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
        if (!password) return res.status(400).json({ success: false, message: 'Password is required' });

        if (!ValidName(first_name)) return res.status(400).json({ success: false, message: 'Invalid first name' });
        if (!ValidName(last_name)) return res.status(400).json({ success: false, message: 'Invalid last name' });
        if (!ValidGender(gender)) return res.status(400).json({ success: false, message: 'Invalid gender' });
        if (!ValidEmail(email)) return res.status(400).json({ success: false, message: 'Invalid email' });
        if (!ValidPassword(password)) return res.status(400).json({ success: false, message: 'Invalid password' });

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) return res.status(400).json({ success: false, message: 'Email already registered' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

        const user = User.create({
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

        getOTPEmailTemplate(first_name, email, otp);

        res.status(201).json({ success: true, message: 'Account created successfully. Please verify your email with OTP.', data: { user_id: user._id, email: user.email, name: `${first_name} ${last_name}` } });

    }
    catch (error) { allError(error, res); }
};

export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.verification.is_verified) return res.status(400).json({ success: false, message: 'Account already verified' });

        if (user.verification.lock_until && user.verification.lock_until > Date.now()) return res.status(429).json({ success: false, message: `Account is locked. ${getLockMessage(user.verification.lock_until)}`, lock_until: user.verification.lock_until });

        if (user.verification.otp_expiry < Date.now()) return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new OTP.' });

        if (user.verification.otp !== otp) {
            user.verification.otp_attempts += 1;

            if (user.verification.otp_attempts >= user.verification.max_otp_attempts) {
                const lockDuration = calculateLockDuration(user.verification.lock_count);
                user.verification.lock_until = new Date(Date.now() + lockDuration);
                user.verification.lock_count += 1;
                user.verification.otp_attempts = 0;
                await user.save();
                return res.status(429).json({ success: false, message: `Too many failed attempts. ${getLockMessage(user.verification.lock_until)}`, lock_until: user.verification.lock_until, attempts_remaining: 0 });
            }

            await user.save();
            return res.status(400).json({ success: false, message: 'Invalid OTP', attempts_remaining: user.verification.max_otp_attempts - user.verification.otp_attempts });
        }

        user.verification.is_verified = true;
        user.verification.otp = null;
        user.verification.otp_expiry = null;
        user.verification.otp_attempts = 0;
        user.verification.lock_until = null;
        user.verification.lock_count = 0;
        user.is_active = true;

        await user.save();

        res.status(200).json({ success: true, message: 'Account verified successfully', data: { user_id: user._id, email: user.email, name: `${user.first_name} ${user.last_name}` } });

    }
    catch (error) { allError(error, res); }

};

export const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.verification.is_verified) return res.status(400).json({ success: false, message: 'Account already verified' });

        if (user.verification.lock_until && user.verification.lock_until > Date.now()) return res.status(429).json({ success: false, message: `Account is locked. ${getLockMessage(user.verification.lock_until)}`, lock_until: user.verification.lock_until });

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        user.verification.otp = otp;
        user.verification.otp_expiry = otpExpiry;
        user.verification.otp_attempts = 0;

        await user.save();

        getOTPEmailTemplate(user.first_name, email, otp);

        res.status(200).json({ success: true, message: 'New OTP sent successfully', data: { email: user.email, expires_in: '5 minutes' } });

    }
    catch (error) { allError(error, res); }

};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        if (user.is_deleted) return res.status(403).json({ success: false, message: 'Account has been deleted' });

        if (!user.is_active) return res.status(403).json({ success: false, message: 'Account is inactive. Please verify your email.' });

        if (user.verification.lock_until && user.verification.lock_until > Date.now()) return res.status(429).json({ success: false, message: `Account is locked. ${getLockMessage(user.verification.lock_until)}`, lock_until: user.verification.lock_until });

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        user.last_login = new Date();
        await user.save();

        const token = generateToken(user._id);

        res.status(200).json({ success: true, message: 'Login successful', data: { user: { id: user._id, first_name: user.first_name, last_name: user.last_name, email: user.email, role: user.role, profile_img: user.profile_img }, token } });

    }
    catch (error) { allError(error, res); }

};

export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { first_name, last_name, gender, address_list } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (first_name) user.first_name = first_name;
        if (last_name) user.last_name = last_name;
        if (gender) user.gender = gender;
        if (address_list) user.address_list = address_list;

        if (req.file) {
            // Upload to cloud storage logic here
        }

        await user.save();

        res.status(200).json({ success: true, message: 'Profile updated successfully', data: { user: { id: user._id, first_name: user.first_name, last_name: user.last_name, gender: user.gender, email: user.email, profile_img: user.profile_img, address_list: user.address_list } } });

    }
    catch (error) { allError(error, res); }

};

export const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { current_password, new_password, otp } = req.body;

        if (!current_password || !new_password || !otp) return res.status(400).json({ success: false, message: 'Current password, new password, and OTP are required' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const isPasswordValid = await bcrypt.compare(current_password, user.password);
        if (!isPasswordValid) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

        if (user.verification.lock_until && user.verification.lock_until > Date.now()) return res.status(429).json({ success: false, message: `Account is locked. ${getLockMessage(user.verification.lock_until)}`, lock_until: user.verification.lock_until });

        if (user.verification.otp !== otp || user.verification.otp_expiry < Date.now()) {
            user.verification.otp_attempts += 1;

            if (user.verification.otp_attempts >= user.verification.max_otp_attempts) {
                const lockDuration = calculateLockDuration(user.verification.lock_count);
                user.verification.lock_until = new Date(Date.now() + lockDuration);
                user.verification.lock_count += 1;
                user.verification.otp_attempts = 0;
                await user.save();
                return res.status(429).json({ success: false, message: `Too many failed attempts. ${getLockMessage(user.verification.lock_until)}`, lock_until: user.verification.lock_until });
            }

            await user.save();
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP', attempts_remaining: user.verification.max_otp_attempts - user.verification.otp_attempts });
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        user.password = hashedPassword;
        user.verification.otp = null;
        user.verification.otp_expiry = null;
        user.verification.otp_attempts = 0;
        user.verification.lock_until = null;

        await user.save();

        res.status(200).json({ success: true, message: 'Password changed successfully' });

    }
    catch (error) { allError(error, res); }
};

export const sendPasswordChangeOTP = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.verification.lock_until && user.verification.lock_until > Date.now()) return res.status(429).json({ success: false, message: `Account is locked. ${getLockMessage(user.verification.lock_until)}`, lock_until: user.verification.lock_until });

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        user.verification.otp = otp;
        user.verification.otp_expiry = otpExpiry;
        user.verification.otp_attempts = 0;

        await user.save();

        const emailHtml = getOTPEmailTemplate(user.first_name, otp);
        await sendEmail({ to: user.email, subject: 'OTP for Password Change - E-Shop', html: emailHtml });

        res.status(200).json({ success: true, message: 'OTP sent to your registered email', data: { email: user.email, expires_in: '10 minutes' } });

    }
    catch (error) { allError(error, res); }
};