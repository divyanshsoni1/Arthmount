# Arthmount

> A production-grade investment platform built to manage investment workflows, user portfolios, KYC verification, wallet operations, transactions, withdrawals, and administrative operations.

---

## Overview

**Arthmount** is a full-stack investment platform designed to provide a secure and scalable environment for managing investment-related workflows.

The platform includes separate experiences for users and administrators, with support for authentication, KYC verification, investment packages, wallet management, payments, withdrawals, transaction tracking, and operational dashboards.

The application is built with a modern full-stack architecture focused on:

* Secure authentication and authorization
* Reliable financial transaction workflows
* Asynchronous background processing
* Scalable database architecture
* Secure document and media storage
* Responsive user and admin interfaces
* Production-ready error handling and validation

---

## Key Features

### User Platform

* User registration and login
* Email/phone-based OTP verification
* Secure authentication
* Google OAuth authentication
* User profile management
* KYC verification workflow
* Aadhaar document upload
* PAN document upload
* Live selfie capture
* Investment package browsing
* Investment workflow
* Wallet management
* Add money functionality
* Razorpay payment integration
* Withdrawal requests
* Transaction history
* Profit analytics
* Investment portfolio tracking
* Responsive dashboard experience

---

### KYC Verification

Arthmount provides a complete KYC workflow that supports:

* Aadhaar card verification workflow
* PAN card verification workflow
* Front and back document uploads
* Live selfie capture using the device camera
* Secure file storage
* Signed URL-based access to protected KYC files
* Admin-side KYC review and verification

Sensitive KYC documents are handled using secure storage and controlled access mechanisms.

---

### Admin Platform

The admin dashboard provides operational visibility into the platform.

Features include:

* User management
* KYC management
* Investment package management
* Investment monitoring
* Transaction management
* Withdrawal management
* Wallet operations
* Portfolio monitoring
* Trading calendar management
* Financial analytics
* Profit monitoring
* Activity monitoring
* Dashboard statistics
* Role-based access control

---

## Technology Stack

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* TanStack Query
* Framer Motion
* Lucide React

### Backend

* Next.js App Router
* TypeScript
* NextAuth
* REST API architecture
* Server-side validation
* Role-based authorization

### Database

* PostgreSQL
* Prisma ORM

### Caching & Background Processing

* Redis
* Redis-based queues
* Standalone OTP worker

The OTP processing system uses an asynchronous queue-based architecture to prevent OTP delivery operations from blocking the primary application request cycle.

### Storage

* S3-compatible object storage
* MinIO

Used for secure storage of documents and KYC-related media.

### Payments

* Razorpay

Used for payment processing and wallet funding workflows.

### Deployment

* Vercel
* Railway
* PostgreSQL hosting
* Redis infrastructure

---

## System Architecture

The application follows a modular full-stack architecture.

```text
                    ┌─────────────────────┐
                    │      Client App     │
                    │   Next.js Frontend  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Next.js Backend  │
                    │   API / Server Side │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
        ┌──────────┐     ┌──────────┐     ┌──────────┐
        │PostgreSQL│     │  Redis   │     │ Storage  │
        │ Database │     │  Queue   │     │  MinIO   │
        └──────────┘     └─────┬────┘     └──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   OTP Worker        │
                    │ Async Background Job│
                    └─────────────────────┘
```

---

# Security Practices

Arthmount handles sensitive user and financial workflows. The following security principles are followed:

* Secrets are stored in environment variables
* Sensitive credentials are never committed to Git
* Role-based authorization is enforced
* Protected routes require authentication
* User input is validated server-side
* Sensitive KYC files use controlled access
* Signed URLs are used for protected storage resources
* Rate limiting is applied where required
* OTP requests are protected against abuse
* Database queries are handled through Prisma
* Payment workflows are validated server-side
* Financial operations are recorded through transaction records

---

# Project Structure

A simplified project structure:

```text
arthmount/
├── app/
│   ├── (auth)/
│   ├── (dashboard)/
│   ├── admin/
│   ├── api/
│   └── ...
│
├── components/
│   ├── ui/
│   ├── dashboard/
│   ├── admin/
│   └── ...
│
├── hooks/
│
├── lib/
│   ├── auth/
│   ├── db/
│   ├── redis/
│   ├── storage/
│   ├── payments/
│   └── ...
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── workers/
│   └── otp-worker/
│
├── public/
│
├── types/
│
├── .env.example
├── package.json
└── README.md
```

> The actual structure may differ depending on the current implementation.

---

# Production Deployment

Arthmount uses a multi-service deployment architecture.

### Web Application

The Next.js application can be deployed using a platform such as:

```text
Vercel
```

### Background Worker

The OTP worker requires a persistent Node.js process and should be deployed separately using a service capable of running long-lived processes.

Example:

```text
Railway
```

---

# Engineering Principles

The project follows these principles:

### Reliability

Critical operations should be designed to handle failures gracefully.

### Security

Authentication, authorization, validation, and data protection are considered throughout the application.

### Scalability

Background processing and asynchronous queues are used for operations that should not block the main request lifecycle.

### Maintainability

The codebase is organized into reusable modules and follows consistent development practices.

### Observability

Errors and important system operations should be logged and monitored to simplify debugging and production support.

---

# License

This project is proprietary software.

Unauthorized copying, distribution, modification, or commercial use of this project is prohibited without explicit permission from the project owner.

---

## Built With

**Next.js · React · TypeScript · PostgreSQL · Prisma · Redis · NextAuth · Razorpay · MinIO · Tailwind CSS**

---

**Arthmount — Building reliable digital investment infrastructure.**
