import React, { useState } from 'react';
import API from '../services/api';

const ProjectReportDownload = ({ project }) => {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async () => {
    setDownloading(true);
    setError('');
    try {
      const response = await API.get(`/projects/${project._id}/report`, { responseType: 'blob' });
      const downloadUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = project.reportFile.originalName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to download the project report');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <span className="project-report-download">
      <button type="button" onClick={handleDownload} disabled={downloading}>
        {downloading ? 'Downloading report...' : `Download ${project.reportFile.originalName}`}
      </button>
      {error && <span role="alert" className="project-report-download-error">{error}</span>}
    </span>
  );
};

export default ProjectReportDownload;
