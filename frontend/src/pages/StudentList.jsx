import React, { useEffect, useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import API from '../services/api';
import Sidebar from '../components/Sidebar';
import ProjectReportDownload from '../components/ProjectReportDownload';

const StudentList = () => {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await API.get('/projects');
        const studentsById = new Map();

        response.data.forEach((project) => {
          const projectStudents = [
            project.leader,
            ...(project.members || [])
              .filter((member) => member.status === 'ACCEPTED')
              .map((member) => member.student)
          ].filter(Boolean);

          projectStudents.forEach((student) => {
            const studentId = student._id || student.id;
            const existingStudent = studentsById.get(studentId) || {
              id: studentId,
              name: student.name || 'Unnamed student',
              email: student.email || 'No email available',
              projects: []
            };
            existingStudent.projects.push(project);
            studentsById.set(studentId, existingStudent);
          });
        });

        setStudents(Array.from(studentsById.values()));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load students');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      `${student.name} ${student.email}`.toLowerCase().includes(query)
    );
  }, [search, students]);

  return (
    <>
      <Sidebar />
      <main className="dashboard-page students-page">
        <div className="students-header">
          <div>
            <h2>Students</h2>
            <p>Review assigned students and their project progress.</p>
          </div>
          <div className="students-total"><Users size={18} /> {students.length} students</div>
        </div>

        <label className="student-search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Search by student name or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        {loading && <p>Loading students...</p>}
        {error && <div className="students-error">{error}</div>}
        {!loading && !error && filteredStudents.length === 0 && (
          <div className="students-empty">
            <h3>{search ? 'No matching students' : 'No students assigned'}</h3>
            <p>{search ? 'Try a different name or email.' : 'Assigned students will appear here.'}</p>
          </div>
        )}

        <div className="students-grid">
          {filteredStudents.map((student) => (
            <article className="student-card" key={student.id}>
              <div className="student-card-heading">
                <div className="student-avatar">{student.name.charAt(0).toUpperCase()}</div>
                <div>
                  <button className="student-name-button" onClick={() => setSelectedStudent(student)}>
                    {student.name}
                  </button>
                  <p>{student.email}</p>
                </div>
              </div>
              <div className="student-card-stats">
                <span><strong>{student.projects.length}</strong> project{student.projects.length === 1 ? '' : 's'}</span>
                <span><strong>{student.projects.filter((project) => project.status === 'APPROVED').length}</strong> approved</span>
              </div>
              <div className="student-projects">
                {student.projects.map((project) => (
                  <div className="student-project" key={project._id}>
                    <span>{project.topicName}</span>
                    <small className={`status-${project.status.toLowerCase()}`}>{project.status}</small>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        {selectedStudent && (
          <div className="student-project-modal" role="dialog" aria-modal="true" aria-labelledby="student-project-title">
            <div className="student-project-modal-content">
              <div className="student-project-modal-header">
                <div>
                  <span className="student-modal-kicker">Student project</span>
                  <h3 id="student-project-title">{selectedStudent.name}</h3>
                  <p>{selectedStudent.email}</p>
                </div>
                <button className="student-modal-close" onClick={() => setSelectedStudent(null)} aria-label="Close project details">
                  X
                </button>
              </div>
              {selectedStudent.projects.map((project) => (
                <section className="student-project-detail" key={project._id}>
                  <div className="student-project-detail-title">
                    <h4>{project.topicName}</h4>
                    <small className={`status-${project.status.toLowerCase()}`}>{project.status}</small>
                  </div>
                  <p><strong>Project ID:</strong> {project.projectId}</p>
                  <p>
                    <strong>Team:</strong> {[project.leader, ...(project.members || [])
                      .filter((member) => member.status === 'ACCEPTED')
                      .map((member) => member.student)]
                      .filter(Boolean)
                      .map((teamMember) => `${teamMember.name}${teamMember.rollNumber ? ` (${teamMember.rollNumber})` : ''}`)
                      .join(', ')}
                  </p>
                  {project.reportFile && <ProjectReportDownload project={project} />}
                  {project.reportFilePath && (
                    <a href={project.reportFilePath} target="_blank" rel="noopener noreferrer">
                      Open project link
                    </a>
                  )}
                  {project.facultyFeedback && <p><strong>Feedback:</strong> {project.facultyFeedback}</p>}
                  {project.reviewSchedules?.length > 0 && (
                    <p><strong>Next review:</strong> {new Date(project.reviewSchedules[0].scheduledFor).toLocaleString()}</p>
                  )}
                </section>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
};

export default StudentList;
