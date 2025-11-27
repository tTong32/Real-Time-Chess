# Testing Guide

This document describes the testing infrastructure for Real-Time Chess.

## Test Types

### 1. Unit Tests

Unit tests are located alongside the code they test:
- **Frontend**: `frontend/src/components/*.test.tsx`
- **Backend**: `backend/src/**/*.test.ts`

Run unit tests:
```bash
# All unit tests
npm run test:unit

# Frontend only
npm run test:unit:frontend

# Backend only
npm run test:unit:backend
```

### 2. End-to-End (E2E) Tests

E2E tests use Playwright and are located in `e2e/`:
- `e2e/auth.spec.ts` - Authentication flows
- `e2e/matchmaking.spec.ts` - Matchmaking flows
- `e2e/accessibility.spec.ts` - Accessibility checks

Run E2E tests:
```bash
# Run all E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run specific test
npx playwright test e2e/auth.spec.ts
```

**Prerequisites:**
- Frontend dev server must be running (or will auto-start)
- Backend server should be running for full integration

### 3. Integration Tests

Integration tests test API endpoints and Socket.IO connections:
- `backend/src/tests/integration/api.test.ts` - API endpoint tests
- `backend/src/tests/integration/socket.test.ts` - Socket.IO tests

Run integration tests:
```bash
npm run test:integration
```

**Note:** These tests require a test database to be set up.

### 4. Security Tests

Security tests check for common vulnerabilities:
- `backend/src/tests/security/auth.test.ts` - Authentication security

Run security tests:
```bash
npm run test:security
```

### 5. Load Tests

Load tests use k6 to test system performance:
- `load-tests/k6-basic.js` - Basic HTTP load test
- `load-tests/k6-socket.js` - WebSocket load test

Run load tests:
```bash
# Install k6 first (see below)
npm run test:load
npm run test:load:socket
```

## Setting Up Load Testing

### Install k6

**Windows (using Chocolatey):**
```powershell
choco install k6
```

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
# Debian/Ubuntu
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Or download from:** https://k6.io/docs/getting-started/installation/

### Running Load Tests

```bash
# Basic HTTP load test
k6 run load-tests/k6-basic.js

# WebSocket load test
k6 run load-tests/k6-socket.js

# With custom base URL
BASE_URL=http://localhost:3000 k6 run load-tests/k6-basic.js

# With more virtual users
k6 run --vus 100 --duration 30s load-tests/k6-basic.js
```

## Test Coverage

Generate coverage reports:
```bash
# Frontend
cd frontend && npm run test:coverage

# Backend
cd backend && npm run test:coverage
```

## Continuous Integration

All tests should pass before merging:
1. Unit tests (fast, run on every commit)
2. Integration tests (medium speed, run on PR)
3. E2E tests (slower, run on PR)
4. Security tests (run on PR)
5. Load tests (run manually or on schedule)

## Writing New Tests

### Unit Tests
- Use Vitest for both frontend and backend
- Place tests next to the code they test
- Follow existing test patterns

### E2E Tests
- Use Playwright
- Test user flows, not implementation details
- Use data-testid attributes for reliable selectors

### Integration Tests
- Test API endpoints with real database
- Test Socket.IO events end-to-end
- Clean up test data after tests

### Security Tests
- Test input validation
- Test authentication/authorization
- Test rate limiting
- Test for common vulnerabilities (SQL injection, XSS, etc.)

## Troubleshooting

### E2E Tests Failing
- Ensure frontend dev server is running or auto-start is enabled
- Check that backend server is running
- Verify test selectors match current UI

### Integration Tests Failing
- Ensure test database is set up
- Check database connection string
- Verify test data cleanup

### Load Tests Failing
- Ensure backend server is running
- Check server can handle the load
- Adjust thresholds in k6 config if needed

