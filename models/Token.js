const mongoose = require('mongoose');

const TokenSchema = new mongoose.Schema({
    tokenNumber: { type: Number, required: true, unique: true },
    carNumber: { type: String, required: true },
    customerName: { type: String, default: 'N/A' },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    driverRole: { type: String, enum: ['manager', 'driver'], required: true },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    pointId: { type: mongoose.Schema.Types.ObjectId, ref: 'Point', required: true }, // Jis location pe token generate hua
    inTime: { type: Date, default: Date.now },
    outTime: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
});

// TTL Index for 7-Day Deletion
TokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 }); 

module.exports = mongoose.model('Token', TokenSchema);
