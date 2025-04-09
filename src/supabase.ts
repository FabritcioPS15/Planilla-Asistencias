import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aixtoyektrlelzhyxuuc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpeHRveWVrdHJsZWx6aHl4dXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxOTcxNDIsImV4cCI6MjA1ODc3MzE0Mn0.T3dk1xfdCs0m1R9CC2lJ1VnNgJOOMwYd7crd7sPJqD8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

