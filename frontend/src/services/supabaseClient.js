import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kzvltpdjxccsgirnrzlc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6dmx0cGRqeGNjc2dpcm5yemxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4ODk2MDAsImV4cCI6MjA3MjQ2NTYwMH0.T8n_9B2L46M496N_Jl0H6E9HjVJK9m3hF5X78iGj0Cg';

export const supabase = SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('FILL')
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
