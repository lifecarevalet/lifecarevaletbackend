// Point.js (FINAL & CORRECTED VERSION)
const mongoose = require('mongoose');

const PointSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    address: { type: String }, // <-- 'required: true' Hata diya gaya hai
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Point', PointSchema);
