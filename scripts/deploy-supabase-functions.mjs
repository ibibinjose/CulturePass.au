#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { exit } from 'process';

function runCommand(command, description) {
  try {
    console.log(`\n${description}`);
    console.log(`Running: ${command}\n`);
    
    const result = execSync(command, { 
      stdio: 'inherit',
      encoding: 'utf-8'
    });
    
    return result;
  } catch (error) {
    console.error(`❌ Error executing command: ${command}`);
    console.error(error.message);
    exit(1);
  }
}

function checkSupabaseConfig() {
  const configPath = './supabase/config.toml';
  if (!existsSync(configPath)) {
    console.error('❌ Supabase config file not found at ./supabase/config.toml');
    console.error('   Run `supabase init` first to initialize Supabase in your project');
    exit(1);
  }
  return readFileSync(configPath, 'utf-8');
}

function listAndDeployFunctions() {
  try {
    console.log('📋 Listing available functions...');
    const functionsList = execSync('supabase functions list', { encoding: 'utf-8' });
    console.log(functionsList);
    
    // Extract function names from the list - parse the table format
    const lines = functionsList.split('\n');
    const functionNames = [];
    
    // Look for data rows after the header
    let headerFound = false;
    for (const line of lines) {
      // Identify header line
      if (line.includes('ID | NAME | SLUG') || line.includes('NAME        | SLUG')) {
        headerFound = true;
        continue;
      }
      
      // Skip separator lines (contain dashes and pipes)
      if (headerFound && (line.includes('---|-----|----') || line.includes('--------------------------------------'))) {
        continue;
      }
      
      // Process data lines that contain actual function information
      if (headerFound && line.trim() && line.includes('|')) {
        // Split by pipe and clean up whitespace
        const parts = line.split('|').map(part => part.trim());
        
        // We expect format: ID | NAME | SLUG | STATUS | VERSION | UPDATED_AT
        // So parts[1] = NAME, parts[2] = SLUG
        if (parts.length >= 3) {
          const name = parts[1]; // NAME column
          const slug = parts[2]; // SLUG column
          
          // Verify this is actual data, not header text
          if (name && name !== 'NAME' && !name.includes('-') && 
              slug && slug !== 'SLUG' && !slug.includes('-')) {
            // Prefer the slug over the name for deployment
            functionNames.push(slug);
          } else if (name && name !== 'NAME' && !name.includes('-') && 
                     !functionNames.includes(name)) {
            // Fallback to name if slug wasn't valid
            functionNames.push(name);
          }
        }
      }
    }
    
    // If we couldn't parse from the table, fall back to scanning the filesystem
    if (functionNames.length === 0) {
      try {
        const functionsDir = './supabase/functions';
        if (existsSync(functionsDir)) {
          const fs = require('fs');
          const dirs = readdirSync(functionsDir).filter(item => {
            const itemPath = `${functionsDir}/${item}`;
            return existsSync(itemPath) && fs.statSync(itemPath).isDirectory();
          });
          console.log(`Found functions in filesystem: ${dirs.join(', ')}`);
          return dirs;
        }
      } catch (e) {
        console.error('Error scanning functions directory:', e.message);
      }
      
      // Ultimate fallback
      console.log('Using default function: hello-world');
      return ['hello-world'];
    }
    
    console.log(`Found functions to deploy: ${functionNames.join(', ')}`);
    return functionNames;
  } catch (error) {
    console.error('⚠️  Could not list functions from Supabase:', error.message);
    
    // Fallback: scan the filesystem for function directories
    try {
      const functionsDir = './supabase/functions';
      if (existsSync(functionsDir)) {
        const fs = require('fs');
        const dirs = readdirSync(functionsDir).filter(item => {
          const itemPath = `${functionsDir}/${item}`;
          return existsSync(itemPath) && fs.statSync(itemPath).isDirectory();
        });
        console.log(`Found functions in filesystem: ${dirs.join(', ')}`);
        return dirs;
      }
    } catch (fsError) {
      console.error('Error scanning functions directory:', fsError.message);
    }
    
    console.log('Using default function: hello-world');
    return ['hello-world']; // Default fallback
  }
}

function main() {
  console.log('🚀 Starting Supabase Functions Deployment...\n');
  
  // Check if supabase CLI is installed
  try {
    execSync('supabase --version', { stdio: 'pipe' });
    console.log('✅ Supabase CLI is installed\n');
  } catch (error) {
    console.error('❌ Supabase CLI is not installed. Please install it first:\n');
    console.error('  brew install supabase/tap/supabase');
    console.error('  # Or visit https://supabase.com/docs/guides/cli/getting-started');
    exit(1);
  }

  // Check for Supabase config
  console.log('🔍 Checking Supabase configuration...');
  checkSupabaseConfig();
  console.log('✅ Supabase configuration found\n');

  // Check if project is linked to remote
  let projectId = null;
  try {
    const remoteConfig = execSync('cat supabase/.branches/main/project-id 2>/dev/null || echo "not-linked"', { encoding: 'utf-8' });
    if (remoteConfig && remoteConfig !== 'not-linked') {
      projectId = remoteConfig.trim();
      console.log(`✅ Project is linked to remote: ${projectId}`);
    }
  } catch (error) {
    // Project not linked
  }

  if (!projectId) {
    console.log('⚠️  Project is not linked to a remote Supabase project');
    console.log('   You can link your project using: supabase link --project-ref <project-ref>');
    console.log('   Get your project-ref from your Supabase Dashboard project settings\n');
  }

  // Get list of functions to deploy
  const functionsToDeploy = listAndDeployFunctions();

  console.log('\n📦 Deploying Supabase Functions...');
  
  if (projectId) {
    // Deploy each function to remote
    console.log('Deploying to remote project...');
    for (const functionName of functionsToDeploy) {
      console.log(`\nDeploying function: ${functionName}`);
      try {
        runCommand(
          `supabase functions deploy ${functionName} --no-verify-jwt`,
          `Deploying function ${functionName} to remote Supabase project`
        );
      } catch (error) {
        console.log(`⚠️  Failed to deploy ${functionName}, continuing with others...`);
      }
    }
  } else {
    console.log('\n⚠️  No remote project linked, showing available local commands:');
    console.log('   To link to a remote project:');
    console.log('   1. Get your project reference from Supabase Dashboard');
    console.log('   2. Run: supabase link --project-ref <your-project-ref>');
    console.log('   3. Then re-run this script\n');
    
    console.log('   For local development and testing:');
    console.log('   - Start local Supabase: supabase start');
    console.log('   - Serve functions locally: supabase functions serve');
    console.log('   - Deploy individual function: supabase functions deploy <function-name> --no-verify-jwt');
    console.log('   - Deploy all functions locally: (run this command for each function in supabase/functions/)');
  }

  console.log('\n🎯 Local development:');
  console.log('   To test locally, make sure Supabase is running:');
  console.log('   supabase start');
  console.log('   Then serve your functions:');
  console.log('   supabase functions serve');
  console.log('   Your functions will be available at:');
  console.log('   http://localhost:54321/functions/v1/<function-name>\n');

  console.log('✅ Supabase Functions deployment process completed!');
  console.log('\n📋 Next steps:');
  console.log('   • Check your deployed functions in the Supabase Dashboard (if deployed remotely)');
  console.log('   • Test your functions using the generated URLs');
  console.log('   • Monitor logs in the Supabase Dashboard for any issues');
  console.log('   • Update your frontend code to use the deployed function URLs if needed');
}

// Execute the main function directly
main();