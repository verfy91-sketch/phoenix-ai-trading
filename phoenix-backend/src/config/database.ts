import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './env';

class DatabaseService {
  private supabase: SupabaseClient;
  private supabaseAdmin: SupabaseClient;

  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.anonKey, {
      auth: { persistSession: false }
    });
    this.supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: { persistSession: false }
    });
  }

  // Public client (with RLS policies)
  getPublicClient(): SupabaseClient {
    return this.supabase;
  }

  // Admin client (bypasses RLS)
  getAdminClient(): SupabaseClient {
    return this.supabaseAdmin;
  }

  // Auth methods
  async signUp(email: string, password: string) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('Database error in signUp:', error);
        throw new Error(`Failed to sign up: ${error.message}`);
      }
      return data;
    } catch (err) {
      console.error('Unexpected error in signUp:', err);
      throw new Error(`Unexpected error during sign up: ${(err as Error).message}`);
    }
  }

  async signIn(email: string, password: string) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Database error in signIn:', error);
        throw new Error(`Failed to sign in: ${error.message}`);
      }
      return data;
    } catch (err) {
      console.error('Unexpected error in signIn:', err);
      throw new Error(`Unexpected error during sign in: ${(err as Error).message}`);
    }
  }

  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        console.error('Database error in signOut:', error);
        throw new Error(`Failed to sign out: ${error.message}`);
      }
    } catch (err) {
      console.error('Unexpected error in signOut:', err);
      throw new Error(`Unexpected error during sign out: ${(err as Error).message}`);
    }
  }

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      if (error) {
        console.error('Database error in getCurrentUser:', error);
        throw new Error(`Failed to get current user: ${error.message}`);
      }
      return user;
    } catch (err) {
      console.error('Unexpected error in getCurrentUser:', err);
      throw new Error(`Unexpected error getting current user: ${(err as Error).message}`);
    }
  }

  // User profile methods
  async getUserProfile(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Database error in getUserProfile:', error);
        throw new Error(`Failed to get user profile: ${error.message}`);
      }
      return data;
    } catch (err) {
      console.error('Unexpected error in getUserProfile:', err);
      throw new Error(`Unexpected error getting user profile: ${(err as Error).message}`);
    }
  }

  async updateUserProfile(userId: string, updates: any) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Database error in updateUserProfile:', error);
        throw new Error(`Failed to update user profile: ${error.message}`);
      }
      return data;
    } catch (err) {
      console.error('Unexpected error in updateUserProfile:', err);
      throw new Error(`Unexpected error updating user profile: ${(err as Error).message}`);
    }
  }

  // API Keys management
  async getUserApiKeys(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('user_api_keys')
        .select('id, broker_name, created_at, is_active')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error in getUserApiKeys:', error);
        throw new Error(`Failed to get API keys: ${error.message}`);
      }
      return data || [];
    } catch (err) {
      console.error('Unexpected error in getUserApiKeys:', err);
      throw new Error(`Unexpected error getting API keys: ${(err as Error).message}`);
    }
  }

  async addUserApiKey(userId: string, keyData: any) {
    try {
      const { data, error } = await this.supabaseAdmin
        .from('user_api_keys')
        .insert({
          user_id: userId,
          ...keyData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Database error in addUserApiKey:', error);
        throw new Error(`Failed to add API key: ${error.message}`);
      }
      return data;
    } catch (err) {
      console.error('Unexpected error in addUserApiKey:', err);
      throw new Error(`Unexpected error adding API key: ${(err as Error).message}`);
    }
  }

  async deleteUserApiKey(userId: string, keyId: string) {
    try {
      const { error } = await this.supabaseAdmin
        .from('user_api_keys')
        .delete()
        .eq('user_id', userId)
        .eq('id', keyId);

      if (error) {
        console.error('Database error in deleteUserApiKey:', error);
        throw new Error(`Failed to delete API key: ${error.message}`);
      }
    } catch (err) {
      console.error('Unexpected error in deleteUserApiKey:', err);
      throw new Error(`Unexpected error deleting API key: ${(err as Error).message}`);
    }
  }

  // Orders
  async getUserOrders(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error in getUserOrders:', error);
        throw new Error(`Failed to get orders: ${error.message}`);
      }
      return data || [];
    } catch (err) {
      console.error('Unexpected error in getUserOrders:', err);
      throw new Error(`Unexpected error getting orders: ${(err as Error).message}`);
    }
  }

  async addUserOrder(userId: string, orderData: any) {
    try {
      const { data, error } = await this.supabaseAdmin
        .from('orders')
        .insert({
          user_id: userId,
          ...orderData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Database error in addUserOrder:', error);
        throw new Error(`Failed to add order: ${error.message}`);
      }
      return data;
    } catch (err) {
      console.error('Unexpected error in addUserOrder:', err);
      throw new Error(`Unexpected error adding order: ${(err as Error).message}`);
    }
  }

  // Admin methods
  async getAllUsers() {
    try {
      const { data, error } = await this.supabaseAdmin
        .from('users')
        .select('id, email, role, created_at, last_login')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error in getAllUsers:', error);
        throw new Error(`Failed to get all users: ${error.message}`);
      }
      return data || [];
    } catch (err) {
      console.error('Unexpected error in getAllUsers:', err);
      throw new Error(`Unexpected error getting all users: ${(err as Error).message}`);
    }
  }

  async updateUserRole(userId: string, userRole: string) {
    try {
      const { data, error } = await this.supabaseAdmin
        .from('users')
        .update({ role: userRole })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Database error in updateUserRole:', error);
        throw new Error(`Failed to update user role: ${error.message}`);
      }
      return data;
    } catch (err) {
      console.error('Unexpected error in updateUserRole:', err);
      throw new Error(`Unexpected error updating user role: ${(err as Error).message}`);
    }
  }
}

export const databaseService = new DatabaseService();
