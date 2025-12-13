const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); 

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['owner', 'manager', 'driver'], required: true },
    fullName: { type: String, default: '' },
    contactNumber: { type: String, default: '' },

    // Location/Point assignment
    pointId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Point', 
    },

    // Driver ke liye Manager ID
    managerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
    },

}, {
    timestamps: true
});

// PASSWORD HASHING BEFORE SAVING
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10); // Salt generate kiya gaya
    this.password = await bcrypt.hash(this.password, salt); // Salt ke saath hash kiya gaya
    next();
});

// ✅ FIX: Password Comparison Method ka naam 'matchPassword' kiya gaya
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
