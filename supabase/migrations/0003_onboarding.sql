-- הדרכת פתיחה: לכל משתמשת נשמרת גרסת ההדרכה האחרונה שסיימה (או דילגה עליה)
alter table staff add column if not exists onboarding_version int not null default 0;

-- משתמשת מעדכנת רק את עצמה, ורק את השדה הזה
create or replace function complete_onboarding(v int) returns void
language sql security definer set search_path = public as $$
  update staff set onboarding_version = greatest(onboarding_version, v) where id = auth.uid();
$$;
revoke all on function complete_onboarding(int) from public, anon;
grant execute on function complete_onboarding(int) to authenticated;

-- איפוס ההדגמה מחזיר גם את ההדרכה, כדי שהבודק יראה אותה בכניסה הראשונה
create or replace function reset_demo() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;
  perform seed_demo();
  update staff set onboarding_version = 0;
end $$;
revoke all on function reset_demo() from public, anon;
grant execute on function reset_demo() to authenticated;
