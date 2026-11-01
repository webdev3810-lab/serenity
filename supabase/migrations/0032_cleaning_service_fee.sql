-- Use AUD 100 as the starting cleaning fee for new properties.
-- Existing property fees remain editable in the admin dashboard.
alter table public.properties alter column cleaning_fee set default 100;
