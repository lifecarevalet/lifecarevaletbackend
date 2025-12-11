const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// models/User.js (ONLY FOR TESTING)
UserSchema.methods.comparePassword = async function (candidatePassword) {
    // THIS IS A TEMPORARY TEST! 
    // It forces the login check to pass regardless of the password.
    return true; 
};
    role: { type: String, enum: ['owner', 'manager', 'driver'], required: true },
    fullName: { type: String, default: '' },
    contactNumber: { type: String, default: '' },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    pointId: { type: mongoose.Schema.Types.ObjectId, ref: 'Point', default: null } // Location assignment
});

// PASSWORD HASHING BEFORE SAVING (Pre-save hook)
UserSchema.pre('save', async function (next) {
    // Check if the password field has been modified (new user or password reset)
    if (!this.isModified('password')) return next();
    
    // Hash the password
    this.password = await bcrypt.hash(this.password, 10); 
    next();
});

// PASSWORD COMPARISON METHOD (Async function for login check)
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Model Export (Final fix: removed third argument to avoid namespace error, since connection is fixed)
module.exports = mongoose.model('User', UserSchema); 
