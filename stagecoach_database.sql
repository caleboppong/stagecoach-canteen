-- Stagecoach Canteen Supabase database setup
-- 1) Run this in Supabase SQL Editor.
-- 2) Create a public Storage bucket called: canteen-images
-- 3) Add your first admin manually at the bottom by replacing the email.

create extension if not exists pgcrypto;

create table if not exists public.admins (
  email text primary key,
  created_by text,
  created_at timestamptz default now()
);

create table if not exists public.canteen_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  price numeric(10,2) not null default 0,
  image_url text,
  available boolean not null default true,
  stock integer not null default 0,
  description text,
  created_at timestamptz default now()
);

create table if not exists public.canteen_product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.canteen_products(id) on delete cascade,
  image_url text not null,
  created_at timestamptz default now()
);

create table if not exists public.canteen_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  customer_name text not null,
  customer_phone text not null,
  department text,
  notes text,
  total_price numeric(10,2) not null default 0,
  status text not null default 'new',
  created_at timestamptz default now()
);

create table if not exists public.canteen_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.canteen_orders(id) on delete cascade,
  product_id uuid references public.canteen_products(id),
  product_name text,
  quantity integer not null,
  price numeric(10,2) not null
);

alter table public.admins enable row level security;
alter table public.canteen_products enable row level security;
alter table public.canteen_product_images enable row level security;
alter table public.canteen_orders enable row level security;
alter table public.canteen_order_items enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.admins where email = lower(auth.jwt() ->> 'email'));
$$;

drop policy if exists "Anyone can view canteen products" on public.canteen_products;
create policy "Anyone can view canteen products" on public.canteen_products for select to public using (true);
drop policy if exists "Admins can manage canteen products" on public.canteen_products;
create policy "Admins can manage canteen products" on public.canteen_products for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Anyone can view canteen product images" on public.canteen_product_images;
create policy "Anyone can view canteen product images" on public.canteen_product_images for select to public using (true);
drop policy if exists "Admins can manage canteen product images" on public.canteen_product_images;
create policy "Admins can manage canteen product images" on public.canteen_product_images for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Anyone can create canteen orders" on public.canteen_orders;
create policy "Anyone can create canteen orders" on public.canteen_orders for insert to public with check (true);
drop policy if exists "Admins can view canteen orders" on public.canteen_orders;
create policy "Admins can view canteen orders" on public.canteen_orders for select to authenticated using (public.is_admin());

drop policy if exists "Anyone can create canteen order items" on public.canteen_order_items;
create policy "Anyone can create canteen order items" on public.canteen_order_items for insert to public with check (true);
drop policy if exists "Admins can view canteen order items" on public.canteen_order_items;
create policy "Admins can view canteen order items" on public.canteen_order_items for select to authenticated using (public.is_admin());

drop policy if exists "Admins can manage admin list" on public.admins;
create policy "Admins can manage admin list" on public.admins for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Users can check own admin status" on public.admins;
create policy "Users can check own admin status" on public.admins for select to authenticated using (email = lower(auth.jwt() ->> 'email') or public.is_admin());

-- Storage policies for public bucket canteen-images
drop policy if exists "Public can view canteen images" on storage.objects;
create policy "Public can view canteen images" on storage.objects for select using (bucket_id = 'canteen-images');
drop policy if exists "Admins can upload canteen images" on storage.objects;
create policy "Admins can upload canteen images" on storage.objects for insert to authenticated with check (bucket_id = 'canteen-images' and public.is_admin());

insert into public.canteen_products (name, category, price, image_url, available, stock, description) values
('Chicken Jollof Rice', 'Rice Dishes', 6.50, '/stagecoach-logo.png', true, 30, 'Jollof rice served with chicken.'),
('Beef Stew and Rice', 'Main Meals', 7.00, '/stagecoach-logo.png', true, 25, 'Rice served with rich beef stew.'),
('Tuna Sandwich Meal', 'Sandwiches', 4.50, '/stagecoach-logo.png', true, 40, 'Fresh sandwich meal for staff lunch.'),
('Tea and Pastry', 'Breakfast', 3.00, '/stagecoach-logo.png', true, 50, 'Hot tea with pastry.')
on conflict do nothing;

-- Replace this with your real admin login email, then run it once.
insert into public.admins (email, created_by) values ('maroppcal@gmail.com', 'initial setup') on conflict do nothing;
