-- 0006: תיקון stamp_actor מ-0004.
-- התנאי הישן קרא את new.contraindication_ack_by באותו ביטוי עם בדיקת שם הטבלה,
-- ולכן נפל ("record new has no field") כשהטריגר רץ על טבלה בלי השדה הזה.
-- כל שמירה של משתמשת מחוברת שעברה דרכו נכשלה (למשל קביעת תור).

create or replace function stamp_actor() returns trigger
language plpgsql set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return new; end if;   -- סקריפט הדגמה / מערכת
  if tg_table_name in ('clients', 'appointments', 'service_calls') then
    if tg_op = 'INSERT' then new.created_by := uid; else new.created_by := old.created_by; end if;
  end if;
  if tg_table_name = 'appointments' then
    if new.contraindication_ack_by is not null then
      if tg_op = 'INSERT' then
        new.contraindication_ack_by := uid;
      elsif new.contraindication_ack_by is distinct from old.contraindication_ack_by then
        new.contraindication_ack_by := uid;
      end if;
    end if;
  end if;
  if tg_table_name = 'medical_profiles' then new.updated_by := uid; end if;
  return new;
end $$;
