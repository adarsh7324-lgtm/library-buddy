import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://olqwlikslvyvypnrmlcb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9scXdsaWtzbHZ5dnlwbnJtbGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTk0MjIsImV4cCI6MjA4ODM5NTQyMn0.FZVqnkB6tkqGJO5MQNQZJ6bAlt73sDSccKTWC87m3mw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
