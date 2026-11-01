-- Apply the corporate accommodation discount to existing properties and new houses.
-- Existing nonzero property-specific rates remain intact.
alter table public.properties alter column corporate_discount set default 10;

update public.properties
set corporate_discount = 10
where corporate_discount = 0;
