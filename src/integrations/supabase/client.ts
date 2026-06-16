// Redirection to custom MySQL API Client
import { apiClient } from '@/utils/apiClient';

export const supabase = apiClient as any;