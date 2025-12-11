const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Aapke package.json mein bcryptjs hai

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['owner', 'manager', 'driver'], required: true },
    fullName: { type: String, default: '' },
    contactNumber: { type: String, default: '' },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    pointId: { type: mongoose.Schema.Types.ObjectId, ref: 'Point', default: null } // Location assignment
});

// PASSWORD HASHING BEFORE SAVING (Pre-save hook)
// Yeh function naye user ko save karte waqt password ko hash karta hai.
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10); // Hashing rounds: 10
    next();
});

// PASSWORD COMPARISON METHOD (Async fix - MUST be async due to await in userRoutes.js)
// Yeh function login ke waqt password compare karta hai.
UserSchema.methods.comparePassword = async function (candidatePassword) {
    // We use await because bcrypt.compare is an asynchronous operation
    return await bcrypt.compare(candidatePassword, this.password);
};

// Model Export (Yahan collection ka naam explicitly dene ki zarurat nahi hai kyunki woh fix ho chuka hai)
module.exports = mongoose.model('User', UserSchema);
