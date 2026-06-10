/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to convert snake_case to camelCase
export function toCamelCase<T extends Record<string, any>>(obj: T): any {
  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  }
  
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    acc[camelKey] = toCamelCase(obj[key]);
    return acc;
  }, {} as any);
}

// Helper function to convert camelCase to snake_case
export function toSnakeCase<T extends Record<string, any>>(obj: T): any {
  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCase(item));
  }
  
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  return Object.keys(obj).reduce((acc, key) => {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    acc[snakeKey] = toSnakeCase(obj[key]);
    return acc;
  }, {} as any);
}
