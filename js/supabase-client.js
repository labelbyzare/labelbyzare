// supabase-client.js
// Include this AFTER the Supabase CDN script on every page that needs auth.
//
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// <script src="supabase-client.js"></script>

const SUPABASE_URL = "https://ldpzgtjbnbdsggaqmuvs.supabase.co"; // from Supabase dashboard > Project Settings > API
const SUPABASE_ANON_KEY = "sb_publishable_DG3Iar3m4BUg72fUWPyLag_XMyHfLWs"; // from same page — this is safe to expose client-side

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
