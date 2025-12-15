const registerUser = async (req, res) => {
    try {
        // Sirf woh fields nikalein jo form mein hain
        const { username, password, fullName, pointId } = req.body;
        
        // Yeh fields form se nahi aa rahe honge, isliye inhe undefined/default rakhenge
        const contactNumber = req.body.contactNumber; // Agar form mein hai toh theek, varna undefined
        const managerId = req.body.managerId; // Manager create karte samay yeh nahi aayega
        const role = req.body.role || 'manager'; // Agar role nahi aaya, toh use 'manager' maan lo

        // 1. Mandatory Fields Check (Ab sirf username aur password required hai)
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and Password are required fields.' });
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
        
        // 4. Safe Data Construction
        const createData = {
            username,
            password,
            role: cleanedRole, 
            fullName: fullName || '', 
            contactNumber: contactNumber || '', // Agar form se nahi aaya toh '' (empty string)
        };
        
        // PointId aur ManagerId ko sirf tabhi shamil karein jab woh valid ObjectId ki length ke hon (24 characters)
        // Ya agar PointId select karna compulsory hai, toh woh valid ID hi honi chahiye
        if (pointId && pointId.length === 24) createData.pointId = pointId;
        // Manager ID Manager ke liye nahi chahiye
        if (managerId && managerId.length === 24) createData.managerId = managerId;
        
        // 5. User Create
        const user = await User.create(createData);

        const userResponse = await User.findById(user._id).select('-password');

        res.status(201).json({ 
            success: true, 
            user: userResponse, 
            message: `${role} '${fullName || username}' created successfully.` 
        });

    } catch (error) {
        // ... Error Handling (Same as before)
        if (error.name === 'ValidationError') {
             const messages = Object.values(error.errors).map(val => val.message);
             return res.status(400).json({ message: messages.join(', ') });
        }
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Duplicate key error: User with this username already exists.' });
        }
        
        console.error('User registration error:', error);
        res.status(500).json({ message: 'Internal Server Error: Could not register user.' });
    }
};
// End of registerUser function
