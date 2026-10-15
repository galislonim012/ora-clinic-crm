-- אורה CRM · מבנה בסיס הנתונים (לפי פרקים 7-9 ב-PRD)
create extension if not exists btree_gist with schema extensions;

-- ---------- types ----------
create type staff_role as enum ('admin', 'therapist', 'reception');
create type client_source as enum ('instagram', 'facebook', 'website', 'referral', 'other');
create type treatment_category as enum ('face', 'injection', 'laser', 'consult');
create type appt_status as enum ('future', 'done', 'cancelled');
create type cancel_reason as enum ('client', 'clinic', 'no_show');
create type confirmation_status as enum ('not_sent', 'reminder_sent', 'confirmed');
create type call_status as enum ('new', 'in_progress', 'closed');
create type call_channel as enum ('instagram', 'facebook', 'whatsapp', 'website', 'phone', 'walk_in', 'ai_agent');
create type package_status as enum ('active', 'completed');

-- ---------- tables ----------
create table staff (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role staff_role not null default 'therapist',
  specialty treatment_category,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) >= 2),
  phone text not null unique check (phone ~ '^0[0-9]{8,9}$'),
  source client_source,
  notes text,
  no_show_count int not null default 0,
  created_by uuid references staff (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table treatment_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  duration_min int not null check (duration_min between 10 and 240),
  category treatment_category not null,
  renewal_days int check (renewal_days > 0),
  contraindications text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table treatment_packages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  treatment_type_id uuid not null references treatment_types (id),
  total_sessions int not null check (total_sessions between 2 and 20),
  used_sessions int not null default 0,
  status package_status not null default 'active',
  created_at timestamptz not null default now()
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  treatment_type_id uuid not null references treatment_types (id),
  staff_id uuid not null references staff (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status appt_status not null default 'future',
  cancel_reason cancel_reason,
  summary text,
  confirmation confirmation_status not null default 'not_sent',
  package_id uuid references treatment_packages (id) on delete set null,
  contraindication_ack_by uuid references staff (id),
  created_by uuid references staff (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- ביטול מחייב סיבה, וסיבה קיימת רק בביטול
  constraint cancel_reason_matches check ((status = 'cancelled') = (cancel_reason is not null)),
  -- אין חפיפה בין שני תורים פעילים של אותה מטפלת
  constraint no_overlap exclude using gist (
    staff_id with =, tstzrange(starts_at, ends_at) with &&
  ) where (status <> 'cancelled')
);

create table service_calls (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  description text not null check (length(trim(description)) >= 3),
  topic treatment_category,
  status call_status not null default 'new',
  assignee_id uuid not null references staff (id),
  channel call_channel,
  resolution text,
  first_response_at timestamptz,
  closed_at timestamptz,
  created_by uuid references staff (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- סגירה מחייבת משפט סיכום
  constraint closed_needs_resolution check (status <> 'closed' or length(trim(coalesce(resolution, ''))) > 0)
);

create table medical_profiles (
  client_id uuid primary key references clients (id) on delete cascade,
  declaration_signed_at date,
  conditions text[] not null default '{}',
  allergies text,
  medications text,
  updated_by uuid references staff (id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);

create table activity_log (
  id bigint generated always as identity primary key,
  actor uuid default auth.uid(),
  action text not null,
  entity text not null,
  entity_id uuid,
  at timestamptz not null default now()
);

create index on appointments (client_id, starts_at desc);
create index on appointments (staff_id, starts_at);
create index on service_calls (client_id);
create index on service_calls (assignee_id, status);
create index on treatment_packages (client_id);

-- ---------- helpers for policies ----------
create function app_role() returns staff_role
language sql stable security definer set search_path = public as $$
  select role from staff where id = auth.uid() and is_active
$$;

create function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where id = auth.uid() and is_active)
$$;

create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(app_role() = 'admin', false)
$$;

create function is_clinician() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(app_role() in ('admin', 'therapist'), false)
$$;

-- ---------- business-rule triggers ----------
create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger clients_touch before update on clients for each row execute function touch_updated_at();
create trigger appts_touch before update on appointments for each row execute function touch_updated_at();
create trigger calls_touch before update on service_calls for each row execute function touch_updated_at();
create trigger medical_touch before update on medical_profiles for each row execute function touch_updated_at();

-- טלפון בפורמט אחיד: רק ספרות, 972 הופך ל-0
create function normalize_phone() returns trigger language plpgsql as $$
begin
  new.phone := regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g');
  if new.phone like '972%' then new.phone := '0' || substr(new.phone, 4); end if;
  return new;
end $$;
create trigger clients_phone before insert or update of phone on clients
  for each row execute function normalize_phone();

-- משך התור לפי סוג הטיפול, שעות פעילות, ו"בוצע" רק אחרי שהתור התחיל
create function appointment_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  dur int;
  local_start timestamp;
  local_end timestamp;
  dow int;
begin
  select duration_min into dur from treatment_types where id = new.treatment_type_id;
  new.ends_at := new.starts_at + make_interval(mins => dur);

  if tg_op = 'INSERT' or new.starts_at is distinct from old.starts_at
     or new.treatment_type_id is distinct from old.treatment_type_id then
    local_start := new.starts_at at time zone 'Asia/Jerusalem';
    local_end := new.ends_at at time zone 'Asia/Jerusalem';
    dow := extract(dow from local_start);
    if dow = 6
       or local_start::time < time '09:00'
       or (dow = 5 and local_end::time > time '13:00')
       or (dow <> 5 and local_end::time > time '19:00')
       or local_end::date <> local_start::date then
      raise exception 'OUTSIDE_HOURS' using hint = 'א׳-ה׳ 09:00-19:00, ו׳ 09:00-13:00';
    end if;
  end if;

  if new.status = 'done' and new.starts_at > now() then
    raise exception 'DONE_BEFORE_START';
  end if;
  if new.status <> 'cancelled' then new.cancel_reason := null; end if;
  return new;
end $$;
create trigger appts_rules before insert or update on appointments
  for each row execute function appointment_rules();

-- סדרות ומונה הברזות מתעדכנים לבד
create function appointment_rollups() returns trigger
language plpgsql security definer set search_path = public as $$
declare pkg uuid; cli uuid;
begin
  for pkg in select unnest(array[new.package_id, case when tg_op = 'UPDATE' then old.package_id end]) loop
    if pkg is not null then
      update treatment_packages p set
        used_sessions = (select count(*) from appointments a where a.package_id = p.id and a.status = 'done'),
        status = case when (select count(*) from appointments a where a.package_id = p.id and a.status = 'done') >= p.total_sessions
                      then 'completed'::package_status else 'active'::package_status end
      where p.id = pkg;
    end if;
  end loop;
  cli := new.client_id;
  update clients c set no_show_count =
    (select count(*) from appointments a where a.client_id = c.id and a.cancel_reason = 'no_show')
  where c.id = cli;
  return null;
end $$;
create trigger appts_rollups after insert or update on appointments
  for each row execute function appointment_rollups();

-- זמן תגובה ראשונה וזמן סגירה בקריאות
create function call_timestamps() returns trigger language plpgsql as $$
begin
  if new.status = 'in_progress' and new.first_response_at is null then new.first_response_at := now(); end if;
  if new.status = 'closed' then
    new.closed_at := coalesce(new.closed_at, now());
    new.first_response_at := coalesce(new.first_response_at, now());
  else
    new.closed_at := null;
  end if;
  return new;
end $$;
create trigger calls_timestamps before insert or update on service_calls
  for each row execute function call_timestamps();

-- תיעוד שינויים במידע רפואי
create function log_medical() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into activity_log (actor, action, entity, entity_id)
  values (auth.uid(), lower(tg_op), 'medical_profile', new.client_id);
  return new;
end $$;
create trigger medical_log after insert or update on medical_profiles
  for each row execute function log_medical();

-- ---------- row level security ----------
alter table staff enable row level security;
alter table clients enable row level security;
alter table treatment_types enable row level security;
alter table treatment_packages enable row level security;
alter table appointments enable row level security;
alter table service_calls enable row level security;
alter table medical_profiles enable row level security;
alter table activity_log enable row level security;

-- staff
create policy staff_read on staff for select to authenticated using (is_staff());
create policy staff_admin_write on staff for all to authenticated using (is_admin()) with check (is_admin());

-- clients: כל הצוות קורא, יוצר ומעדכן. מחיקה רק למנהלת
create policy clients_read on clients for select to authenticated using (is_staff());
create policy clients_insert on clients for insert to authenticated with check (is_staff());
create policy clients_update on clients for update to authenticated using (is_staff()) with check (is_staff());
create policy clients_delete on clients for delete to authenticated using (is_admin());

-- treatment types: קריאה לכולן, עריכה למנהלת
create policy tt_read on treatment_types for select to authenticated using (is_staff());
create policy tt_admin on treatment_types for all to authenticated using (is_admin()) with check (is_admin());

-- packages: מטפלות ומנהלת
create policy pkg_read on treatment_packages for select to authenticated using (is_staff());
create policy pkg_write on treatment_packages for insert to authenticated with check (is_clinician());
create policy pkg_update on treatment_packages for update to authenticated using (is_clinician()) with check (is_clinician());
create policy pkg_delete on treatment_packages for delete to authenticated using (is_admin());

-- appointments: כולן רואות את היומן. מטפלת עורכת תורים שלה או שהיא קבעה
create policy appt_read on appointments for select to authenticated using (is_staff());
create policy appt_insert on appointments for insert to authenticated with check (is_staff());
create policy appt_update on appointments for update to authenticated
  using (is_admin() or app_role() = 'reception' or staff_id = auth.uid() or created_by = auth.uid())
  with check (is_staff());
create policy appt_delete on appointments for delete to authenticated using (is_admin());

-- service calls: כולן רואות. עדכון למנהלת או לאחראית
create policy calls_read on service_calls for select to authenticated using (is_staff());
create policy calls_insert on service_calls for insert to authenticated with check (is_staff());
create policy calls_update on service_calls for update to authenticated
  using (is_admin() or assignee_id = auth.uid())
  with check (is_staff());
create policy calls_delete on service_calls for delete to authenticated using (is_admin());

-- medical: רק מנהלת ומטפלות
create policy med_read on medical_profiles for select to authenticated using (is_clinician());
create policy med_insert on medical_profiles for insert to authenticated with check (is_clinician());
create policy med_update on medical_profiles for update to authenticated using (is_clinician()) with check (is_clinician());

-- activity log: מנהלת בלבד קוראת
create policy log_read on activity_log for select to authenticated using (is_admin());

-- מבקרים לא מחוברים לא מקבלים שום גישה
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon, public;
grant execute on function app_role(), is_staff(), is_admin(), is_clinician() to authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke execute on functions from anon, public;

-- ---------- guard: כל טבלה עתידית נסגרת אוטומטית ----------
create or replace function public.rls_auto_enable() returns event_trigger
language plpgsql security definer set search_path = pg_catalog as $$
declare cmd record;
begin
  for cmd in select * from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if cmd.schema_name = 'public' then
      execute format('alter table %s enable row level security', cmd.object_identity);
    end if;
  end loop;
end; $$;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
drop event trigger if exists ensure_rls;
create event trigger ensure_rls on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function public.rls_auto_enable();
