#!/usr/bin/env node

console.log('Test script running!');

import { execSync } from 'child_process';

try {
  const version = execSync('supabase --version', { encoding: 'utf-8' });
  console.log('Supabase version:', version);
} catch (error) {
  console.log('Supabase not found or error occurred:', error.message);
}

console.log('Test script completed.');