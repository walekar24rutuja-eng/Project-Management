const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getMentors, 
  updateProfile,
  deleteAccount
} = require('../controllers/authController');

// Destructure protect from the exported object
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/mentors', getMentors);
router.put('/profile', protect, updateProfile);
router.delete('/account', protect, deleteAccount);

module.exports = router;