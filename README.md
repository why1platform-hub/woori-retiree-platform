# Woori Retiree Support Platform (MERN-lite on Vercel)

This repo is a deploy-friendly **MERN** implementation using:

- **Next.js (React)** for UI + serverless API routes (replaces Express for easier Vercel deploy)
- **MongoDB Atlas** + **Mongoose**
- **JWT (HttpOnly cookie)** + role-based access control (RBAC)

## User roles
- `user` (Normal User)
- `instructor` (Instructor / Consultant)
- `superadmin` (Platform Admin)

## Features (MVP)
- Home dashboard (notices, my status, calendar placeholders)
- Programs: list + apply
- My Activity: applications + consultations + courses
- Jobs: list + bookmark + simple resume
- Learning: courses + downloadable resources
- Support: FAQ + 1:1 inquiries
- Admin: manage users, notices, programs, jobs, FAQs
- Instructor: manage courses/resources, consultation slots/bookings

## Local setup

### 1) Requirements
- Node.js 18+
- MongoDB Atlas connection string

### 2) Install
```bash
npm install
```

### 3) Environment variables
Create `.env.local`:

```bash
MONGODB_URI="mongodb+srv://USER:PASS@cluster.mongodb.net/woori_platform?retryWrites=true&w=majority"
JWT_SECRET="change-me-to-a-long-random-string"
APP_BASE_URL="http://localhost:3000"
```

### 4) Run
```bash
npm run dev
```

Open http://localhost:3000

### 5) Seed (optional)
Creates a superadmin + sample data.

```bash
npm run seed
```

Seeded accounts:
- Superadmin: `admin@demo.com` / `Admin123!`
- Instructor: `instructor@demo.com` / `Instructor123!`
- User: `user@demo.com` / `User123!`

## Deploy to Vercel (free)
1. Push this repo to GitHub
2. Vercel → New Project → Import repo
3. Set environment variables in Vercel Project Settings:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `APP_BASE_URL` (your Vercel URL)
4. Deploy

## Notes
- This is “MERN-lite”: Next.js API routes are used instead of a separate Express server to simplify free deployment on Vercel.
- File uploads are implemented as URL-based for MVP (instructors paste a file URL). For real uploads, add S3/R2/Cloudinary.
