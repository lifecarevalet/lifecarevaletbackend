// Original function:
UserSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Change for testing/fixing:
UserSchema.methods.comparePassword = function (candidatePassword) {
    console.log('--- Attempting Password Comparison ---');
    console.log('Candidate Password:', candidatePassword);
    console.log('Stored Hash:', this.password);
    
    // Check if passwords match (Original logic)
    const isMatch = bcrypt.compare(candidatePassword, this.password);
    
    // If comparison fails, maybe the initial hash was incorrect. 
    // Return the original comparison result.
    return isMatch; 

    // **Alternative Test: Agar aapko turant login check karna hai toh is line ko uncomment karein**
    // return true; 
};
