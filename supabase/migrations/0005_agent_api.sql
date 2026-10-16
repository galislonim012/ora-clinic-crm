-- 0005: שתי פונקציות שהסוכנת נוי (CloudChat) קוראת להן דרך n8n.
-- רק service_role יכול להפעיל אותן. המפתח שלו שמור ב-n8n בלבד.

-- טלפון בפורמט אחיד, כמו הטריגר על clients
create or replace function agent_clean_phone(p text) returns text
language sql immutable set search_path = public as $$
  select case
    when regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') like '972%'
      then '0' || substr(regexp_replace(p, '[^0-9]', '', 'g'), 4)
    else regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g')
  end
$$;

-- א. פתיחת קריאת שירות: מאתרת לקוחה לפי טלפון (או יוצרת), ופותחת קריאה בסטטוס "חדשה"
create or replace function agent_open_ticket(p_name text, p_phone text, p_description text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_phone text := agent_clean_phone(p_phone);
  v_client clients%rowtype;
  v_created boolean := false;
  v_admin uuid;
  v_call_id uuid;
begin
  if v_phone !~ '^(0[57][0-9]{8}|0[2-489][0-9]{7})$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_phone');
  end if;
  if length(trim(coalesce(p_description, ''))) < 3 then
    return jsonb_build_object('ok', false, 'error', 'missing_description');
  end if;

  select * into v_client from clients where phone = v_phone;
  if not found then
    if length(trim(coalesce(p_name, ''))) < 2 then
      return jsonb_build_object('ok', false, 'error', 'missing_name');
    end if;
    insert into clients (full_name, phone, source, notes)
    values (trim(p_name), v_phone, 'website', 'נוצרה אוטומטית מפנייה לסוכנת נוי')
    returning * into v_client;
    v_created := true;
  end if;

  select id into v_admin from staff where role = 'admin' and is_active order by created_at limit 1;

  insert into service_calls (client_id, description, status, assignee_id, channel)
  values (v_client.id, trim(p_description), 'new', v_admin, 'ai_agent')
  returning id into v_call_id;

  return jsonb_build_object(
    'ok', true,
    'call_id', v_call_id,
    'call_ref', upper(left(v_call_id::text, 8)),
    'client_name', v_client.full_name,
    'client_created', v_created
  );
exception when others then
  return jsonb_build_object('ok', false, 'error', 'db_error');
end $$;

-- ב. התור הבא: התור הקרוב בעתיד שלא בוטל
create or replace function agent_next_appointment(p_phone text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_phone text := agent_clean_phone(p_phone);
  v_client_id uuid;
  r record;
begin
  select id into v_client_id from clients where phone = v_phone;
  if v_client_id is null then
    return jsonb_build_object('ok', true, 'client_found', false, 'has_appointment', false);
  end if;

  select a.starts_at, t.name as treatment
    into r
  from appointments a
  join treatment_types t on t.id = a.treatment_type_id
  where a.client_id = v_client_id
    and a.status <> 'cancelled'
    and a.starts_at > now()
  order by a.starts_at
  limit 1;

  if r.starts_at is null then
    return jsonb_build_object('ok', true, 'client_found', true, 'has_appointment', false);
  end if;

  return jsonb_build_object(
    'ok', true,
    'client_found', true,
    'has_appointment', true,
    'date', to_char(r.starts_at at time zone 'Asia/Jerusalem', 'DD/MM/YYYY'),
    'time', to_char(r.starts_at at time zone 'Asia/Jerusalem', 'HH24:MI'),
    'treatment', r.treatment
  );
end $$;

revoke all on function agent_clean_phone(text) from public, anon, authenticated;
revoke all on function agent_open_ticket(text, text, text) from public, anon, authenticated;
revoke all on function agent_next_appointment(text) from public, anon, authenticated;
grant execute on function agent_open_ticket(text, text, text) to service_role;
grant execute on function agent_next_appointment(text) to service_role;
grant execute on function agent_clean_phone(text) to service_role;
