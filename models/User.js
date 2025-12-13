// models/User.js (FINAL UPDATED CODE)

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); 

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['owner', 'manager', 'driver'], required: true },
    fullName: { type: String, default: '' },
    contactNumber: { type: String, default: '' },
    
    // Manager/Driver ke liye, yeh field zaroori hai (Route validation se enforce hoga)
    pointId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Point', 
        // Note: Default null hata diya gaya hai, validation routes mein hogi.
    },
    
    // Driver ke liye Manager ID
    managerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        // Note: Default null hata diya gaya hai, validation routes mein hogi.
    },
    
});

// PASSWORD HASHING BEFORE SAVING
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10); 
    next();
});

// Password Comparison Method
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
