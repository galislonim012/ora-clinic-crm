-- אורה CRM · נתוני הדגמה (לקוחות מומצאות) ואיפוס
-- התאריכים יחסיים להיום, כך שהמערכת נראית "חיה" בכל יום שבו מאפסים אותה.

-- יום עבודה (א׳-ה׳). היסט 0 = היום או יום העבודה הבא, היסט חיובי = ימי עבודה קדימה,
-- היסט שלילי = ימים קלנדריים אחורה (ואם נופל על ו׳-ש׳, זז אחורה לחמישי).
create or replace function demo_day(day_offset int) returns date
language plpgsql stable set search_path = public as $$
declare
  d date := (now() at time zone 'Asia/Jerusalem')::date;
  n int := 0;
begin
  if day_offset < 0 then
    d := d + day_offset;
    while extract(dow from d) in (5, 6) loop d := d - 1; end loop;
    return d;
  end if;
  while extract(dow from d) in (5, 6) loop d := d + 1; end loop;
  while n < day_offset loop
    d := d + 1;
    if extract(dow from d) not in (5, 6) then n := n + 1; end if;
  end loop;
  return d;
end $$;

create or replace function demo_at(day_offset int, hh int, mi int) returns timestamptz
language sql stable set search_path = public as $$
  select make_timestamptz(extract(year from demo_day(day_offset))::int,
                          extract(month from demo_day(day_offset))::int,
                          extract(day from demo_day(day_offset))::int,
                          hh, mi, 0, 'Asia/Jerusalem')
$$;

create or replace function seed_demo() returns void
language plpgsql security definer set search_path = public as $$
declare
  rotem uuid; liat uuid; neta uuid;
  t_consult uuid; t_face uuid; t_deep uuid; t_botox uuid; t_filler uuid; t_laser uuid;
  pkg uuid;
