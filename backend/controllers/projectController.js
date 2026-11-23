const mongoose = require('mongoose');
const crypto = require('node:crypto');
const { createReadStream } = require('node:fs');
const path = require('node:path');
const Project = require('../models/Project');
const User = require('../models/User');
const Notification = require('../models/Notification');
const {
  buildInitialProgress,
  calculateProgress,
  initializeApprovedProject
} = require('../services/projectProgressService');
const {
  createProjectNotifications,
  getProjectStudentIds
} = require('../services/projectNotificationService');
const {
  canAccessProject,
  canReviewProject,
  canSubmitProject,
  canUploadProjectReport,
  getSubmissionStatus,
  isAssignedMentor,
  isOngoingProject,
  isProjectLeader
} = require('../utils/projectAccess');
const createProjectId = require('../utils/projectId');
const {
  deleteReportObject,
  getReportObject,
  putReportObject
} = require('../utils/cloudinaryReportStorage');
const {
  REPORTS_DIRECTORY,
  getReportExtension,
  getSafeOriginalName,
  isValidReportStorageName,
  isSupportedReportFile
} = require('../utils/reportFile');
const { removeStoredReport } = require('../utils/reportCleanup');

const isSameId = (first, second) => first?.toString() === second?.toString();
const populateProject = (query) => query
  .populate('leader', 'name email rollNumber')
  .populate('members.student', 'name email rollNumber')
  .populate('assignedMentor', 'name email')
  .populate('preferredMentor', 'name email');
const findProjectById = (id) => (
  mongoose.isValidObjectId(id) ? Project.findById(id) : null
);
const reserveActiveProject = async (studentId, projectId) => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const user = await User.findById(studentId).select('activeProject');
    if (!user) return { ok: false, newlyReserved: false };
    if (user.activeProject && isSameId(user.activeProject, projectId)) {
      return { ok: true, newlyReserved: false };
    }

    if (user.activeProject) {
      const currentProject = await Project.findById(user.activeProject).select('status');
      if (!currentProject || isOngoingProject(currentProject)) {
        return { ok: false, newlyReserved: false };
      }

      await User.updateOne(
        { _id: studentId, activeProject: user.activeProject },
        { $set: { activeProject: null } }
      );
      continue;
    }

    const ongoingProject = await Project.findOne({
      status: { $ne: 'APPROVED' },
      $or: [
        { leader: studentId },
        { student: studentId },
        { members: { $elemMatch: { student: studentId, status: 'ACCEPTED' } } }
      ]
    }).sort({ createdAt: -1 }).select('_id');
    if (ongoingProject) {
      const restored = await User.findOneAndUpdate(
        { _id: studentId, role: 'STUDENT', activeProject: null },
        { $set: { activeProject: ongoingProject._id } },
        { new: true }
      ).select('_id');
      if (!restored) continue;
      return {
        ok: isSameId(ongoingProject._id, projectId),
        newlyReserved: isSameId(ongoingProject._id, projectId)
      };
    }

    const reserved = await User.findOneAndUpdate(
      { _id: studentId, role: 'STUDENT', activeProject: null },
      { $set: { activeProject: projectId } },
      { new: true }
    ).select('_id');
    if (reserved) return { ok: true, newlyReserved: true };
  }

  const user = await User.findById(studentId).select('activeProject');
  return {
    ok: isSameId(user?.activeProject, projectId),
    newlyReserved: false
  };
};

const releaseActiveProject = async (studentId, projectId) => {
  await User.updateOne(
    { _id: studentId, activeProject: projectId },
    { $set: { activeProject: null } }
  );
};

const isValidProjectLink = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

