const express = require('express');
const router = express.Router();
const { 
  createProject,
  requestToJoinProject,
  getMyJoinRequests,
  decideJoinRequest,
  submitProject,
  uploadProjectReport,
  downloadProjectReport,
  getProjects,
  reviewProject,
  resubmitProject,
  assignTask,
  getProjectTasks,
  updateTaskFollowUp,
  updateTaskStatus,
  scheduleReview,
  getNotifications,
  deleteScheduledReview
} = require('../controllers/projectController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const uploadReport = require('../middleware/reportUpload');

router.use(protect);

router.get('/', getProjects);
router.get('/my-requests', authorizeRoles('STUDENT'), getMyJoinRequests);
router.get('/:id/report', downloadProjectReport);
router.post('/', authorizeRoles('STUDENT'), createProject);
router.post('/join', authorizeRoles('STUDENT'), requestToJoinProject);
router.put('/:id/members/:studentId', authorizeRoles('STUDENT'), decideJoinRequest);
router.post('/:id/report', authorizeRoles('STUDENT'), uploadReport, uploadProjectReport);
router.put('/:id/submit', authorizeRoles('STUDENT'), submitProject);
router.put('/:id/resubmit', authorizeRoles('STUDENT'), resubmitProject);
router.put('/:id/review', authorizeRoles('MENTOR'), reviewProject);
router.post('/:id/tasks', authorizeRoles('MENTOR'), assignTask);
router.get('/:id/tasks', getProjectTasks);
router.put('/tasks/:taskId/followup', authorizeRoles('STUDENT'), updateTaskFollowUp);
router.put('/tasks/:taskId/status', authorizeRoles('MENTOR'), updateTaskStatus);
router.post('/:id/reviews', authorizeRoles('MENTOR'), scheduleReview);
router.delete('/:id/reviews/:reviewId', authorizeRoles('MENTOR'), deleteScheduledReview);
router.get('/notifications', authorizeRoles('STUDENT'), getNotifications);

module.exports = router;