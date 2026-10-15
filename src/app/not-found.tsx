import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-sage-soft text-sage">
          <Compass size={22} />
        </div>
        <h1 className="text-[22px] font-bold">העמוד הזה לא קיים</h1>
        <p className="mt-1.5 text-ink-2">אולי הקישור השתנה. אפשר לחזור למסך הראשי ולהמשיך משם.</p>
        <Link href="/" className="mt-5 inline-flex h-11 items-center rounded-lg bg-sage px-5 font-medium text-white transition hover:bg-sage-hover active:scale-[0.97]">
          למסך הראשי
        </Link>
      </div>
    </main>
  );
}
