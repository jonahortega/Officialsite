/**
 * Script to verify Supabase connection
 * Run this with: node verify-supabase-connection.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log('\n🔍 Verifying Supabase Connection...\n');

// Check if credentials are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env file!');
  console.error('\nPlease ensure your .env file contains:');
  console.error('REACT_APP_SUPABASE_URL=your_project_url');
  console.error('REACT_APP_SUPABASE_ANON_KEY=your_anon_key\n');
  process.exit(1);
}

console.log('✅ Credentials found in .env file');
console.log(`   URL: ${supabaseUrl.substring(0, 30)}...`);
console.log(`   Key: ${supabaseAnonKey.substring(0, 30)}...\n`);

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test connection by querying a table
async function testConnection() {
  try {
    console.log('🔄 Testing connection...\n');
    
    // Try to query events table (most likely to exist)
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id')
      .limit(1);
    
    if (eventsError) {
      console.error('❌ Connection failed!');
      console.error(`   Error: ${eventsError.message}\n`);
      
      if (eventsError.message.includes('relation') || eventsError.message.includes('does not exist')) {
        console.log('💡 Tip: The events table might not exist yet.');
        console.log('   Run your SQL setup scripts in Supabase SQL Editor.\n');
      } else if (eventsError.message.includes('JWT') || eventsError.message.includes('Invalid API key')) {
        console.log('💡 Tip: Check that your anon key is correct in .env file.\n');
      } else if (eventsError.message.includes('Failed to fetch') || eventsError.message.includes('network')) {
        console.log('💡 Tip: Check that your project URL is correct and the project is active.\n');
      }
      
      process.exit(1);
    }
    
    console.log('✅ Connection successful!');
    console.log(`   Found ${events?.length || 0} events in database\n`);
    
    // Try to query registrations table
    const { data: registrations, error: regError } = await supabase
      .from('registrations')
      .select('id')
      .limit(1);
    
    if (regError) {
      console.log('⚠️  Warning: registrations table not found');
      console.log('   Run SUPABASE_QR_TICKET_SETUP.sql in Supabase SQL Editor\n');
    } else {
      console.log(`✅ registrations table exists (${registrations?.length || 0} registrations found)\n`);
    }
    
    console.log('🎉 Your Supabase project is connected and ready to use!\n');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

testConnection();


