import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fbjjaqdbaavuomlkawjf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamphcWRiYWF2dW9tbGthd2pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNjY3MjEsImV4cCI6MjA3NDk0MjcyMX0._d2fEnphMZaoKoE8-c2zOdN-5ynvnP8ID5_K_WCW7Ws';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
