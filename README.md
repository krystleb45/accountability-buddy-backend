# Accountability Buddy Backend

The **Accountability Buddy Backend** is the core server-side application for the Accountability Buddy platform. This backend powers features such as goal tracking, user authentication, notifications, payments, and real-time communication.

---

## Table of Contents

1. [Features](#features)
2. [Technologies Used](#technologies-used)
3. [Getting Started](#getting-started)
4. [Configuration](#configuration)
5. [Scripts](#scripts)
6. [API Documentation](#api-documentation)
7. [Testing](#testing)
8. [Contributing](#contributing)
9. [License](#license)

---

## Features

- **User Authentication**: Secure user login, registration, and role-based access control (RBAC).
- **Goal Management**: CRUD operations for user goals with progress tracking and analytics.
- **Notifications**: Real-time notifications using WebSockets and push notifications.
- **Payment Integration**: Subscription-based payments powered by Stripe.
- **Multi-Language Support**: Localization using `i18next`.
- **Real-Time Communication**: Group and private chat features with Socket.IO.
- **Military Support Section**: Dedicated support for military users, including peer chatrooms and external resources.
- **Security**: Middleware for rate limiting, sanitization, and prevention of common attacks (e.g., XSS, SQL injection).

---

## Technologies Used

- **Runtime**: [Node.js](https://nodejs.org)
- **Framework**: [Express.js](https://expressjs.com)
- **Database**: [MongoDB](https://www.mongodb.com) with [Mongoose](https://mongoosejs.com)
- **Authentication**: [Passport.js](https://www.passportjs.org) and JWT
- **Real-Time**: [Socket.IO](https://socket.io)
- **Payment Gateway**: [Stripe](https://stripe.com)
- **Queue Management**: [Bull](https://optimalbits.github.io/bull/)
- **Email Service**: [Nodemailer](https://nodemailer.com)
- **Testing**: [Jest](https://jestjs.io) and [Supertest](https://github.com/visionmedia/supertest)
- **Deployment**: AWS-optimized configuration

---

## Getting Started

### Prerequisites

- **Node.js**: v18.x or higher
- **npm**: v8.x or higher
- **MongoDB**: Ensure a running MongoDB instance
- **Redis**: Required for caching and queues
- **Stripe**: Set up a Stripe account and API keys

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/accountability-buddy-backend.git
   cd accountability-buddy-backend
