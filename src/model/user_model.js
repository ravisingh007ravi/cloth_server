import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    profile_img: {
        url: { type: String, default: '' },
        public_id: { type: String, default: '' }
    },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    is_active: { type: Boolean, default: true },
    is_deleted: { type: Boolean, default: false },
    address_list: [{
        address_type: { type: String, enum: ['home', 'work', 'other'] },
        address_line1: { type: String, required: true },
        address_line2: { type: String },
        city: { type: String, required: true },
        state: { type: String, required: true },
        country: { type: String, required: true },
        pincode: { type: String, required: true },
        is_default: { type: Boolean, default: false }
    }],
    verification: {
        otp: { type: String },
        otp_expiry: { type: Date },
        is_verified: { type: Boolean, default: false },
        otp_attempts: { type: Number, default: 0 },
        max_otp_attempts: { type: Number, default: 3 },
        lock_until: { type: Date },
        lock_count: { type: Number, default: 0 },
        lock_durations: [
            { type: Number, default: 60000 } // 1 minute in milliseconds
        ]
    },
    order_list: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    cart_list: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cart' }],
    reset_password_token: { type: String },
    reset_password_expiry: { type: Date },
    last_login: { type: Date }
}, {
    timestamps: true
});




export default mongoose.model('User', userSchema);