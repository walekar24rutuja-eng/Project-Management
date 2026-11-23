import React, { useEffect, useState } from 'react';
import API from '../services/api';

const getErrorMessage = async (requestError, fallback) => {
  const responseData = requestError.response?.data;
  if (responseData instanceof Blob) {
    try {
      const payload = JSON.parse(await responseData.text());
      if (typeof payload.message === 'string') return payload.message;
    } catch {
      // The response may not contain JSON.
    }
  }
  return responseData?.message || fallback;
};

const ProjectReportDownload = ({ project }) => {
  const [viewerUrl, setViewerUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => {
    if (viewerUrl) URL.revokeObjectURL(viewerUrl);
  }, [viewerUrl]);

  const loadReport = async () => {
    if (viewerUrl) return viewerUrl;
    const response = await API.get(`/projects/${project._id}/report`, { responseType: 'blob' });
    const blobUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    setViewerUrl(blobUrl);
    return blobUrl;
  };

  const handleView = async () => {
    setLoading(true);
    setError('');
    try {
      await loadReport();
    } catch (requestError) {
      setError(await getErrorMessage(requestError, 'Failed to open the project report'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    setError('');
    try {
      const blobUrl = await loadReport();
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = project.reportFile.originalName;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (requestError) {
      setError(await getErrorMessage(requestError, 'Failed to download the project report'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="project-report-download">
      <div className="project-report-download-actions">
        <button type="button" onClick={handleView} disabled={loading}>
          {loading ? 'Opening report...' : `View ${project.reportFile.originalName}`}
        </button>
        <button type="button" className="project-report-download-secondary" onClick={handleDownload} disabled={loading}>
          Download
        </button>
      </div>
      {error && <span role="alert" className="project-report-download-error">{error}</span>}
      {viewerUrl && (
        <iframe
          className="project-report-embed"
          src={viewerUrl}
          title={`${project.reportFile.originalName} preview`}
        />
      )}
    </div>
  );
};

export default ProjectReportDownload;
