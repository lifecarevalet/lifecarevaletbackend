// userRoutes.js file mein sirf is function ko badlein
const registerUser = async (req, res) => {
    try {
        const { username, password, role, fullName, contactNumber, pointId, managerId } = req.body;

        // 1. Mandatory Fields Check
        if (!username || !password || !role) {
            return res.status(400).json({ message: 'Username, Password, and Role are required fields.' });
        }
        
        // 2. Role Validation and Cleaning
        const cleanedRole = role.toLowerCase().trim();
        if (!['manager', 'driver'].includes(cleanedRole)) {
            return res.status(400).json({ message: 'Invalid role for registration. Only Manager and Driver allowed.' });
        }

        // 3. Duplicate User Check
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'User with this username already exists.' });
        }
        
        // 4. Safe Data Construction (Mongoose Cast Error Se Bachne Ke Liye)
        const createData = {
            username,
            password,
            role: cleanedRole, 
            fullName: fullName || '', // Default to empty string if missing
            contactNumber: contactNumber || '', // Default to empty string if missing
        };
        
        // PointId aur ManagerId ko sirf tabhi shamil karein jab woh valid ObjectId ki length ke hon (24 characters)
        // Taki Mongoose Cast Error (500) se bacha ja sake.
        if (pointId && pointId.length === 24) createData.pointId = pointId; 
        if (managerId && managerId.length === 24) createData.managerId = managerId;
        
        // 5. User Create (Yeh ab sabse zyada safe hai)
        const user = await User.create(createData);

        const userResponse = await User.findById(user._id).select('-password');

        res.status(201).json({ 
            success: true, 
            user: userResponse, 
            message: `${role} '${fullName || username}' created successfully.` 
        });

    } catch (error) {
        // Validation Error (Mongoose's built-in error)
        if (error.name === 'ValidationError') {
             const messages = Object.values(error.errors).map(val => val.message);
             return res.status(400).json({ message: messages.join(', ') });
        }
        // Duplicate Key Error (Username ka unique index)
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Duplicate key error: User with this username already exists.' });
        }
        
        // Final fallback 500
        console.error('User registration error:', error);
        res.status(500).json({ message: 'Internal Server Error: Could not register user.' });
    }
};
