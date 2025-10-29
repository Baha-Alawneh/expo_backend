# Expo Backend API

Backend API for the Expo project built with Node.js, Express, MySQL, and AWS S3.

## 🚨 CRITICAL SECURITY NOTICE

**IMMEDIATELY** regenerate all credentials in your `.env` file:

- Create new AWS access keys
- Change database password
- Generate new JWT secret
- Update email app password

**DO NOT** commit the `.env` file to version control. It's already in `.gitignore`.

## Features

- ✅ User authentication with JWT (7-day expiration)
- ✅ Student profile management
- ✅ Project management with image uploads
- ✅ Email verification system
- ✅ File uploads to AWS S3
- ✅ Rate limiting on sensitive endpoints
- ✅ Input validation middleware
- ✅ Role-based authorization
- ✅ Database connection pooling
- ✅ Health check endpoint

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MySQL (AWS RDS)
- **Storage:** AWS S3
- **Authentication:** JWT
- **Email:** Nodemailer (Gmail)

## Project Structure

```
expo_backend/
├── config/           # Configuration files
│   ├── db.js         # Database connection pool
│   └── multer.js     # File upload configuration
├── controllers/      # Route controllers
│   ├── userController.js
│   ├── studentController.js
│   ├── projectController.js
│   └── verificationController.js
├── middleware/       # Custom middleware
│   ├── auth.js       # Authentication & authorization
│   ├── validation.js # Input validation
│   └── rateLimiter.js # Rate limiting
├── models/           # Database models
│   ├── User.js
│   ├── Student.js
│   └── Project.js
├── routes/           # API routes
│   ├── userRoutes.js
│   ├── studentRoutes.js
│   └── projectRouts.js
├── .env              # Environment variables (DO NOT COMMIT)
├── .env.example      # Environment variables template
├── .gitignore
├── index.js          # Application entry point
└── package.json
```

## Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd expo_backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   - Copy `.env.example` to `.env`
   - Fill in all required values with your own credentials

4. **Start the server**

   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## API Endpoints

### Base URL

- Development: `http://localhost:5000/api/v1`

### Authentication

All protected routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### User Routes (`/api/v1/users`)

- `POST /register` - Register new user
- `POST /login` - Login user
- `POST /send-code` - Send verification code (rate limited: 5/15min)
- `POST /verify-code` - Verify email code

### Student Routes (`/api/v1/students`) - Protected

- `GET /profile/:user_id` - Get student profile
- `PUT /profile/:user_id` - Update student profile
- `POST /profile/:user_id/upload` - Upload photo/CV (rate limited: 20/hour)
- `DELETE /profile/:user_id/file` - Delete photo or CV

### Project Routes (`/api/v1/projects`) - Protected

- `GET /myproject/:user_id` - Get student project
- `POST /myproject/:user_id` - Create new project
- `PUT /myproject/:user_id` - Update project
- `POST /myproject/:user_id/upload` - Upload project images (rate limited: 20/hour)

### Health Check

- `GET /health` - Server health status

## Environment Variables

See `.env.example` for all required variables.

### Key Variables:

- `JWT_SECRET` - Secret key for JWT signing (use a long random string)
- `MYSQL_*` - Database connection details
- `AWS_*` - AWS credentials and S3 configuration
- `EMAIL_USER`, `EMAIL_PASS` - Email service credentials
- `CORS_ORIGIN` - Allowed CORS origin (use specific domain in production)

## Security Features

1. **JWT Authentication** - 7-day token expiration
2. **Rate Limiting**
   - Login: 10 attempts / 15 minutes
   - Verification codes: 5 attempts / 15 minutes
   - File uploads: 20 uploads / hour
3. **Input Validation** - All user inputs validated
4. **Authorization** - Users can only access their own data
5. **CORS Protection** - Configurable origin restriction
6. **Request Size Limits** - 10MB max payload
7. **File Type Validation** - Only images and PDFs allowed
8. **Database Transactions** - Ensures data consistency

## File Upload Limits

- **Max file size:** 10MB per file
- **Allowed types:** Images (JPEG, PNG, etc.) and PDF
- **Student files:** 1 photo + 1 CV
- **Project images:** Up to 10 images

## Rate Limits

- **General API:** 100 requests / 15 minutes
- **Login:** 10 attempts / 15 minutes
- **Email codes:** 5 attempts / 15 minutes
- **File uploads:** 20 uploads / hour

## Database Schema

### Users Table

- user_id (UUID, PK)
- name
- email (unique)
- password_hash
- role (student, company, admin)
- created_at

### Students Table

- student_id (UUID, PK)
- user_id (FK → Users)
- university_id
- major
- year_of_study
- skills (JSON)
- bio
- photo_name
- cv_name
- project_id (FK → Projects)

### Projects Table

- project_id (UUID, PK)
- student_id (FK → Students)
- title
- description
- video_url
- github_link
- project_photos (JSON array)
- status
- booth

## Production Checklist

- [ ] Regenerate ALL credentials in `.env`
- [ ] Set `NODE_ENV=production`
- [ ] Configure `CORS_ORIGIN` to frontend domain
- [ ] Use HTTPS for API
- [ ] Set up proper logging (Winston/Pino)
- [ ] Implement Redis for verification codes
- [ ] Add database backups
- [ ] Set up monitoring (PM2, New Relic, etc.)
- [ ] Review and adjust rate limits
- [ ] Add API documentation (Swagger)

## Known Limitations

- Verification codes stored in memory (use Redis for production)
- Rate limiting is in-memory (use Redis for multiple instances)
- No password reset functionality yet
- No pagination on list endpoints

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Private project - All rights reserved
