import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import Sidebar from '../components/Sidebar';
import ProjectReportDownload from '../components/ProjectReportDownload';
import { useAuth } from '../context/AuthContext';

const MAX_REPORT_SIZE_BYTES = 10 * 1024 * 1024;
const allowedReportExtensions = ['.pdf', '.ppt', '.pptx'];
const reportSubmissionStatuses = ['DRAFT', 'REJECTED', 'APPROVED'];

const getLeaderId = (project) => {
  const leader = project.leader || project.student;
  return leader?._id || leader;
};

const ReportSubmissions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInput = useRef(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    API.get('/projects')
      .then((response) => {
        if (!active) return;
        const leaderId = user?.id || user?._id;
        const leaderProjects = response.data.filter(
          (project) => String(getLeaderId(project)) === String(leaderId)
        );
        setProjects(leaderProjects);
        const firstEligibleProject = leaderProjects.find(
          (project) => reportSubmissionStatuses.includes(project.status)
        );
        setSelectedProjectId(firstEligibleProject?._id || '');
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.message || 'Failed to load projects');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const eligibleProjects = useMemo(
    () => projects.filter((project) => reportSubmissionStatuses.includes(project.status)),
    [projects]
  );
  const selectedProject = eligibleProjects.find((project) => project._id === selectedProjectId);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setError('');
    setMessage('');
    if (!file) return;

    const extension = `.${file.name.split('.').pop().toLowerCase()}`;
    if (!allowedReportExtensions.includes(extension)) {
      setSelectedFile(null);
      setError('Choose a PDF, PPT, or PPTX file.');
      event.target.value = '';
    } else if (file.size > MAX_REPORT_SIZE_BYTES) {
      setSelectedFile(null);
      setError('Report files must be 10 MB or smaller.');
      event.target.value = '';
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedProject || !selectedFile) {
      setError('Select a project and report file before submitting.');
      return;
    }

    const formData = new FormData();
    formData.append('report', selectedFile);
    setUploading(true);
    setUploadProgress(0);
    setError('');
    setMessage('');

    try {
      const response = await API.post(`/projects/${selectedProject._id}/report`, formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
          }
        }
      });
      setProjects((currentProjects) => currentProjects.map((project) => (
        project._id === response.data._id
          ? { ...project, ...response.data, leader: project.leader }
          : project
      )));
      setSelectedFile(null);
      if (fileInput.current) fileInput.current.value = '';
      setSelectedProjectId('');
      setMessage('Report submitted to your mentor for review.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to submit the report');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Sidebar />
      <main className="dashboard-page student-team-page report-submissions-page">
        <h2>Report submissions</h2>
        <p>Submit a PDF or PowerPoint report for your project. Only project leaders can submit reports. Uploading for an approved project reopens it for mentor review.</p>

        {error && <div role="alert" className="students-error">{error}</div>}
        {message && <div role="status" className="student-success">{message}</div>}

        <section className="student-panel">
          <h3>Submit a report</h3>
          {loading ? (
            <p>Loading your projects...</p>
          ) : eligibleProjects.length === 0 ? (
            <p>There are no projects available for report submission. Projects awaiting mentor review cannot be resubmitted yet.</p>
          ) : (
            <form className="student-form" onSubmit={handleSubmit}>
              <label>
                Project
                <select
                  required
                  value={selectedProjectId}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                >
                  <option value="" disabled>Select a project</option>
                  {eligibleProjects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.topicName} ({project.status})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Report file (PDF, PPT, or PPTX; max 10 MB)
                <input
                  ref={fileInput}
                  required
                  type="file"
                  accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  onChange={handleFileChange}
                />
              </label>
              {selectedFile && <p className="report-selected-file">Selected: {selectedFile.name}</p>}
              {uploading && (
                <progress
                  className="report-upload-progress"
                  value={uploadProgress}
                  max="100"
                  aria-label="Report upload progress"
                />
              )}
              <button type="submit" disabled={uploading || !selectedFile}>
                {uploading
                  ? `Uploading${uploadProgress ? ` ${uploadProgress}%` : '...'}`
                  : selectedProject?.status === 'REJECTED'
                    ? 'Resubmit report'
                    : selectedProject?.status === 'APPROVED'
                      ? 'Submit report for review'
                      : 'Submit report'}
              </button>
            </form>
          )}
        </section>

        <section className="student-panel">
          <h3>Your project reports</h3>
          {loading ? (
            <p>Loading submissions...</p>
          ) : projects.length === 0 ? (
            <p>You do not lead any projects yet. <button type="button" onClick={() => navigate('/student-dashboard')}>Go to dashboard</button></p>
          ) : (
            <div className="report-project-list">
              {projects.map((project) => (
                <article className="report-project-item" key={project._id}>
                  <div>
                    <strong>{project.topicName}</strong>
                    <span className={`status-${project.status.toLowerCase()}`}>{project.status}</span>
                  </div>
                  {project.reportFile ? (
                    <ProjectReportDownload project={project} />
                  ) : project.reportFilePath ? (
                    <a href={project.reportFilePath} target="_blank" rel="noopener noreferrer">
                      Open submitted project link
                    </a>
                  ) : (
                    <small>No report submitted yet.</small>
                  )}
                  {project.facultyFeedback && <p><strong>Mentor feedback:</strong> {project.facultyFeedback}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
};

export default ReportSubmissions;
