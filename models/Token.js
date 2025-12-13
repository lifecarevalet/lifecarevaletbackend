// models/Token.js (FINAL UPDATED CODE)

const mongoose = require('mongoose');

const TokenSchema = new mongoose.Schema({
    tokenNumber: { type: Number, required: true }, 
    carNumber: { type: String, required: true },
    customerName: { type: String, default: 'N/A' },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    driverRole: { type: String, enum: ['manager', 'driver'], required: true },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    pointId: { type: mongoose.Schema.Types.ObjectId, ref: 'Point', required: true },
    inTime: { type: Date, default: Date.now },
    outTime: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
});

// Compound Index
TokenSchema.index({ pointId: 1, tokenNumber: 1 }, { unique: true });

// TTL Index for 7-Day Deletion
TokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 }); 

module.exports = mongoose.model('Token', TokenSchema);