begin
  select id into rotem from staff where role = 'admin' order by created_at limit 1;
  select id into liat from staff where specialty = 'laser' limit 1;
  select id into neta from staff where specialty = 'injection' limit 1;
  if rotem is null or liat is null or neta is null then
    raise exception 'STAFF_MISSING';
  end if;

  delete from clients;          -- מוחק גם תורים, קריאות, סדרות וכרטיסים רפואיים
  delete from activity_log;

  insert into treatment_types (name, duration_min, category, renewal_days, contraindications) values
    ('התייעצות / טיפול ניסיון', 45, 'consult', null, '{}'),
    ('טיפול פנים קלאסי', 60, 'face', null, '{active_infection}'),
    ('ניקוי פנים עמוק', 75, 'face', null, '{active_infection,isotretinoin}'),
    ('בוטוקס (אזור בודד)', 30, 'injection', 120, '{pregnancy,blood_thinners,autoimmune}'),
    ('חומצה היאלורונית (מילוי)', 45, 'injection', 270, '{pregnancy,blood_thinners,lidocaine_allergy,active_infection}'),
    ('טיפול לייזר (פנים מלא)', 60, 'laser', null, '{pregnancy,isotretinoin,active_infection}')
  on conflict (name) do update set duration_min = excluded.duration_min, category = excluded.category,
    renewal_days = excluded.renewal_days, contraindications = excluded.contraindications, is_active = true;

  select id into t_consult from treatment_types where category = 'consult' limit 1;
  select id into t_face from treatment_types where name = 'טיפול פנים קלאסי';
  select id into t_deep from treatment_types where name = 'ניקוי פנים עמוק';
  select id into t_botox from treatment_types where name like 'בוטוקס%';
  select id into t_filler from treatment_types where name like 'חומצה%';
  select id into t_laser from treatment_types where category = 'laser' limit 1;

  insert into clients (full_name, phone, source, notes, created_by, created_at) values
      ('מיכל לוי', '0541234567', 'instagram', 'מעדיפה תורים אחר הצהריים', rotem, now() - interval '70 days'),
      ('דנה אברהם', '0527654321', 'referral', null, neta, now() - interval '200 days'),
      ('שני גולן', '0503344556', 'facebook', null, liat, now() - interval '40 days'),
      ('יעל כץ', '0548899001', 'website', 'הגיעה מטופס באתר', rotem, now() - interval '10 days'),
      ('נועה פרץ', '0529988776', 'instagram', null, neta, now() - interval '300 days'),
      ('רוני שטרן', '0532211443', 'instagram', null, neta, now() - interval '20 days'),
      ('הילה מזרחי', '0546677889', 'referral', 'חברה של דנה אברהם', rotem, now() - interval '90 days'),
      ('אורית בן דוד', '0501122334', 'facebook', null, liat, now() - interval '55 days'),
      ('תמר אוחיון', '0524455667', 'website', null, rotem, now() - interval '5 days'),
      ('ליאור חדד', '0547788990', 'instagram', null, neta, now() - interval '150 days'),
      ('סיון רוזן', '0582233445', 'other', null, liat, now() - interval '33 days'),
      ('קרן ביטון', '0545566778', 'instagram', 'רגישה לכאב, לתאם הרדמה מקומית', neta, now() - interval '120 days'),
      ('גלית שמעוני', '0509900112', 'referral', null, rotem, now() - interval '2 days'),
      ('עדי ברק', '0523344112', 'facebook', null, liat, now() - interval '1 day'),
      ('מאיה דהן', '0541100223', 'instagram', null, rotem, now() - interval '3 hours');

  -- כרטיסים רפואיים
  insert into medical_profiles (client_id, declaration_signed_at, conditions, allergies, medications, updated_by) values
    ((select id from clients where phone = '0541234567'), current_date - 60, '{blood_thinners,lidocaine_allergy}', 'רגישות ללידוקאין', 'אספירין 100 מ״ג', rotem),
    ((select id from clients where phone = '0532211443'), current_date - 20, '{pregnancy}', null, null, neta),
    ((select id from clients where phone = '0527654321'), current_date - 400, '{}', null, null, neta),
    ((select id from clients where phone = '0503344556'), current_date - 40, '{}', 'אין', 'אין', liat),
    ((select id from clients where phone = '0546677889'), current_date - 90, '{isotretinoin}', null, 'רואקוטן (הפסיקה לפני חודש)', rotem);

  -- סדרת לייזר של מיכל: 3 מתוך 6 בוצעו
  insert into treatment_packages (client_id, treatment_type_id, total_sessions)
  values ((select id from clients where phone = '0541234567'), t_laser, 6) returning id into pkg;

  insert into appointments (client_id, treatment_type_id, staff_id, starts_at, status, cancel_reason, summary, confirmation, package_id, created_by) values
    -- מיכל לוי · סדרת לייזר
    ((select id from clients where phone = '0541234567'), t_laser, liat, demo_at(-42, 14, 0), 'done', null, 'טיפול ראשון בסדרה, עוצמה נמוכה. עור הגיב טוב.', 'confirmed', pkg, liat),
    ((select id from clients where phone = '0541234567'), t_laser, liat, demo_at(-28, 14, 0), 'done', null, 'העלינו עוצמה. אודם קל שחלף תוך שעה.', 'confirmed', pkg, liat),
    ((select id from clients where phone = '0541234567'), t_laser, liat, demo_at(-14, 14, 0), 'done', null, 'שיפור ניכר בפיגמנטציה.', 'confirmed', pkg, liat),
    ((select id from clients where phone = '0541234567'), t_laser, liat, demo_at(2, 14, 0), 'future', null, null, 'not_sent', pkg, liat),
    -- דנה אברהם · בוטוקס לפני כ-4 חודשים = הגיע זמן לחזור
    ((select id from clients where phone = '0527654321'), t_botox, neta, demo_at(-125, 11, 0), 'done', null, 'מצח + קמטי צחוק. 20 יחידות.', 'confirmed', null, neta),
    -- נועה פרץ · מילוי לפני כ-9 חודשים = הגיע זמן לחזור
    ((select id from clients where phone = '0529988776'), t_filler, neta, demo_at(-275, 12, 0), 'done', null, 'מילוי שפתיים 1 מ״ל.', 'confirmed', null, neta),
    -- רוני שטרן · בהריון ויש לה בוטוקס עתידי = התראה רפואית
    ((select id from clients where phone = '0532211443'), t_botox, neta, demo_at(1, 10, 0), 'future', null, null, 'not_sent', null, rotem),
    -- שני גולן · לייזר מחר, עדיין לא אישרה
    ((select id from clients where phone = '0503344556'), t_laser, liat, demo_at(1, 12, 30), 'future', null, null, 'reminder_sent', null, liat),
    -- אורית · פנים קלאסי מחר, אישרה
    ((select id from clients where phone = '0501122334'), t_face, rotem, demo_at(1, 9, 30), 'future', null, null, 'confirmed', null, rotem),
    -- תורי היום
    ((select id from clients where phone = '0548899001'), t_consult, rotem, demo_at(0, 9, 0), 'future', null, null, 'confirmed', null, rotem),
    ((select id from clients where phone = '0524455667'), t_consult, rotem, demo_at(0, 11, 0), 'future', null, null, 'confirmed', null, rotem),
    ((select id from clients where phone = '0547788990'), t_botox, neta, demo_at(0, 10, 30), 'future', null, null, 'confirmed', null, neta),
    ((select id from clients where phone = '0582233445'), t_laser, liat, demo_at(0, 13, 0), 'future', null, null, 'confirmed', null, liat),
    ((select id from clients where phone = '0545566778'), t_filler, neta, demo_at(0, 15, 0), 'future', null, null, 'reminder_sent', null, neta),
    ((select id from clients where phone = '0546677889'), t_deep, rotem, demo_at(0, 16, 30), 'future', null, null, 'confirmed', null, rotem),
    -- ליאור חדד · היסטוריה
    ((select id from clients where phone = '0547788990'), t_consult, neta, demo_at(-150, 10, 0), 'done', null, 'ייעוץ לבוטוקס, הוסבר התהליך.', 'confirmed', null, neta),
    -- עדי ברק · שתי הברזות
    ((select id from clients where phone = '0523344112'), t_consult, rotem, demo_at(-20, 10, 0), 'cancelled', 'no_show', null, 'not_sent', null, rotem),
    ((select id from clients where phone = '0523344112'), t_consult, rotem, demo_at(-6, 10, 0), 'cancelled', 'no_show', null, 'reminder_sent', null, rotem),
    ((select id from clients where phone = '0523344112'), t_consult, rotem, demo_at(3, 10, 0), 'future', null, null, 'not_sent', null, rotem),
    -- קרן ביטון · ביטול של הלקוחה
    ((select id from clients where phone = '0545566778'), t_filler, neta, demo_at(-30, 12, 0), 'cancelled', 'client', null, 'confirmed', null, neta),
    -- הילה · ניקוי עמוק בעבר
    ((select id from clients where phone = '0546677889'), t_deep, rotem, demo_at(-45, 16, 0), 'done', null, 'עור שמן, הומלץ על ניקוי כל 6 שבועות.', 'confirmed', null, rotem),
    -- גלית · טיפול ניסיון בשבוע הבא
    ((select id from clients where phone = '0509900112'), t_consult, rotem, demo_at(5, 12, 0), 'future', null, null, 'not_sent', null, rotem);

  insert into service_calls (client_id, description, topic, status, assignee_id, channel, resolution, created_by, created_at) values
    ((select id from clients where phone = '0541100223'), 'שואלת כמה זמן מחזיק בוטוקס ואם יש טיפול ניסיון', 'injection', 'new', neta, 'instagram', null, rotem, now() - interval '25 minutes'),
    ((select id from clients where phone = '0509900112'), 'רוצה לדעת אם הלייזר מתאים לעור כהה', 'laser', 'new', liat, 'facebook', null, rotem, now() - interval '50 minutes'),
    ((select id from clients where phone = '0524455667'), 'פנתה דרך הטופס באתר, מעוניינת בניקוי פנים לפני חתונה', 'face', 'new', rotem, 'website', null, rotem, now() - interval '95 minutes'),
    ((select id from clients where phone = '0541234567'), 'אודם קל אחרי הטיפול האחרון, שואלת אם זה תקין', 'laser', 'in_progress', liat, 'whatsapp', null, liat, now() - interval '1 day'),
    ((select id from clients where phone = '0532211443'), 'רוצה להזיז את תור הבוטוקס', 'injection', 'in_progress', neta, 'phone', null, neta, now() - interval '3 hours'),
    ((select id from clients where phone = '0523344112'), 'ביקשה לקבוע מחדש אחרי שלא הגיעה', 'consult', 'in_progress', rotem, 'whatsapp', null, rotem, now() - interval '2 days'),
    ((select id from clients where phone = '0527654321'), 'שאלה על מחיר סדרת לייזר', 'laser', 'closed', liat, 'instagram', 'הוסבר בטלפון, תחשוב על זה ותחזור.', liat, now() - interval '9 days'),
    ((select id from clients where phone = '0501122334'), 'שאלה אם הקליניקה פתוחה בחול המועד', 'face', 'closed', rotem, 'phone', 'נענתה: פתוחים בשעות הרגילות.', rotem, now() - interval '15 days');

  -- זמני תגובה מציאותיים לקריאות שכבר בטיפול
  update service_calls set first_response_at = created_at + interval '20 minutes' where status <> 'new';
  update service_calls set closed_at = created_at + interval '2 hours' where status = 'closed';
end $$;

revoke all on function seed_demo() from public, anon, authenticated;

-- איפוס מתוך המערכת: רק מנהלת
create or replace function reset_demo() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;
  perform seed_demo();
end $$;
revoke all on function reset_demo() from public, anon;
grant execute on function reset_demo() to authenticated;
revoke all on function demo_day(int), demo_at(int, int, int) from public, anon, authenticated;
