const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['owner', 'manager', 'driver'], required: true },
    fullName: { type: String, default: '' },
    contactNumber: { type: String, default: '' },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    pointId: { type: mongoose.Schema.Types.ObjectId, ref: 'Point', default: null } // Location assignment
});

UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10); 
    next();
});

UserSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema, 'users'); 
