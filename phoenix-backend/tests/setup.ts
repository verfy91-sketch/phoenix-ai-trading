import { config } from '../src/config/env';

// Mock Redis for tests
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue('OK'),
    exists: jest.fn().mockResolvedValue(false),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue('OK'),
    quit: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  }));
});

// Mock Supabase for tests
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockImplementation(() => ({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null }),
        }),
        order: jest.fn().mockReturnValue({
          ascending: jest.fn().mockReturnValue({}),
        }),
        range: jest.fn().mockReturnValue({}),
        limit: jest.fn().mockReturnValue({}),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: 'test-id' } }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { updated: true } }),
            }),
          }),
        }),
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null }),
          }),
        }),
        ilike: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null }),
        }),
        upsert: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
      auth: {
        signInWithPassword: jest.fn().mockResolvedValue({ 
          data: { 
            id: 'test-user',
            email: 'test@example.com',
            role: 'user'
          } 
        }),
        signUp: jest.fn().mockResolvedValue({ 
          data: { 
            id: 'test-user',
            email: 'test@example.com'
          } 
        }),
        signOut: jest.fn().mockResolvedValue({}),
        getUser: jest.fn().mockResolvedValue({ 
          data: { 
            id: 'test-user',
            email: 'test@example.com'
          } 
        }),
      },
    }),
  })),
}));

// Set environment variables for tests
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-chars';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars';
