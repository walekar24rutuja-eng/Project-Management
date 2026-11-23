const express = require('express');
const {
  getOverview,
  createMentor,
  assignMentor,
  updateStudentDepartment,
  deleteStudent,
  deleteProject
} = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect, authorizeRoles('ADMIN'));

router.get('/overview', getOverview);
router.post('/mentors', createMentor);
router.put('/projects/:projectId/mentor', assignMentor);
router.put('/students/:studentId/department', updateStudentDepartment);
router.delete('/students/:studentId', deleteStudent);
router.delete('/projects/:projectId', deleteProject);

module.exports = router;
