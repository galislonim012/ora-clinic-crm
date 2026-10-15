import { LoginForms } from "./login-forms";

export const metadata = { title: "כניסה" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-[400px] animate-rise">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-sage text-[26px] font-bold text-white shadow-card">
            א
          </div>
          <h1 className="text-[26px] font-bold tracking-[-0.01em]">קליניקת אורה</h1>
          <p className="mt-1 text-ink-2">מערכת ניהול לקוחות, תורים וקריאות שירות</p>
        </div>
        {error === "not_staff" && (
          <p role="alert" className="mb-4 rounded-xl bg-st-red-soft px-4 py-3 text-[14px] text-st-red">
            החשבון הזה לא שייך לצוות הקליניקה.
          </p>
        )}
        <LoginForms next={next} />
      </div>
    </main>
  );
}
