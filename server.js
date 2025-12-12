const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors'); 
// --- REQUIRED LIBRARIES ---
const bcrypt = require('bcryptjs'); // Still needed if other files use it
const User = require('./models/User'); 
// --------------------------

const userRoutes = require('./routes/userRoutes');
const tokenRoutes = require('./routes/tokenRoutes');
const pointRoutes = require('./routes/pointRoutes');

dotenv.config();

const app = express();

app.use(cors()); 
app.use(express.json()); 

// --- OWNER INITIALIZATION FUNCTION (CRITICAL FIX APPLIED) ---
const initializeOwner = async () => {
    try {
        const ownerExists = await User.findOne({ username: 'owneradmin' });

        if (!ownerExists) {
            // ✅ FIX: Manual Hashing Removed. Ab yeh User.js ke pre('save') hook par nirbhar karega.
            const newOwner = new User({
                username: 'owneradmin', 
                password: 'valet123', // Unhashed password passed to the model
                role: 'owner',
                fullName: 'Main Owner'
            });
            await newOwner.save(); // <-- Hook will execute and hash the password here
            console.log('✅ Default Owner created: Username: owneradmin / Password: valet123');
        } else {
            console.log('💡 Owner already exists.');
        }
    } catch (error) {
        console.error('❌ Error during Owner initialization:', error.message);
    }
};
// --------------------------------------------------------


// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    dbName: 'valetparking_db'
})
    .then(() => {
        console.log('✅ MongoDB connected successfully.');
        initializeOwner(); // Server connect hote hi Owner ko check aur create karo
    })
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes Setup
app.use('/api/users', userRoutes);
app.use('/api/tokens', tokenRoutes); 
app.use('/api/points', pointRoutes); 

app.get('/', (req, res) => {
    res.send('Valet Parking Backend Running!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
