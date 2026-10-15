// מייצר SQL ליצירת חשבונות הצוות. הסיסמאות נקראות מ-.env.local ויוצאות רק כ-hash.
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
);
const staff = [
  [env.DEMO_ADMIN_EMAIL, env.DEMO_ADMIN_PASSWORD, "רותם ברנע", "admin", "face"],
  [env.LIAT_EMAIL, env.LIAT_PASSWORD, "ליאת כהן", "therapist", "laser"],
  [env.NETA_EMAIL, env.NETA_PASSWORD, "נטע אדרי", "therapist", "injection"],
];
let sql = "do $$ declare uid uuid; begin\n";
for (const [email, pw, name, role, spec] of staff) {
  const hash = bcrypt.hashSync(pw, 10);
  sql += `  uid := gen_random_uuid();
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', '${email}', '${hash}', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', '${email}', 'email_verified', true), 'email', now(), now(), now());
  insert into public.staff (id, full_name, role, specialty) values (uid, '${name}', '${role}', '${spec}');
`;
}
sql += "end $$;\nselect public.seed_demo();\n";
process.stdout.write(sql);
