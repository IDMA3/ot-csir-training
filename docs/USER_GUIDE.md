# User Guide

This guide covers how to use the SCL OT CSIR Training Platform for all user types.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Learners](#learners)
- [Organization Administrators](#organization-administrators)
- [Super Administrators](#super-administrators)

---

## Getting Started

### Creating an Account

#### Via Invitation (Recommended)

1. Receive an invitation email from your organization
2. Click the **Sign Up** link in the email
3. Complete the registration form:
   - Email (pre-filled from invitation)
   - Password
   - First Name
   - Last Name
4. Click **Create Account**
5. You'll be automatically enrolled in assigned courses

#### Self-Registration

1. Navigate to the application URL
2. Click **Sign Up**
3. Fill in all required fields
4. Click **Create Account**

### Logging In

1. Navigate to the application URL
2. Enter your email and password
3. Click **Sign In**

### Resetting Your Password

1. Click **Forgot Password** on the login page
2. Enter your email address
3. Click **Reset Password**
4. Check your email for the reset link
5. Follow the link to set a new password

---

## Learners

As a learner, you can take courses, complete assessments, and earn certificates.

### Dashboard

Your dashboard shows:
- Assigned courses
- Progress for each course
- Certificates earned
- Quick access to continue learning

### Taking a Course

1. From the dashboard, click on a course card
2. The course opens with a module sidebar
3. Complete modules in sequence (they unlock progressively)
4. Each module contains:
   - Learning content
   - Optional knowledge check quiz

### Completing Modules

1. Read through the module content
2. Click **Mark as Complete** when finished
3. If there's a quiz, answer all questions
4. You need 80% to pass quizzes
5. Failed quizzes can be retried

### Final Exam

After completing all modules:
1. The Final Exam module unlocks
2. Click to start the exam
3. Answer all questions
4. Submit your answers
5. View your results immediately
6. Score 80% or higher to pass

### Certificates

After passing the final exam:
1. Your certificate is automatically generated
2. View it from the dashboard or course completion page
3. Each certificate has a unique verification code
4. Download or print your certificate

### Verifying Certificates

Anyone can verify a certificate:
1. Go to the verification page
2. Enter the certificate ID
3. View the certificate details

---

## Organization Administrators

Organization admins manage users and view reports for their organization.

### Accessing Admin Panel

1. Log in with your admin account
2. Click **Admin** in the navigation
3. You'll see the admin dashboard

### Dashboard Overview

The dashboard shows:
- Total learners in your organization
- Courses assigned to your organization
- Completion statistics
- Recent activity

### Managing Users

#### Viewing Learners

1. Go to **Learner Reports** tab
2. See all learners in your organization
3. Filter by name, course, or date range
4. Click a learner to view details

#### Inviting New Users

1. Go to **Onboarding** tab
2. Choose invitation method:
   - **Single Invite**: One user at a time
   - **Bulk Import**: CSV file upload

##### Single Invitation

1. Click **Invite User**
2. Enter:
   - Email address
   - First name (optional)
   - Last name (optional)
   - Job role (optional)
   - Courses to assign
3. Click **Send Invitation**
4. User receives email with signup link

##### Bulk Import

1. Click **Bulk Import**
2. Download the CSV template
3. Fill in user data:
   ```csv
   email,first_name,last_name,job_role
   user1@example.com,John,Doe,Engineer
   user2@example.com,Jane,Smith,Analyst
   ```
4. Upload the file
5. Review and confirm
6. Invitations are sent to all users

#### Managing Invitations

1. Go to **Onboarding** tab
2. View pending invitations
3. Actions available:
   - **Resend**: Send invitation again
   - **Cancel**: Cancel pending invitation

### Viewing Reports

#### Learner Progress

1. Go to **Learner Reports** tab
2. View completion status for all learners
3. Export data to CSV

#### Learner Details

1. Click on a learner's name
2. View:
   - Profile information
   - Enrolled courses
   - Module-by-module progress
   - Quiz/exam scores
   - Certificates earned

#### Analytics Dashboard

1. Go to **Analytics** tab
2. View charts and metrics:
   - Completion rates over time
   - Average scores
   - Course popularity
   - Time to completion

### Exporting Data

1. Go to any report view
2. Click **Export CSV**
3. Data downloads to your computer

---

## Super Administrators

Super admins have full platform access across all organizations.

### Additional Capabilities

Everything org admins can do, plus:
- Manage all organizations
- Create and edit courses
- Manage admin permissions
- View platform-wide statistics

### Managing Organizations

1. Go to **Organizations** tab
2. View all organizations
3. Click to view/edit:
   - Organization name
   - Description
   - Maximum users
   - Assigned courses
   - Logo and branding

#### Creating an Organization

1. Click **Add Organization**
2. Enter organization details:
   - Organization name
   - Description (optional)
   - Maximum user limit (optional)
   - Email domain for auto-assignment (optional, e.g., "idma3.com")
   - Logo and brand color (optional)
3. Click **Create**

#### Configuring Email Domain Auto-Assignment

1. Edit an organization
2. Enter the **Email Domain** (e.g., "idma3.com" - without the @)
3. Save changes

Users who sign up with matching email domains will automatically be assigned to this organization. The domain is also displayed in the Organizations table and included in CSV exports for reference.

#### Assigning Courses

1. Select an organization
2. Go to course access settings
3. Toggle courses on/off
4. Save changes

### Managing Courses

#### Viewing Courses

1. Go to **Courses** tab
2. See all courses in the platform
3. Filter by status or organization

#### Creating a Course

1. Click **Create Course**
2. Enter:
   - Title
   - Description
   - Duration (minutes)
   - Category
   - Version
3. Click **Create**

#### Adding Modules

1. Open a course
2. Click **Add Module**
3. Enter:
   - Title
   - Type (Content or Exam)
   - Content (rich text editor)
   - Estimated time
4. Drag to reorder modules
5. Save changes

#### Adding Questions

1. Open a module
2. Go to **Questions** section
3. Click **Add Question**
4. Enter:
   - Question prompt
   - Answer choices (A-D)
   - Correct answer
   - Rationale (optional)
5. Drag to reorder questions
6. Save changes

### Managing Admins

#### Granting Admin Access

1. Go to **Admin Management** tab
2. Click **Add Admin**
3. Search for user by email
4. Set permissions:
   - Super Admin (full access)
   - Or specific permissions:
     - Can view users
     - Can manage users
     - Can view courses
     - Can manage courses
   - Organization scope (optional)
5. Click **Grant Permissions**

#### Revoking Admin Access

1. Find the admin in the list
2. Click **Remove** or edit permissions
3. Confirm the action

### Recertification Settings

1. Go to organization settings
2. Find **Recertification** section
3. Configure per course:
   - Enable/disable recertification
   - Schedule type (annual, biannual, custom)
   - Custom days (if applicable)
4. Save settings

### Deleting Users

1. Find the user in learner reports
2. Click **Delete User**
3. Confirm the deletion
4. All user data is permanently removed

**Note**: You cannot delete:
- Yourself
- Other super admins

---

## Troubleshooting

### Can't Log In

- Verify email and password are correct
- Try resetting your password
- Check if your account is active
- Contact your organization admin

### Course Not Appearing

- You may not be enrolled in the course
- Contact your organization admin for enrollment
- Check if the course is active

### Can't Complete Module

- Ensure you've viewed all content
- Complete the quiz if required
- Check for error messages
- Try refreshing the page

### Certificate Not Generated

- Verify you passed the final exam (80%+)
- Refresh the page
- Try accessing from the dashboard
- Contact support if issue persists

### Invitation Not Received

- Check spam/junk folder
- Verify email address is correct
- Ask admin to resend invitation
- Check if invitation expired (7 days)

---

## Support

For additional help:
- Contact your organization administrator
- Review this documentation
- Check the troubleshooting guide
