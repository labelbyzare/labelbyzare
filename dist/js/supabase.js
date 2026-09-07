const SUPABASE_URL = "https://ldpzgtjbnbdsggaqmuvs.supabase.co/rest/v1/";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_DG3Iar3m4BUg72fUWPyLag_XMyHfLWs";

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);