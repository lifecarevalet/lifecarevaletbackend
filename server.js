const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors'); 
const userRoutes = require('./routes/userRoutes');
const tokenRoutes = require('./routes/tokenRoutes');
const pointRoutes = require('./routes/pointRoutes');

dotenv.config();

const app = express();

app.use(cors()); 
app.use(express.json()); 

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes Setup
app.use('/api/users', userRoutes);
app.use('/api/tokens', tokenRoutes); 
app.use('/api/points', pointRoutes); 

app.get('/', (req, res) => {
    res.send('Valet Parking Backend Running!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
