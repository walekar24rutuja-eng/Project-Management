import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import Sidebar from '../components/Sidebar';
import './ProjectDetails.css';

const reviewKey = (review) => `${review.project._id}-${review.milestone.key}`;

const MentorReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [feedback, setFeedback] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadReviews = useCallback(async () => {
    try {
      const response = await API.get('/projects/mentor/pending-reviews');
      setReviews(response.data);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load milestone reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    API.get('/projects/mentor/pending-reviews')
      .then((response) => {
        if (!active) return;
        setReviews(response.data);
        setError('');
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.message || 'Failed to load milestone reviews');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleReview = async (review, decision) => {
    const key = reviewKey(review);
    const text = feedback[key] || '';
    if (decision === 'CHANGES_REQUESTED' && !text.trim()) {
      setError('Add feedback before requesting changes.');
      return;
    }
    setSubmitting(key);
    setError('');
    setMessage('');
    try {
      await API.put(
        `/projects/${review.project._id}/progress/milestones/${review.milestone.key}/review`,
        { decision, feedback: text }
      );
      setMessage(decision === 'APPROVED' ? 'Milestone approved.' : 'Changes requested.');
      await loadReviews();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to review milestone');
    } finally {
      setSubmitting('');
    }
  };

  return (
    <>
      <Sidebar />
      <main className="dashboard-page project-details-page">
        <p className="project-kicker">Mentor workspace</p>
        <h2>Milestone reviews</h2>
        <p className="project-details-subtitle">Review student updates and approve completed milestone work.</p>
        {error && <div role="alert" className="project-details-error">{error}</div>}
        {message && <div role="status" className="project-details-success">{message}</div>}

        {loading ? (
          <section className="project-details-card"><p>Loading pending reviews...</p></section>
        ) : reviews.length === 0 ? (
          <section className="project-details-card">
            <h3>No milestone updates are waiting for review</h3>
            <p>New student submissions will appear here.</p>
          </section>
        ) : (
          <section className="mentor-review-list">
            {reviews.map((review) => {
              const key = reviewKey(review);
              const latestSubmission = review.milestone.submissions[review.milestone.submissions.length - 1];
              return (
                <article className="project-details-card mentor-review-card" key={key}>
                  <div className="project-section-heading">
                    <div>
                      <p className="project-kicker">{review.phase.name} · {review.project.projectId}</p>
                      <h3>{review.milestone.title}</h3>
                      <p>{review.project.topicName}</p>
                    </div>
                    <Link to={`/projects/${review.project._id}`}>Open project</Link>
                  </div>
                  <p className="project-phase-description">{review.milestone.description}</p>
                  {latestSubmission && (
                    <div className="mentor-review-submission">
                      <strong>
                        {latestSubmission.submittedBy?.name || 'Student'} · {new Date(latestSubmission.submittedAt).toLocaleString()}
                      </strong>
                      <p>{latestSubmission.note}</p>
                    </div>
                  )}
                  {review.milestone.submissions.length > 1 && (
                    <details className="milestone-history">
                      <summary>Earlier submissions ({review.milestone.submissions.length - 1})</summary>
                      {review.milestone.submissions.slice(0, -1).map((submission) => (
                        <article className="milestone-history-entry" key={submission._id}>
                          <small>{submission.submittedBy?.name || 'Student'} · {new Date(submission.submittedAt).toLocaleString()}</small>
                          <p>{submission.note}</p>
                        </article>
                      ))}
                    </details>
                  )}
                  <label className="mentor-review-feedback">
                    Feedback
                    <textarea
                      rows="3"
                      maxLength="5000"
                      value={feedback[key] || ''}
                      onChange={(event) => setFeedback((current) => ({ ...current, [key]: event.target.value }))}
                      placeholder="Optional when approving; required when requesting changes."
                    />
                  </label>
                  <div className="mentor-review-actions">
                    <button
                      type="button"
                      disabled={submitting === key}
                      onClick={() => handleReview(review, 'APPROVED')}
                    >
                      Approve milestone
                    </button>
                    <button
                      type="button"
                      className="project-secondary-button"
                      disabled={submitting === key}
                      onClick={() => handleReview(review, 'CHANGES_REQUESTED')}
                    >
                      Request changes
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </>
  );
};

export default MentorReviews;
