import { renderHook } from '@testing-library/react';
import { useAuthStore } from '@/lib/store/useAuthStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.getState().logout();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useAuthStore());
    
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('can login user', () => {
    const { result } = renderHook(() => useAuthStore());
    
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'user' as const,
      isActive: true,
      createdAt: '2024-01-01',
    };
    
    result.current.login(mockUser, 'mock-token');
    
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe('mock-token');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('can logout user', () => {
    const { result } = renderHook(() => useAuthStore());
    
    // First login
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'user' as const,
      isActive: true,
      createdAt: '2024-01-01',
    };
    
    result.current.login(mockUser, 'mock-token');
    expect(result.current.isAuthenticated).toBe(true);
    
    // Then logout
    result.current.logout();
    
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('can update user data', () => {
    const { result } = renderHook(() => useAuthStore());
    
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'user' as const,
      isActive: true,
      createdAt: '2024-01-01',
    };
    
    result.current.login(mockUser, 'mock-token');
    
    // Update user data
    result.current.updateUser({ firstName: 'Updated' });
    
    expect(result.current.user?.firstName).toBe('Updated');
    expect(result.current.user?.lastName).toBe('User'); // Other fields unchanged
  });
});
