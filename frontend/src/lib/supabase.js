import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://pdgtryghvibhmmroqvdk.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZ3RyeWdodmliaG1tcm9xdmRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxOTA1MzUsImV4cCI6MjA5MDc2NjUzNX0.t8SlfkkSDDbjYIMkgnwRyelXleSP7Rn4BFNtbMgHsVo";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
