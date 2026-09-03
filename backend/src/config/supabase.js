const { createClient } = require('@supabase/supabase-js');
const config = require('./index');

let supabaseAdmin = null;
let supabaseAnon = null;

try {
  if (config.supabase.url && config.supabase.serviceRoleKey && !config.supabase.serviceRoleKey.includes('FILL_IN')) {
    supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
} catch (e) {
  console.warn('Supabase admin client disabled:', e.message);
}

try {
  if (config.supabase.url && config.supabase.anonKey && !config.supabase.anonKey.includes('FILL_IN')) {
    supabaseAnon = createClient(config.supabase.url, config.supabase.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
} catch (e) {
  console.warn('Supabase anon client disabled:', e.message);
}

module.exports = {
  supabaseAdmin,
  supabaseAnon,
  supabaseAvailable: !!supabaseAdmin,
};
