// PointRoutes.js (FINAL & CORRECTED VERSION)

// ... (Baaki code)

// ------------------- ADMIN/OWNER: CREATE POINT (Hotel/Location) -------------------
router.post('/admin/create', protect, authorize(['admin']), async (req, res) => {
    try {
        const { name, address } = req.body;
        const ownerId = req.user.id; 

        const point = await Point.create({ name, address, ownerId });

        res.status(201).json({ 
            success: true, 
            point: point, 
            message: `Location '${point.name}' created. ID: ${point._id}` 
        });
    } catch (error) {
        // Step A: Mongoose Validation Errors (Jaise agar 'name' empty bheja gaya ho)
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        
        // Step B: Unique Index Error (Location Name already exists)
        if (error.code === 11000) return res.status(400).json({ message: 'Location Name already exists.' });
        
        console.error('Point creation error:', error);
        // Step C: Generic 500 Server Error
        res.status(500).json({ message: 'Error creating location point.', details: error.message });
    }
});
// ... (Baaki code - ensure DELETE route is UN-COMMENTED now)
