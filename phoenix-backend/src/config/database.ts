import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './env';

class DatabaseService {
  private supabase: SupabaseClient;
  private supabaseAdmin: SupabaseClient;

  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.anonKey);
    this.supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey);
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
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw new Error((error as Error).message);
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error((error as Error).message);
    return data;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw new Error((error as Error).message);
  }

  async getCurrentUser() {
    const { data: { user }, error } = await this.supabase.auth.getUser();
    if (error) throw new Error((error as Error).message);
    return user;
  }

  // User profile methods
  async getUserProfile(userId: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw new Error((error as Error).message);
    return data;
  }

  async updateUserProfile(userId: string, updates: any) {
    const { data, error } = await this.supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error((error as Error).message);
    return data;
  }

  // API Keys management
  async getUserApiKeys(userId: string) {
    const { data, error } = await this.supabase
      .from('user_api_keys')
      .select('id, broker_name, created_at, is_active')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error((error as Error).message);
    return data || [];
  }

  async addUserApiKey(userId: string, keyData: any) {
    const { data, error } = await this.supabaseAdmin
      .from('user_api_keys')
      .insert({
        user_id: userId,
        ...keyData,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error((error as Error).message);
    return data;
  }

  async deleteUserApiKey(userId: string, keyId: string) {
    const { error } = await this.supabaseAdmin
      .from('user_api_keys')
      .delete()
      .eq('user_id', userId)
      .eq('id', keyId);

    if (error) throw new Error((error as Error).message);
  }

  // Orders
  async getUserOrders(userId: string) {
    const { data, error } = await this.supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error((error as Error).message);
    return data || [];
  }

  async addUserOrder(userId: string, orderData: any) {
    const { data, error } = await this.supabase
      .from('orders')
      .insert({
        user_id: userId,
        ...orderData,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error((error as Error).message);
    return data;
  }

  // Admin methods
  async getAllUsers() {
    const { data, error } = await this.supabaseAdmin
      .from('users')
      .select('id, email, role, created_at, last_login')
      .order('created_at', { ascending: false });

    if (error) throw new Error((error as Error).message);
    return data || [];
  }

  async updateUserRole(userId: string, role: string) {
    const { data, error } = await this.supabaseAdmin
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error((error as Error).message);
    return data;
  }
}

export const databaseService = new DatabaseService();
