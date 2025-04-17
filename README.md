# Accountability Buddy Backend 

The **Accountability Buddy Backend** is the core server-side application for the Accountability Buddy platform. This backend powers features such as goal tracking, user authentication, notifications, payments, and real-time communication.

---

## Table of Contents

1. [Features](#features)
2. [Technologies Used](#technologies-used)
3. [Getting Started](#getting-started)
4. [Configuration](#configuration)
5. [Scripts](#scripts)
6. [Environments](#environments)
7. [API Documentation](#api-documentation)
8. [Testing](#testing)
9. [Contributing](#contributing)
10. [License](#license)

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
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment files:
   ```bash
   cp .env.development.example .env.development
   cp .env.test.example .env.test
   cp .env.production.example .env.production
   ```

4. Update each environment file with your configuration.

---

## Configuration

This project uses `dotenv-flow` to manage multiple environment files:

- `.env.development`: Development settings
- `.env.test`: Testing environment settings
- `.env.production`: Production deployment values

Each environment file must include critical variables like:

```env
MONGO_URI=your_mongo_uri
ACCESS_TOKEN_SECRET=your_jwt_secret
REFRESH_TOKEN_SECRET=your_refresh_secret
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

You can validate these via `src/utils/validateEnv.ts`.

---

## Scripts

| Script         | Description                                |
|----------------|--------------------------------------------|
| `npm run dev`  | Start development server with `nodemon`    |
| `npm run build`| Compile TypeScript to JavaScript           |
| `npm run start`| Start production server                    |
| `npm test`     | Run all tests                              |
| `npm run lint` | Run ESLint for code quality                |
| `npm run format`| Run Prettier to auto-format code           |

---

## Environments

### Development
```bash
npm run dev
```
- Uses `.env.development`
- Swagger available at: `http://localhost:5050/api-docs`

### Testing
```bash
npm test
```
- Uses `.env.test`
- Disables remote logging and certain async jobs

### Production
```bash
npm run build
NODE_ENV=production npm start
```
- Uses `.env.production`
- Optimized for deployment (AWS, Docker, etc.)

---

## API Documentation

Visit Swagger UI at:
```
http://localhost:5050/api-docs
```
Generated using `swagger-jsdoc` and `swagger-ui-express`.

---

## Testing

- Unit and integration tests are written using:
  - `jest`
  - `supertest`

Run:
```bash
npm run test
```

---

## Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -am 'Add feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Create a pull request

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