exports.getProjects = async (req, res) => {
  try {
    let query;
    if (req.user.role === 'ADMIN') {
      query = Project.find({});
    } else if (req.user.role === 'MENTOR') {
      query = Project.find({ assignedMentor: req.user.id });
    } else {
      query = Project.find({
        $or: [
          { leader: req.user.id },
          { student: req.user.id },
          { members: { $elemMatch: { student: req.user.id, status: 'ACCEPTED' } } }
        ]
      });
    }
    const projects = await populateProject(query.sort({ createdAt: -1 }));
    if (req.user.role !== 'ADMIN') {
      projects.forEach((project) => {
        if (req.user.role === 'MENTOR' || !isProjectLeader(project, req.user.id)) {
          project.members = project.members.filter((member) => member.status === 'ACCEPTED');
        } else {
          project.members = project.members.filter(
            (member) => member.status === 'ACCEPTED' || member.status === 'PENDING'
          );
        }
      });
    }
    res.json(projects.map((project) => {
      const progressSummary = calculateProgress(
        project.progress || buildInitialProgress()
      ).overall;
      const responseProject = project.toObject();
      delete responseProject.progress;
      return { ...responseProject, progressSummary };
    }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyJoinRequests = async (req, res) => {
  try {
    const projects = await Project.find({ 'members.student': req.user.id })
      .select('projectId topicName status members')
      .sort({ updatedAt: -1 });
    const requests = projects.flatMap((project) => project.members
      .filter((member) => isSameId(member.student, req.user.id) && member.status !== 'ACCEPTED')
      .map((member) => ({
        projectId: project.projectId,
        topicName: project.topicName,
        projectStatus: project.status,
        status: member.status,
        requestedAt: member.requestedAt
      })));
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createProject = async (req, res) => {
  let projectObjectId;
  let reserved = false;
  try {
    const { topicName, preferredMentor } = req.body;
    if (typeof topicName !== 'string' || !topicName.trim()) {
      return res.status(400).json({ message: 'Project topic is required' });
    }

    const leader = await User.findById(req.user.id).select('name rollNumber department');
    if (!leader) return res.status(404).json({ message: 'Student account not found' });
    if (!leader.rollNumber?.trim()) {
      return res.status(400).json({ message: 'Add your roll number to your profile before creating a project' });
    }

    if (preferredMentor) {
      if (!mongoose.isValidObjectId(preferredMentor)) {
        return res.status(400).json({ message: 'Select a valid preferred mentor' });
      }
      const mentor = await User.findOne({ _id: preferredMentor, role: 'MENTOR' }).select('_id department');
      if (!mentor) return res.status(400).json({ message: 'Select a valid preferred mentor' });
      if (leader.department && mentor.department !== leader.department) {
        return res.status(400).json({ message: 'Preferred mentor must be from your department' });
      }
    }
    projectObjectId = new mongoose.Types.ObjectId();
    const reservation = await reserveActiveProject(req.user.id, projectObjectId);
    if (!reservation.ok) {
      return res.status(409).json({ message: 'You already have an ongoing project' });
    }
    reserved = true;

    let projectId = createProjectId();
    while (await Project.exists({ projectId })) {
      projectId = createProjectId();
    }

    const project = await Project.create({
      _id: projectObjectId,
      projectId,
      topicName: topicName.trim(),
      groupMembers: leader.name,
      rollNumbers: leader.rollNumber || '',
      leader: req.user.id,
      student: req.user.id,
      preferredMentor: preferredMentor || null,
      status: 'DRAFT'
    });
    reserved = false;
    res.status(201).json(await populateProject(Project.findById(project._id)));
  } catch (error) {
    if (reserved && projectObjectId) {
      await releaseActiveProject(req.user.id, projectObjectId);
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Could not generate a unique project ID. Please try again.' });
    }
    res.status(500).json({ message: error.message });
  }
};

exports.requestToJoinProject = async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.user.id, role: 'STUDENT' }).select('rollNumber');
    if (!student) return res.status(404).json({ message: 'Student account not found' });
    if (!student.rollNumber?.trim()) {
      return res.status(400).json({ message: 'Add your roll number to your profile before requesting to join a project' });
    }

    if (typeof req.body.projectId !== 'string' || !req.body.projectId.trim()) {
      return res.status(400).json({ message: 'Project ID is required' });
    }
    const projectId = req.body.projectId.trim().toUpperCase();

    const project = await Project.findOne({ projectId });
    if (!project) return res.status(404).json({ message: 'No project exists with that ID' });
    if (isProjectLeader(project, req.user.id)) {
      return res.status(409).json({ message: 'You are already the leader of this project' });
    }

    const existing = project.members.find((member) => isSameId(member.student, req.user.id));
    if (existing) {
      return res.status(409).json({
        message: existing.status === 'PENDING'
          ? 'Your join request is already pending'
          : existing.status === 'ACCEPTED'
            ? 'You are already a member of this project'
            : 'Your request to join this project was rejected'
      });
    }

    const updatedProject = await Project.findOneAndUpdate(
      { _id: project._id, 'members.student': { $ne: req.user.id } },
      {
        $push: {
          members: {
            student: req.user.id,
            status: 'PENDING',
            requestedAt: new Date()
          }
        }
      },
      { new: true }
    );
    if (!updatedProject) {
      return res.status(409).json({ message: 'A join request already exists for this project' });
    }
    res.status(201).json({
      message: 'Join request sent to the project leader',
      projectId: updatedProject.projectId,
      status: 'PENDING'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.decideJoinRequest = async (req, res) => {
  let newlyReserved = false;
  let membershipUpdated = false;
  let project;
  try {
    const { status } = req.body;
    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Status must be ACCEPTED or REJECTED' });
    }

    project = await findProjectById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!isProjectLeader(project, req.user.id)) {
      return res.status(403).json({ message: 'Only this project’s leader can manage join requests' });
    }

    const member = project.members.find(
      (entry) => isSameId(entry.student, req.params.studentId) && entry.status === 'PENDING'
    );
    if (!member) return res.status(404).json({ message: 'Pending join request not found' });

    if (status === 'ACCEPTED' && project.status !== 'APPROVED') {
      const reservation = await reserveActiveProject(member.student, project._id);
      if (!reservation.ok) {
        return res.status(409).json({ message: 'This student already has another ongoing project' });
      }
      newlyReserved = reservation.newlyReserved;
    }

    const result = await Project.updateOne(
      {
        _id: project._id,
        members: { $elemMatch: { student: member.student, status: 'PENDING' } }
      },
      {
        $set: {
          'members.$.status': status,
          'members.$.decidedAt': new Date()
        }
      }
    );
    if (!result.modifiedCount) {
      if (newlyReserved) await releaseActiveProject(member.student, project._id);
      return res.status(409).json({ message: 'This join request has already been processed' });
    }
    membershipUpdated = true;

    if (status === 'ACCEPTED' && project.status !== 'APPROVED') {
      const currentProject = await Project.findById(project._id).select('status');
      if (currentProject?.status === 'APPROVED') {
        await releaseActiveProject(member.student, project._id);
      }
    }

    if (status === 'REJECTED' && isSameId(
      (await User.findById(member.student).select('activeProject'))?.activeProject,
      project._id
    )) {
      await releaseActiveProject(member.student, project._id);
    }

    res.json({ message: `Join request ${status.toLowerCase()}` });
  } catch (error) {
    if (newlyReserved && project && !membershipUpdated) {
      const memberId = req.params.studentId;
      await releaseActiveProject(memberId, project._id);
    }
    res.status(500).json({ message: error.message });
  }
};

exports.submitProject = async (req, res) => {
  try {
    const project = await findProjectById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!isProjectLeader(project, req.user.id)) {
      return res.status(403).json({ message: 'Only this project’s leader can submit project links' });
    }
    if (!canSubmitProject(project)) {
      return res.status(409).json({ message: 'This project cannot be submitted in its current state' });
    }

    const { reportFilePath, topicName } = req.body;
    if (!reportFilePath || !isValidProjectLink(reportFilePath)) {
      return res.status(400).json({ message: 'Provide a valid HTTP or HTTPS project link' });
    }
    if (topicName !== undefined && typeof topicName !== 'string') {
      return res.status(400).json({ message: 'Project topic must be text' });
    }
    const previousReport = project.reportFile;
    if (topicName?.trim()) project.topicName = topicName.trim();
    project.reportFilePath = reportFilePath;
    project.reportFile = null;
    project.status = getSubmissionStatus(project);
    project.submittedAt = new Date();
    await project.save();
    await removeStoredReport(previousReport);
    if (project.assignedMentor) {
      await createProjectNotifications({
        project,
        recipients: [project.assignedMentor],
        actor: req.user.id,
        type: 'REPORT_SUBMITTED',
        title: 'Project submitted for review',
        message: `A project submission was updated for "${project.topicName}".`
      });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.resubmitProject = exports.submitProject;

exports.uploadProjectReport = async (req, res) => {
  let uploadedCloudinaryKey;
  try {
    if (!req.file) return res.status(400).json({ message: 'Select a report file to upload' });
    if (!isSupportedReportFile(req.file.buffer, req.file.originalname)) {
      return res.status(400).json({ message: 'The selected file is not a valid PDF report' });
    }

    const project = await findProjectById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!isProjectLeader(project, req.user.id)) {
      return res.status(403).json({ message: 'Only this project’s leader can submit reports' });
    }
    if (!canUploadProjectReport(project)) {
      return res.status(409).json({ message: 'This project cannot be submitted in its current state' });
    }
    if (project.status === 'APPROVED') {
      const studentIds = [
        project.leader || project.student,
        ...project.members
          .filter((member) => member.status === 'ACCEPTED')
          .map((member) => member.student)
      ].filter(Boolean);
      const conflictingProject = await Project.findOne({
        _id: { $ne: project._id },
        status: { $ne: 'APPROVED' },
        $or: [
          { leader: { $in: studentIds } },
          { student: { $in: studentIds } },
          { members: { $elemMatch: { student: { $in: studentIds }, status: 'ACCEPTED' } } }
        ]
      }).select('projectId');
      if (conflictingProject) {
        return res.status(409).json({
          message: 'This project cannot be reopened while a team member has another ongoing project'
        });
      }
    }

    const extension = getReportExtension(req.file.originalname);
    const storageName = `${crypto.randomUUID()}${extension}`;
    const contentType = 'application/pdf';
    await putReportObject(storageName, req.file.buffer, contentType);
    uploadedCloudinaryKey = storageName;

    const previousReport = project.reportFile;
    project.reportFile = {
      storageName,
      storageProvider: 'cloudinary',
      originalName: getSafeOriginalName(req.file.originalname),
      contentType,
      uploadedAt: new Date()
    };
    project.reportFilePath = '';
    project.status = getSubmissionStatus(project);
    project.submittedAt = new Date();
    await project.save();

    uploadedCloudinaryKey = null;
    await removeStoredReport(previousReport);
    if (project.assignedMentor) {
      await createProjectNotifications({
        project,
        recipients: [project.assignedMentor],
        actor: req.user.id,
        type: 'REPORT_SUBMITTED',
        title: 'Project report submitted',
        message: `A report was submitted for "${project.topicName}".`
      });
    }
    res.json(project);
  } catch (error) {
    if (uploadedCloudinaryKey) {
      try {
        await deleteReportObject(uploadedCloudinaryKey);
      } catch (cleanupError) {
        console.error('Failed to clean up an incomplete Cloudinary report upload', cleanupError);
      }
    }
    res.status(500).json({ message: error.message });
  }
};

exports.downloadProjectReport = async (req, res) => {
  try {
    const project = await findProjectById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!canAccessProject(project, req.user)) {
      return res.status(403).json({ message: 'You are not a member of this project' });
    }

    const reportFile = project.reportFile;
    if (!reportFile || !isValidReportStorageName(reportFile.storageName)) {
      return res.status(404).json({ message: 'No uploaded report was found' });
    }

    const reportStream = reportFile.storageProvider === 'cloudinary'
      ? (await getReportObject(reportFile.storageName)).Body
      : createReadStream(path.join(REPORTS_DIRECTORY, reportFile.storageName));
    if (!reportStream) {
      return res.status(404).json({ message: 'The uploaded report file is no longer available' });
    }

    res.attachment(getSafeOriginalName(reportFile.originalName));
    res.type(reportFile.contentType || 'application/octet-stream');
    res.set('Cache-Control', 'private, no-store');
    reportStream.once('error', (error) => {
      if (res.headersSent) {
        console.error('Failed while sending a project report', error);
        res.destroy(error);
      } else if (error.code === 'ENOENT' || error.name === 'NoSuchKey') {
        res.status(404).json({ message: 'The uploaded report file is no longer available' });
      } else {
        console.error('Failed to download a project report', error);
        res.status(500).json({ message: 'Failed to download the project report' });
      }
    });
    reportStream.pipe(res);
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return res.status(404).json({ message: 'The uploaded report file is no longer available' });
    }
    res.status(500).json({ message: error.message });
  }
};

exports.reviewProject = async (req, res) => {
  try {
    const { status, facultyFeedback } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const project = await findProjectById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!isAssignedMentor(project, req.user.id)) {
      return res.status(403).json({ message: 'Only the assigned mentor can review this project' });
    }
    if (!canReviewProject(project)) {
      return res.status(409).json({ message: 'Only submitted projects can be reviewed' });
    }

    project.status = status;
    if (facultyFeedback !== undefined) project.facultyFeedback = facultyFeedback;
    await project.save();

    if (status === 'APPROVED') {
      await initializeApprovedProject(project._id);
      const studentIds = [
        project.leader || project.student,
        ...project.members
          .filter((member) => member.status === 'ACCEPTED')
          .map((member) => member.student)
      ].filter(Boolean);
      await User.updateMany(
        { _id: { $in: studentIds }, activeProject: project._id },
        { $set: { activeProject: null } }
      );
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProjectDetails = async (req, res) => {
  try {
    const project = await findProjectById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!isProjectLeader(project, req.user.id)) {
      return res.status(403).json({ message: 'Only this project’s leader can edit project details' });
    }

    const { topicName, reportFilePath } = req.body || {};
    if (topicName === undefined && reportFilePath === undefined) {
      return res.status(400).json({ message: 'Provide a project topic or project link to update' });
    }
    if (topicName !== undefined && (typeof topicName !== 'string' || !topicName.trim())) {
      return res.status(400).json({ message: 'Project topic cannot be empty' });
    }
    if (reportFilePath !== undefined && typeof reportFilePath !== 'string') {
      return res.status(400).json({ message: 'Project link must be text' });
    }
    if (
      reportFilePath !== undefined &&
      reportFilePath !== '' &&
      !isValidProjectLink(reportFilePath)
    ) {
      return res.status(400).json({ message: 'Provide a valid HTTP or HTTPS project link' });
    }

    const wasApproved = project.status === 'APPROVED';
    const isUnderReview = ['PENDING', 'ASSIGNED'].includes(project.status);
    const topicChanged = topicName !== undefined && topicName.trim() !== project.topicName;
    const linkChanged = reportFilePath !== undefined && reportFilePath !== project.reportFilePath;
    if (!topicChanged && !linkChanged) {
      return res.json(project);
    }
    if (wasApproved && (linkChanged || topicChanged)) {
      const studentIds = getProjectStudentIds(project);
      const conflictingProject = await Project.findOne({
        _id: { $ne: project._id },
        status: { $ne: 'APPROVED' },
        $or: [
          { leader: { $in: studentIds } },
          { student: { $in: studentIds } },
          { members: { $elemMatch: { student: { $in: studentIds }, status: 'ACCEPTED' } } }
        ]
      }).select('projectId');
      if (conflictingProject) {
        return res.status(409).json({
          message: 'This project cannot be reopened while a team member has another ongoing project'
        });
      }
    }

    const previousReport = linkChanged ? project.reportFile : null;
    if (topicName !== undefined) project.topicName = topicName.trim();
    if (reportFilePath !== undefined) {
      project.reportFilePath = reportFilePath.trim();
      if (linkChanged) project.reportFile = null;
    }
    if (wasApproved && (linkChanged || topicChanged)) {
      project.status = getSubmissionStatus(project);
      project.submittedAt = new Date();
      project.facultyFeedback = '';
    } else if (isUnderReview) {
      project.submittedAt = new Date();
      project.facultyFeedback = '';
    }
    await project.save();
    await removeStoredReport(previousReport);

    if ((wasApproved || isUnderReview) && project.assignedMentor) {
      await createProjectNotifications({
        project,
        recipients: [project.assignedMentor],
        actor: req.user.id,
        type: 'PROJECT_UPDATED',
        title: 'Project details updated',
        message: `The team updated the topic or project link for "${project.topicName}".`
      });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.scheduleReview = async (req, res) => {
  try {
    const { title, scheduledFor, notes } = req.body;
    if (!title || !scheduledFor) {
      return res.status(400).json({ message: 'Review title and date are required' });
    }
    const reviewDate = new Date(scheduledFor);
    if (Number.isNaN(reviewDate.getTime())) {
      return res.status(400).json({ message: 'Please provide a valid review date' });
    }

    const project = await findProjectById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!isAssignedMentor(project, req.user.id)) {
      return res.status(403).json({ message: 'Only the assigned mentor can schedule reviews' });
    }

    project.reviewSchedules.push({ title, scheduledFor: reviewDate, notes: notes || '' });
    await project.save();
    const savedReview = project.reviewSchedules[project.reviewSchedules.length - 1];
    const recipientIds = new Set([
      (project.leader || project.student)?.toString(),
      ...project.members
        .filter((member) => member.status === 'ACCEPTED')
        .map((member) => member.student.toString())
    ].filter(Boolean));
    await Notification.insertMany([...recipientIds].map((recipient) => ({
      recipient,
      project: project._id,
      reviewSchedule: savedReview._id,
      actor: req.user.id,
      type: 'MEETING_SCHEDULED',
      path: '/meetings',
      title: `Review scheduled: ${title}`,
      message: notes || `Your faculty review is scheduled for ${reviewDate.toLocaleString()}.`,
      scheduledFor: reviewDate
    })));

    res.status(201).json(savedReview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user.id,
      scheduledFor: { $lte: new Date() }
    })
      .populate('project', 'projectId topicName')
      .populate('actor', 'name email')
      .sort({ scheduledFor: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.notificationId)) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.notificationId, recipient: req.user.id },
      { $set: { read: true } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteScheduledReview = async (req, res) => {
  try {
    const project = await findProjectById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!isAssignedMentor(project, req.user.id)) {
      return res.status(403).json({ message: 'Only the assigned mentor can delete reviews' });
    }

    const review = project.reviewSchedules.id(req.params.reviewId);
    if (!review) return res.status(404).json({ message: 'Scheduled review not found' });
    project.reviewSchedules.pull(req.params.reviewId);
    await project.save();
    await Notification.deleteMany({
      project: project._id,
      reviewSchedule: req.params.reviewId
    });
    res.json({ message: 'Scheduled review deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
