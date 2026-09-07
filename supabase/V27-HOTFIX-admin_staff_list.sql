-- Label by Zare v27 migration hotfix
-- Safe: this drops only the admin_staff_list RPC function, not any table/data.

drop function if exists public.admin_staff_list();

-- After this succeeds, run the COMPLETE updated admin-dashboard-setup.sql file.
