import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth';
import { LoginCredentials, RegisterData, User } from '@/types/user';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export const useAuth = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { login, logout, setLoading, updateUser } = useAuthStore();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        login(data.data.user, data.data.token);
        toast.success('Login successful');
        router.push('/dashboard');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Login failed');
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        login(data.data.user, data.data.token);
        toast.success('Registration successful');
        router.push('/dashboard');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Registration failed');
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      logout();
      queryClient.clear();
      toast.success('Logged out successfully');
      router.push('/auth/login');
    },
    onError: (error: any) => {
      // Force logout even if API call fails
      logout();
      queryClient.clear();
      router.push('/auth/login');
    },
  });

  // Get profile query
  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: authApi.getProfile,
    enabled: false, // Only run when manually refetched
    retry: false,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: ({ data }: { data: Partial<User> }) => authApi.updateProfile(data),
    onSuccess: (data) => {
      if (data.success && data.data) {
        updateUser(data.data);
        toast.success('Profile updated successfully');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { 
      currentPassword: string; 
      newPassword: string; 
    }) => authApi.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      toast.success('Password changed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to change password');
    },
  });

  // Forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: ({ email }: { email: string }) => authApi.forgotPassword(email),
    onSuccess: () => {
      toast.success('Password reset instructions sent to your email');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to send reset instructions');
    },
  });

  const handleLogin = (credentials: LoginCredentials) => {
    loginMutation.mutate(credentials);
  };

  const handleRegister = (data: RegisterData) => {
    registerMutation.mutate(data);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const refreshProfile = () => {
    profileQuery.refetch();
  };

  const handleUpdateProfile = (data: Partial<User>) => {
    updateProfileMutation.mutate({ data });
  };

  const handleChangePassword = (currentPassword: string, newPassword: string) => {
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const handleForgotPassword = async (email: string) => {
    forgotPasswordMutation.mutate({ email });
  };

  return {
    // Mutations
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    updateProfile: handleUpdateProfile,
    changePassword: handleChangePassword,
    forgotPassword: handleForgotPassword,
    refreshProfile,

    // Query
    profile: profileQuery.data?.data,
    user: profileQuery.data?.data,

    // Loading states
    isLoading: loginMutation.isPending || registerMutation.isPending,
    isUpdatingProfile: updateProfileMutation.isPending,
    isChangingPassword: changePasswordMutation.isPending,
  };
};
