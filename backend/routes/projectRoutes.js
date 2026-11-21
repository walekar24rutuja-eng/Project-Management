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
  scheduleReview,
  getNotifications,
  deleteScheduledReview,
  updateProjectDetails,
  markNotificationRead
} = require('../controllers/projectController');
const {
  getPendingReviews,
  getProjectDetails,
  getProjectProgress,
  reviewMilestone,
  startMilestone,
  submitMilestone
} = require('../controllers/projectProgressController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const uploadReport = require('../middleware/reportUpload');

router.use(protect);

router.get('/', getProjects);
router.get('/notifications', authorizeRoles('STUDENT', 'MENTOR'), getNotifications);
router.put('/notifications/:notificationId/read', authorizeRoles('STUDENT', 'MENTOR'), markNotificationRead);
router.get('/mentor/pending-reviews', authorizeRoles('MENTOR'), getPendingReviews);
router.get('/my-requests', authorizeRoles('STUDENT'), getMyJoinRequests);
router.get('/:id/progress', getProjectProgress);
router.get('/:id', getProjectDetails);
router.put('/:id/details', authorizeRoles('STUDENT'), updateProjectDetails);
router.put('/:id/progress/milestones/:milestoneKey/start', authorizeRoles('STUDENT'), startMilestone);
router.post('/:id/progress/milestones/:milestoneKey/submissions', authorizeRoles('STUDENT'), submitMilestone);
router.put('/:id/progress/milestones/:milestoneKey/review', authorizeRoles('MENTOR'), reviewMilestone);
router.get('/:id/report', downloadProjectReport);
router.post('/', authorizeRoles('STUDENT'), createProject);
router.post('/join', authorizeRoles('STUDENT'), requestToJoinProject);
router.put('/:id/members/:studentId', authorizeRoles('STUDENT'), decideJoinRequest);
router.post('/:id/report', authorizeRoles('STUDENT'), uploadReport, uploadProjectReport);
router.put('/:id/submit', authorizeRoles('STUDENT'), submitProject);
router.put('/:id/resubmit', authorizeRoles('STUDENT'), resubmitProject);
router.put('/:id/review', authorizeRoles('MENTOR'), reviewProject);
router.post('/:id/reviews', authorizeRoles('MENTOR'), scheduleReview);
router.delete('/:id/reviews/:reviewId', authorizeRoles('MENTOR'), deleteScheduledReview);

module.exports = router;