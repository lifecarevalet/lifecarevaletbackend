// routes/pointRoutes.js (FIXED /admin/create route)

// ... (Other imports and code)

// ------------------- ADMIN/OWNER: CREATE POINT (Hotel/Location) -------------------
// POST /api/points/admin/create
router.post('/admin/create', protect, authorize(['admin']), async (req, res) => {
    try {
        const { name, address } = req.body;
        const ownerId = req.user.id; 

        // name field required होने के कारण, Mongoose validation error आ सकता है।
        const point = await Point.create({ name, address, ownerId });

        res.status(201).json({ 
            success: true, 
            point: point, 
            message: `Location '${point.name}' created. ID: ${point._id}` 
        });
    } catch (error) {
        // IMPROVEMENT: Mongoose Validation Errors के लिए 400 status code और specific message दें
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        
        // UNIQUE index error (Point Name already exists)
        if (error.code === 11000) return res.status(400).json({ message: 'Location Name already exists.' });
        
        console.error('Point creation error:', error);
        // Generic 500 error for all other issues
        res.status(500).json({ message: 'Error creating location point.', details: error.message });
    }
});

// ... (Rest of the code)
