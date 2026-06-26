#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { exit } from 'process';

function runCommand(command, description) {
  try {
    const result = execSync(command, { 
      stdio: 'pipe',
      encoding: 'utf-8'
    });
    return result.trim();
  } catch (error) {
    return null;
  }
}

function main() {
  console.log('🔍 Checking Supabase Configuration...\n');
  
  // Check if supabase CLI is installed
  const supabaseVersion = runCommand('supabase --version', 'Checking Supabase CLI');
  if (!supabaseVersion) {
    console.error('❌ Supabase CLI is not installed');
    console.log('Install it with: brew install supabase/tap/supabase');
    exit(1);
  }
  console.log(`✅ Supabase CLI: ${supabaseVersion}`);

  // Check if config file exists
  if (!existsSync('./supabase/config.toml')) {
    console.error('❌ Supabase config file not found');
    exit(1);
  }
  console.log('✅ Config file found');

  // Check for functions directory
  if (!existsSync('./supabase/functions')) {
    console.error('❌ Functions directory not found');
    exit(1);
  }
  
  // Count functions
  const functionsDir = readdirSync('./supabase/functions');
  console.log(`✅ Found ${functionsDir.length} function(s):`, functionsDir.join(', '));

  // Check if linked to remote project
  const projectId = runCommand('cat supabase/.branches/main/project-id 2>/dev/null || echo "not-linked"');
  if (projectId && projectId !== 'not-linked') {
    console.log(`✅ Linked to remote project: ${projectId.substring(0, 8)}...`);
  } else {
    console.log('⚠️  Not linked to a remote project (local-only mode)');
  }

  // Check if local Supabase is running
  try {
    const status = runCommand('supabase status');
    if (status && status.includes('Started')) {
      console.log('✅ Local Supabase is running');
    } else {
      console.log('ℹ️  Local Supabase is not running (this is OK for deployment)');
    }
  } catch (error) {
    console.log('ℹ️  Local Supabase is not running (this is OK for deployment)');
  }

  // Check Deno installation (needed for functions)
  const denoVersion = runCommand('deno --version', 'Checking Deno');
  if (denoVersion) {
    console.log(`✅ Deno: ${denoVersion}`);
  } else {
    console.log('⚠️  Deno not found - required for Supabase Edge Functions');
    console.log('   Install Deno: https://deno.land/manual/getting_started/installation');
  }

  console.log('\n🎉 Supabase configuration check completed!');
  console.log('\n💡 Ready to deploy functions! Run:');
  console.log('   npm run functions:deploy');
}

// Execute the main function directly
main();