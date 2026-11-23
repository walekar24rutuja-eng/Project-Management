# Project Features

This document describes the features currently implemented in the Final Year Project Management System.

## User roles and access

### Student

- Register with a name, email, password, and **required roll number**.
- Create a project as its leader or request to join another student's project.
- Choose a preferred mentor when creating a project.
- Review current projects, project status, team membership, mentor feedback, submitted links, and uploaded reports.
- Approve or reject join requests for projects they lead.
- Submit and resubmit project links or PDF reports (up to 10 MB) from Project Details as the project leader.
- View milestones, save progress follow-ups, and receive review notifications for projects they belong to.
- Update their name or roll number from the profile API.

Students do not have different account roles for team leader and team member. Leader permissions are specific to the project they created.

### Mentor

- Sign in to an account provisioned by an administrator.
- View projects assigned to them and their student teams.
- Approve or reject submitted project proposals and provide feedback.
- Assign milestones to approved projects, including a title, description, and deadline.
- Mark milestones completed or pending and read student follow-ups.
- Schedule review meetings and delete scheduled reviews.
- View and search the directory of students in their assigned projects.

### Administrator

- Sign in to the initial admin account provisioned from backend environment configuration.
- View all student accounts, mentor accounts, projects, and unassigned projects.
- Create mentor accounts with a temporary password.
- Assign, change, or remove a project's assigned mentor.
- View project leaders, accepted team members, project status, and preferred mentor.

## Project and team workflow

1. A student creates a project by entering its topic and optionally selecting a preferred mentor. The creator becomes the project leader.
2. The system generates a stable project ID in the form `PRJ-` followed by a unique uppercase hexadecimal identifier. This is separate from MongoDB's internal document ID.
3. The leader shares the project ID. Another student can use it to request membership; knowing the ID does not grant project access.
4. The leader approves or rejects each pending request. Only accepted members can access team project information and tasks.
5. An admin assigns a mentor to the project. The student's preferred mentor is a preference, not the actual assignment.
6. Only the leader can submit the project's HTTP/HTTPS link or upload a PDF report (up to 10 MB). Submission moves the project to `PENDING` if unassigned, or `ASSIGNED` if a mentor is already assigned.
7. Assigning a mentor to a submitted `PENDING` project changes it to `ASSIGNED`; unassigning its mentor returns it to `PENDING`.
8. The assigned mentor reviews the submitted project:
   - **Approved:** the project becomes `APPROVED`. Team members are no longer considered to have an ongoing project and may start or join another project.
   - **Rejected:** the leader can revise the project link or upload a replacement report, returning it to `ASSIGNED` if a mentor is assigned or `PENDING` otherwise.
   - A report submitted for an `APPROVED` project reopens it for review; this is blocked if a team member has another ongoing project.

Each student may have at most one ongoing project at a time. The backend checks this rule when creating a project and when a leader approves a student’s join request. Pending membership requests alone do not add a student to a team.

## Tasks and milestones

- Assigned mentors can create tasks on approved projects.
- Each task has a title, optional description, deadline, completion state, and student follow-up text.
- Accepted team members can read tasks and update follow-up notes.
- Only the project's assigned mentor can change task completion status.

## Reviews, meetings, and notifications

- Assigned mentors can schedule a meeting with a title, date/time, and optional notes.
- Meeting schedules appear in the Meetings page for students and mentors who can access that project.
- A notification is created for the project leader and each accepted team member.
- The student dashboard periodically refreshes notifications. The notifications API returns items whose scheduled time has arrived.
- Assigned mentors can delete a meeting; its associated notifications are removed as well.

## Authentication and account management

- Passwords are stored as bcrypt hashes.
- Successful login returns a JSON Web Token (JWT) that the frontend stores and attaches to API requests.
- Backend middleware checks JWTs and account roles. Frontend routes also redirect users whose account role is not allowed.
- Public registration is restricted to students. A submitted `MENTOR` or `ADMIN` role is rejected.
- The initial admin is created from `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` when the backend starts and no admin account already exists.
- Mentors are created by admins, not by public registration.
- Students and mentors can delete their own accounts. Student-owned projects and related tasks/notifications are removed; a deleted student is removed from other project teams. Deleting a mentor unassigns their projects. Admin accounts cannot be deleted through the self-service account endpoint.

