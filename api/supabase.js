import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ywrlhvzfefvyogfxfdhl.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cmxodnpmZWZ2eW9nZnhmZGhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTQzMjUzNzUsImV4cCI6MTczMjA1MTM3NX0.W1ZjFBm9rPyT_GYF8jR3D7UE-D7O0OhI5_0fkp3A0Uo";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
