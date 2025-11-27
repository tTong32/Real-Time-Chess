# Deployment Guide

This guide covers deploying Real-Time Chess to production.

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL database (local or cloud)
- Email service credentials (SendGrid, AWS SES, etc.)
- Domain name (optional)
- Hosting provider account (Railway, AWS, Vercel, etc.)

## Environment Variables

### Backend (.env)

```env
# Server
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:password@host:5432/realtimechess

# Authentication
JWT_SECRET=your-very-secure-secret-key-here
JWT_EXPIRES_IN=7d

# Email Service
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key

# Sentry (Error Tracking)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### Frontend (.env)

```env
VITE_API_URL=https://api.yourdomain.com
```

## Docker Deployment

### Production Build

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Development Build

```bash
# Use development compose file
docker-compose -f docker-compose.dev.yml up
```

## Database Setup

### Initial Migration

```bash
# Run migrations
cd backend
npx prisma migrate deploy

# Or with Docker
docker-compose exec backend npx prisma migrate deploy
```

### Seed Data (Optional)

```bash
# If you have seed data
npx prisma db seed
```

## Hosting Options

### Railway

1. Connect your GitHub repository
2. Add environment variables in Railway dashboard
3. Railway will auto-detect Docker and deploy

### AWS (ECS/Fargate)

1. Build and push Docker images to ECR
2. Create ECS task definition
3. Set up load balancer
4. Configure environment variables

### Vercel (Frontend) + Railway (Backend)

1. Deploy frontend to Vercel:
   ```bash
   npm i -g vercel
   cd frontend
   vercel
   ```

2. Deploy backend to Railway (see above)

3. Update `VITE_API_URL` in Vercel environment variables

### Docker Swarm / Kubernetes

See `docker-compose.yml` for service definitions. Adapt for your orchestration platform.

## CI/CD Setup

### GitHub Actions

The repository includes GitHub Actions workflows:
- `.github/workflows/ci.yml` - Runs tests on every push/PR
- `.github/workflows/deploy.yml` - Deploys on main branch

### Required Secrets

Add these to GitHub Secrets:
- `DOCKER_USERNAME` - Docker Hub username (if using)
- `DOCKER_PASSWORD` - Docker Hub password
- `DOCKER_REGISTRY` - Docker registry URL
- `RAILWAY_TOKEN` - Railway API token (if using Railway)
- `VERCEL_TOKEN` - Vercel token (if using Vercel)

## Monitoring

### Sentry Setup

1. Create account at [sentry.io](https://sentry.io)
2. Create a new project
3. Copy the DSN
4. Add to `SENTRY_DSN` environment variable

### Logging

Logs are written to:
- Console (stdout/stderr)
- `logs/error.log` - Error logs
- `logs/combined.log` - All logs
- `logs/exceptions.log` - Uncaught exceptions
- `logs/rejections.log` - Unhandled promise rejections

In production, use log aggregation services:
- AWS CloudWatch
- Datadog
- Logtail
- Papertrail

## Health Checks

The backend includes a health check endpoint:
```
GET /health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Use this for:
- Load balancer health checks
- Container orchestration health checks
- Monitoring services

## SSL/HTTPS

### Using a Reverse Proxy (Recommended)

Use nginx or Traefik as a reverse proxy:

```nginx
# nginx.conf
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then use Let's Encrypt for SSL:
```bash
certbot --nginx -d yourdomain.com
```

### Using Cloudflare

1. Add your domain to Cloudflare
2. Enable SSL/TLS (Full mode)
3. Point DNS to your server

## Scaling

### Horizontal Scaling

- Use a load balancer (nginx, AWS ALB, etc.)
- Run multiple backend instances
- Use Redis for Socket.IO scaling (if needed)

### Database Scaling

- Use connection pooling (already configured in Prisma)
- Consider read replicas for heavy read workloads
- Use database connection limits

## Backup Strategy

### Database Backups

```bash
# Manual backup
pg_dump -h localhost -U postgres realtimechess > backup.sql

# Restore
psql -h localhost -U postgres realtimechess < backup.sql
```

### Automated Backups

Set up cron job or use managed database backup service.

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Check container status
docker-compose ps
```

### Database connection issues

1. Verify `DATABASE_URL` is correct
2. Check database is accessible
3. Verify network connectivity in Docker

### Socket.IO not working

1. Check CORS settings
2. Verify WebSocket support in reverse proxy
3. Check firewall rules

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT_SECRET
- [ ] Enable HTTPS
- [ ] Set up firewall rules
- [ ] Keep dependencies updated
- [ ] Enable rate limiting
- [ ] Set up monitoring/alerts
- [ ] Regular security audits
- [ ] Backup strategy in place

## Support

For issues or questions:
- Check logs: `docker-compose logs`
- Review error tracking in Sentry
- Check health endpoint: `/health`