## Data migration and project visibility

- Backend startup gives legacy projects a stable project ID, sets the former project owner as leader, and copies that student's existing mentor assignment to the project where available.
- Projects without a known mentor remain unassigned for an admin to assign.
- Students see projects they lead or have been accepted into. Leaders can see their pending membership requests.
- Mentors see projects assigned to them. Admins can view all projects.
- Project IDs identify projects for joining and admin mentor assignment; protected project-management routes additionally require the authenticated user's project or role permissions.

## Main frontend pages

| Page | Purpose |
|---|---|
| `/auth` | Student registration and sign-in for students, mentors, and admins. |
| `/student-dashboard` | Create or join projects, manage membership requests, submit project links, view project information, milestones, and notifications. |
| `/mentor-dashboard` | Review assigned projects, provide feedback, assign tasks, manage task status, and schedule reviews. |
| `/admin-dashboard` | View users and projects, create mentors, and assign project mentors. |
| `/meetings` | View scheduled project reviews; mentors can schedule and delete meetings. |
| `/students` | Search and inspect the students associated with a mentor's assigned projects. |

## API feature map

All `/api/projects` routes require a JWT. Project routes are scoped by the caller's role and project relationship; `/api/admin` routes require an admin JWT.

### Authentication (`/api/auth`)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/register` | Register a student with a required roll number. |
| `POST` | `/login` | Authenticate and issue a JWT. |
| `GET` | `/mentors` | List mentor accounts for project preference selection. |
| `PUT` | `/profile` | Update the signed-in user's name or roll number. |
| `DELETE` | `/account` | Delete the signed-in student or mentor account and its associated data. |

### Administration (`/api/admin`)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/overview` | Fetch all students, mentors, projects, and the unassigned-project list. |
| `POST` | `/mentors` | Create a mentor account with a temporary password. |
| `PUT` | `/projects/:projectId/mentor` | Assign or unassign a mentor using the stable project ID. |

### Projects (`/api/projects`)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | List projects visible to the authenticated user. |
| `GET` | `/my-requests` | List the signed-in student's pending or rejected join requests. |
| `POST` | `/` | Create a project and return its stable project ID. |
| `POST` | `/join` | Request to join a project using its stable project ID. |
| `PUT` | `/:id/members/:studentId` | Project leader accepts or rejects a pending membership request. |
| `PUT` | `/:id/submit` | Project leader submits a project link. |
| `PUT` | `/:id/resubmit` | Project leader resubmits a rejected project link. |
| `POST` | `/:id/report` | Project leader uploads or resubmits a PDF report (maximum 10 MB). |
| `GET` | `/:id/report` | Download a report when the caller is a project member, assigned mentor, or admin. |
| `PUT` | `/:id/review` | Assigned mentor approves or rejects a submitted project. |
| `POST` | `/:id/tasks` | Assigned mentor creates a task. |
| `GET` | `/:id/tasks` | Retrieve tasks if the caller can access the project. |
| `PUT` | `/tasks/:taskId/followup` | A project student updates task follow-up text. |
| `PUT` | `/tasks/:taskId/status` | Assigned mentor updates task completion status. |
| `POST` | `/:id/reviews` | Assigned mentor schedules a review and notifies team members. |
| `DELETE` | `/:id/reviews/:reviewId` | Assigned mentor deletes a review and its notifications. |
| `GET` | `/notifications` | List due notifications for the signed-in student. |

For project-specific routes written with `:id`, the current backend expects the MongoDB project document ID. The stable `projectId` is used by the join request and admin mentor-assignment routes.

## Implementation boundaries

- New uploaded reports are stored in Cloudinary under the `authenticated` delivery type and served through an authenticated, project-authorized download endpoint (the backend fetches the file using a signed Cloudinary URL and streams it to the client). Existing local reports remain downloadable from `backend/uploads/reports/`; that directory is excluded from version control.
- Report uploads require `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in the backend environment.
- Review notifications are in-app only; email delivery is not implemented.
- Notifications have a `read` field in the data model, but there is currently no UI/API action to mark them read.
- Admins can assign mentors and view project data, but do not perform project reviews or manage milestones as a mentor.
