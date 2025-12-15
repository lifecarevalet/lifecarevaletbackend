// PointRoutes.js (Deployment Fix)
router.delete('/admin/delete/:id', protect, authorize(['admin']), async (req, res) => {
    const pointId = req.params.id; 
    try {
        const point = await Point.findByIdAndDelete(pointId);

        if (!point) {
            return res.status(404).json({ message: 'Location not found.' });
        }

        // 🚨 PROBLEM AREA: Is block ko comment out karein
        /*
        await User.updateMany( 
            { pointId: pointId },
            { $set: { pointId: null, managerId: null } }
        );
        */

        res.status(200).json({ message: 'Location deleted successfully.' });
    } catch (error) {
        // ... (catch block)
    }
});
