// User.js file mein yeh badlav karein:
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); 

// ✅ FIX: 'new' ko ek baar hataya gaya
const UserSchema = new mongoose.Schema({ 
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['owner', 'manager', 'driver'], required: true },
    fullName: { type: String, default: '' },
    contactNumber: { type: String, default: '' },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    pointId: { type: mongoose.Schema.Types.ObjectId, ref: 'Point', default: null } 
});

// PASSWORD HASHING BEFORE SAVING
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10); 
    next();
});

// MatchPassword method (jo pichle message mein fix kiya tha)
UserSchema.methods.matchPassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
