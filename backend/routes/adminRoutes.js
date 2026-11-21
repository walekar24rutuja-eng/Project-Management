const express = require('express');
const { getOverview, createMentor, assignMentor } = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect, authorizeRoles('ADMIN'));

router.get('/overview', getOverview);
router.post('/mentors', createMentor);
router.put('/projects/:projectId/mentor', assignMentor);

module.exports = router;
