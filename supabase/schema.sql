-- Таблица товаров
create table if not exists products (
  id               bigserial primary key,
  vendor_code      text not null,
  nm_id            bigint unique not null,
  name             text not null default '',
  category         text not null default '',
  brand            text not null default '',
  price            integer,
  discount         integer,
  discounted_price integer,
  wb_stock         integer not null default 0,
  my_stock         integer not null default 0,
  min_stock        integer not null default 5,
  updated_at       timestamptz default now()
);

-- Таблица поставок
create table if not exists supplies (
  id             bigserial primary key,
  vendor_code    text not null references products(vendor_code),
  quantity       integer not null check (quantity > 0),
  supplier       text,
  purchase_price numeric(10,2),
  total          numeric(12,2),
  comment        text,
  date           date not null default current_date,
  created_at     timestamptz default now()
);

-- Таблица настроек (хранит API-ключ)
create table if not exists settings (
  key   text primary key,
  value text not null
);

-- Включаем RLS (Row Level Security)
alter table products enable row level security;
alter table supplies enable row level security;
alter table settings enable row level security;

-- Политики: полный доступ для аутентифицированных пользователей
-- (для личного использования через anon key можно разрешить всё)
create policy "Allow all for anon" on products for all using (true) with check (true);
create policy "Allow all for anon" on supplies for all using (true) with check (true);
create policy "Allow all for anon" on settings for all using (true) with check (true);
