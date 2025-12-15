const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors'); // CORS middleware

const User = require('./models/User');

const userRoutes = require('./routes/userRoutes');
const tokenRoutes = require('./routes/tokenRoutes');
const pointRoutes = require('./routes/pointRoutes');

dotenv.config();

const app = express();

// 🔥 FIX 1: CORS Policy ko lax (loose) karein taaki sabhi origins (Frontend) access kar saken
app.use(cors({
    origin: '*', // Sabhi origins ko allow karo (Deployment ke liye zaroori)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());


// ================= ADMIN INITIALIZATION =================
const initializeAdmins = async () => {
    // ... (This function is already correct)
    try {
        const admins = [
          {
            username: process.env.ADMIN1_USERNAME || 'admin1',
            password: process.env.ADMIN1_PASSWORD || 'Admin@123',
            fullName: 'Admin One',
          },
          {
            username: process.env.ADMIN2_USERNAME || 'admin2',
            password: process.env.ADMIN2_PASSWORD || 'Admin@123',
            fullName: 'Admin Three',
          },
        ];
    
        for (const admin of admins) {
          const exists = await User.findOne({ username: admin.username });
    
          if (!exists) {
            await User.create({
              username: admin.username,
              password: admin.password, 
              role: 'admin',
              fullName: admin.fullName,
            });
    
            console.log(`✅ Admin created: ${admin.username}`);
          } else {
            console.log(`ℹ️ Admin already exists: ${admin.username}`);
          }
        }
      } catch (err) {
        console.error('❌ Admin initialization error:', err.message);
      }
};
// =======================================================


// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, { dbName: 'valetparking_db' })
  .then(async () => {
    console.log('✅ MongoDB connected successfully.');
    await initializeAdmins(); 
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/points', pointRoutes);

app.get('/', (req, res) => {
  res.send('Valet Parking Backend Running!');
});

// 🔥 FIX 2: PORT variable ko Railway se use karein
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
