-- אורה CRM · הקשחה אחרי בדיקות האבטחה וה-QA

-- ---------- 1. אי אפשר "לנעול" את חשבונות ההדגמה ----------

-- מנהלת לא משנה ולא מוחקת את השורה של עצמה (גם לא דרך פנייה ישירה ל-API)
drop policy if exists staff_admin_write on staff;
create policy staff_admin_insert on staff for insert to authenticated with check (is_admin());
create policy staff_admin_update on staff for update to authenticated
  using (is_admin() and id <> (select auth.uid()))
  with check (is_admin() and id <> (select auth.uid()));
create policy staff_admin_delete on staff for delete to authenticated
  using (is_admin() and id <> (select auth.uid()));

-- הסיסמה והמייל של חשבונות ההדגמה לא משתנים, גם אם מישהו מנסה דרך Supabase Auth
create or replace function protect_demo_accounts() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.email in ('rotem@clinic-ora.co.il', 'liat@clinic-ora.co.il', 'neta@clinic-ora.co.il') then
    new.encrypted_password := old.encrypted_password;
    new.email := old.email;
    new.email_change := '';
  end if;
  return new;
end $$;
revoke all on function protect_demo_accounts() from public, anon, authenticated;
drop trigger if exists protect_demo_accounts on auth.users;
create trigger protect_demo_accounts before update on auth.users
  for each row execute function protect_demo_accounts();

-- האיפוס מחזיר גם את הצוות למצב המקורי ומסיר חברות צוות שנוספו
create or replace function restore_demo_staff() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from staff s using auth.users u
   where u.id = s.id
     and u.email not in ('rotem@clinic-ora.co.il', 'liat@clinic-ora.co.il', 'neta@clinic-ora.co.il');
  update staff s set role = 'admin', specialty = 'face', is_active = true
    from auth.users u where u.id = s.id and u.email = 'rotem@clinic-ora.co.il';
  update staff s set role = 'therapist', specialty = 'laser', is_active = true
    from auth.users u where u.id = s.id and u.email = 'liat@clinic-ora.co.il';
  update staff s set role = 'therapist', specialty = 'injection', is_active = true
    from auth.users u where u.id = s.id and u.email = 'neta@clinic-ora.co.il';
end $$;
revoke all on function restore_demo_staff() from public, anon, authenticated;

create or replace function reset_demo() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;
  delete from clients;          -- קודם, כדי שאין הפניות לחברות צוות שיימחקו
  perform restore_demo_staff();
  perform seed_demo();
  update staff set onboarding_version = 0;
end $$;
revoke all on function reset_demo() from public, anon;
grant execute on function reset_demo() to authenticated;

-- ---------- 2. "מי יצרה / מי אישרה" תמיד המשתמשת המחוברת ----------
create or replace function stamp_actor() returns trigger
language plpgsql set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return new; end if;   -- סקריפט הדגמה / מערכת
  if tg_table_name in ('clients', 'appointments', 'service_calls') then
    if tg_op = 'INSERT' then new.created_by := uid; else new.created_by := old.created_by; end if;
  end if;
  if tg_table_name = 'appointments' and new.contraindication_ack_by is not null
     and (tg_op = 'INSERT' or new.contraindication_ack_by is distinct from old.contraindication_ack_by) then
    new.contraindication_ack_by := uid;
  end if;
  if tg_table_name = 'medical_profiles' then new.updated_by := uid; end if;
  return new;
end $$;
create trigger clients_stamp before insert or update on clients for each row execute function stamp_actor();
create trigger appts_stamp before insert or update on appointments for each row execute function stamp_actor();
create trigger calls_stamp before insert or update on service_calls for each row execute function stamp_actor();
create trigger medical_stamp before insert or update on medical_profiles for each row execute function stamp_actor();

-- ---------- 3. כללים עסקיים מדויקים יותר ----------
-- נייד (05) ו-07: 10 ספרות. נייח (02/03/04/08/09): 9 ספרות
alter table clients drop constraint if exists clients_phone_check;
alter table clients add constraint clients_phone_check
  check (phone ~ '^(0[57][0-9]{8}|0[2-489][0-9]{7})$');

-- "בוצע" מחייב סיכום טיפול (PRD פרק 8)
alter table appointments add constraint done_needs_summary
  check (status <> 'done' or length(trim(coalesce(summary, ''))) > 0);

-- ---------- 4. היגיינה ----------
alter function touch_updated_at() set search_path = public;
alter function normalize_phone() set search_path = public;
alter function call_timestamps() set search_path = public;
