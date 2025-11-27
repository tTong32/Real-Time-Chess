import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metric for error rate
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 users
    { duration: '1m', target: 20 },   // Stay at 20 users
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },  // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    errors: ['rate<0.1'],            // Error rate should be less than 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Test signup endpoint
  const signupPayload = JSON.stringify({
    email: `test${__VU}${__ITER}@example.com`,
    password: 'password123',
  });

  const signupParams = {
    headers: { 'Content-Type': 'application/json' },
  };

  const signupRes = http.post(`${BASE_URL}/api/auth/signup`, signupPayload, signupParams);
  
  check(signupRes, {
    'signup status is 201': (r) => r.status === 201,
    'signup has message': (r) => r.body && JSON.parse(r.body).message,
  }) || errorRate.add(1);

  sleep(1);

  // Test login endpoint (if user was created)
  if (signupRes.status === 201) {
    const loginPayload = JSON.stringify({
      email: `test${__VU}${__ITER}@example.com`,
      password: 'password123',
    });

    const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, signupParams);
    
    check(loginRes, {
      'login status is 200 or 403': (r) => r.status === 200 || r.status === 403, // 403 if email not verified
      'login has token or error': (r) => {
        const body = JSON.parse(r.body);
        return body.token || body.error;
      },
    }) || errorRate.add(1);
  }

  sleep(1);

  // Test public endpoint (if available)
  const publicRes = http.get(`${BASE_URL}/api/health`);
  
  check(publicRes, {
    'public endpoint status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);
}

