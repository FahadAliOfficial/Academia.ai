# Academia.ai

Academia.ai is an AI-powered learning platform built with Next.js, Supabase, and real-time services for modern classroom workflows.

It includes separate student and teacher experiences for:

- course management and enrollment
- assignments and submissions
- exam creation, participation, and review
- live classes with WebRTC signaling
- AI chat assistance and answer evaluation

## Overview

The application is built as a Next.js App Router project with Supabase as the primary backend (auth, database, realtime). Role-based dashboard flows are implemented for both students and teachers.

Major capabilities:

- Landing, authentication, and role-based dashboard access
- Teacher tools: courses, assignments, exams, live class scheduling
- Student tools: enrollments, assignments, exam portal and result review
- Live classes using Socket.IO signaling + WebRTC
- AI integrations for chatbot support and answer checking
- Realtime notifications for active live classes and collaboration data

## Tech Stack

- Frontend: Next.js 15, React 19
- Styling: Tailwind CSS 4
- Auth and DB: Supabase
- Realtime: Supabase Realtime, Socket.IO
- AI: Google Generative AI SDK
- Live media: WebRTC
- Icons and UI libs: lucide-react, swiper, react-awesome-reveal

## Project Structure

Top-level layout:

- src/app: App Router pages and application UI
- src/app/dashboard: authenticated student/teacher dashboard modules
- src/app/components: reusable UI and domain components
- src/app/lib: clients, hooks, and integrations
- src/app/pages: additional routes and API-style handlers
- src/socket.js: frontend Socket.IO client

Important feature areas:

- src/app/dashboard/teacher: teacher course and assignment management
- src/app/dashboard/student: student course, assignment, and exam views
- src/app/dashboard/Exams: exam authoring and exam review
- src/app/dashboard/LiveClass: live class scheduling and join flow
- src/app/dashboard/chat-bot: course-aware chatbot sessions

## Prerequisites

Before running or deploying, make sure you have:

- Node.js 18.18+ (Node.js 20 LTS recommended)
- npm 9+
- A Supabase project with required tables and auth enabled
- A deployment target (Vercel recommended for Next.js)

For full local feature parity, you may also need:

- A Socket.IO signaling server for live classes (default local port 3001)
- The Python/ML service used by chatbot vector DB calls (default local port 5000)

## Environment Variables

Create a .env.local file in the project root.

Minimum required variables:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

Recommended additional variable:

- GEMINI_API_KEY

Example:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-key
```

Security note:

- The current codebase includes a hardcoded Gemini key in src/app/lib/geminiClient.js.
- Remove that key before going live.
- Use environment variables and rotate any exposed key immediately.

## Installation

```bash
npm install
```

## Local Development

Run the web app:

```bash
npm run dev
```

Production build locally:

```bash
npm run build
npm run start
```

Lint:

```bash
npm run lint
```

Open http://localhost:3000 after startup.

## Running Live Class Signaling Server

Live class signaling logic exists in:

- src/app/dashboard/LiveClass/server/page.js

It is an Express + Socket.IO server that listens on port 3001.

To run it locally from the project root:

```bash
node src/app/dashboard/LiveClass/server/page.js
```

If you deploy this separately, update client socket URL in src/socket.js to your production signaling endpoint.

## Supabase Requirements

The app interacts with many tables. Core entities include:

- users
- courses
- enrollments
- enrollment_requests
- assignments
- submissions
- exams
- questions
- mcq_options
- fill_blanks
- short_answers
- coding_questions
- code_errors
- exam_results
- exam_result_details
- exam_questions
- student_answers
- live_classes
- messages
- course_materials
- usertodo
- user_api_keys
- chat_sessions
- bot_chat_history

Recommended setup checklist:

- Enable email/password auth in Supabase Auth
- Ensure role information is stored in user metadata and/or users table
- Configure Row Level Security policies for student/teacher separation
- Enable realtime for tables used in subscriptions (for example live_classes)
- Validate indexes for frequently queried fields (user_id, course_id, exam_id)

## Deployment Guide

### 1. Pre-launch Security Checklist

- Remove all hardcoded API keys and secrets from source files
- Rotate any key that has ever been committed
- Add all required environment variables in deployment platform
- Confirm .env.local is ignored and not committed
- Review Supabase RLS policies before opening public access

### 2. Build Verification

- Run npm run lint
- Run npm run build
- Smoke test key flows locally:
	- register/login
	- teacher creates course and exam
	- student enrolls and attempts exam
	- live class creation and joining

### 3. Deploy Next.js App

Vercel (recommended):

- Import repository into Vercel
- Set environment variables for production and preview
- Deploy and verify dashboard auth + database access

Alternative platforms are possible as long as Node runtime and environment variables are configured correctly.

### 4. Deploy Supporting Services

- Deploy Socket.IO signaling server separately if needed
- Ensure CORS and allowed origins are configured for production domain
- Configure chatbot/vector service endpoint if you use the localhost:5000 integration

### 5. Post-deploy Validation

- Verify Supabase auth redirect and protected pages
- Verify realtime notifications for live classes
- Verify file/material and exam workflows for both roles
- Monitor logs for socket reconnect issues and API failures

## API and Realtime Notes

- The project uses Supabase directly from the client in many places
- Realtime listeners are used for live class notifications and related updates
- There is an API-style module at src/app/pages/api/courses.js handling message/enrollment/assignment operations

## Known Operational Notes

- Socket client currently points to http://localhost:3001 in src/socket.js; this must be changed for production
- Chatbot flow includes calls to http://localhost:5000/load_vector_db; configure a production endpoint before go-live
- Some pages rely on localStorage data during navigation (for example live class join context)

## Scripts

- npm run dev: start development server
- npm run build: create production build
- npm run start: run production server
- npm run lint: run lint checks

## Troubleshooting

Common issues and checks:

- Login loop or immediate redirect to login:
	- verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
	- check Supabase auth session and policies
- Empty dashboard data:
	- verify table data exists for current user
	- verify RLS permits select operations for the role
- Live class not connecting:
	- ensure signaling server is running and reachable
	- verify socket URL and browser permissions for camera/microphone
- Chatbot errors:
	- ensure API key exists and endpoint at port 5000 is available

## Roadmap Suggestions

Suggested improvements before or after launch:

- Move all third-party secret usage to secure server-side routes
- Add automated tests for auth and critical exam flows
- Add health checks and observability for signaling and AI services
- Add CI pipeline for lint/build/test on every pull request

## License

MIT - Copyright (c) 2025 Fahad Ali
