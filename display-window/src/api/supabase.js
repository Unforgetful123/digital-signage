import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rjbelogvoqozgxrmfykh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqYmVsb2d2b3Fvemd4cm1meWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MTA3NDcsImV4cCI6MjA2MzM4Njc0N30.JucARshM-DSMv18X0hduLoZpFBqFGABGQX56zNARu1s';
export const supabase = createClient(supabaseUrl, supabaseKey);
