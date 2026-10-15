// מקור האמת היחיד של הדרכת הפתיחה.
// הוספת שלב = רשומה אחת כאן + data-tour="<target>" על הרכיב במסך.
// שלב שהרכיב שלו לא נמצא (או מוסתר) מדולג בשקט.

export const ONBOARDING_VERSION = 1;

export type TourStep = {
  id: string;
  /** ערך data-tour של הרכיב. בלי target = חלון באמצע המסך */
  target?: string;
  /** לאן לנווט לפני השלב. בלי route = נשארים במסך הנוכחי */
  route?: string;
  /** איך מזהים שכבר נמצאים במסך הנכון (ברירת מחדל: pathname === route) */
  match?: (pathname: string) => boolean;
  title: string;
  body: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    route: "/",
    title: "ברוכה הבאה לאורה CRM 👋",
    body: "סיור של דקה וחצי: איפה כל דבר נמצא ואיך עושים את הפעולות של היום-יום. אפשר לדלג בכל רגע, ולחזור להדרכה מכפתור ה-?.",
  },
  {
    id: "kpis",
    route: "/",
    target: "dashboard-kpis",
    title: "תמונת המצב שלך",
    body: "פניות חדשות, פניות בטיפול, תורי היום ותורי מחר שעוד לא אושרו. לחיצה על מספר פותחת את הרשימה שמאחוריו.",
    side: "bottom",
  },
  {
    id: "calls-by-assignee",
    route: "/",
    target: "dashboard-calls",
    title: "מי מטפלת במה",
    body: "כמה פניות פתוחות יש לכל אחת, וכמה זמן מחכה הוותיקה שבהן. ירוק עד חצי שעה, כתום עד שעה, אדום מעל שעה.",
    side: "bottom",
  },
  {
    id: "unconfirmed",
    route: "/",
    target: "dashboard-unconfirmed",
    title: "פחות הברזות",
    body: "תורים של יום העבודה הבא שעוד לא אושרו. ״תזכורת״ פותחת וואטסאפ עם הודעה מוכנה, וכשהלקוחה עונה לוחצים ״אישרה״.",
    side: "bottom",
  },
  {
    id: "renewals",
    route: "/",
    target: "dashboard-renewals",
    title: "לקוחות שכדאי להחזיר",
    body: "מי שהגיע זמן החידוש שלה: בוטוקס בערך כל 4 חודשים, מילוי כל 9. כפתור הוואטסאפ מזמין אותה לחזור.",
    side: "top",
  },
  {
    id: "phone-search",
    target: "phone-search",
    title: "מוצאים לקוחה לפי טלפון",
    body: "מקלידים מספר, גם חלקי, עם או בלי מקף, או שם. אם הלקוחה לא קיימת, אפשר ליצור אותה ישר מכאן.",
    side: "bottom",
  },
  {
    id: "new-client",
    route: "/clients",
    target: "clients-new",
    title: "לקוחה חדשה, בלי כפילויות",
    body: "שם וטלפון מספיקים. אם המספר כבר קיים במערכת, נעבור לכרטיס הקיים במקום לפתוח עוד אחד.",
    side: "bottom",
  },
  {
    id: "medical-alert",
    route: "/clients/sample",
    match: (p) => /^\/clients\/[0-9a-f-]{36}$/.test(p),
    target: "client-medical-alert",
    title: "בטיחות לפני הכל",
    body: "מצבים רפואיים של הלקוחה מופיעים כאן באדום. כשקובעים תור לטיפול שלא מתאים לה, המערכת מבקשת אישור ״בדקתי״.",
    side: "bottom",
  },
  {
    id: "client-actions",
    route: "/clients/sample",
    match: (p) => /^\/clients\/[0-9a-f-]{36}$/.test(p),
    target: "client-actions",
    title: "פעולות על הלקוחה",
    body: "קובעים תור או פותחים קריאה ישר מהכרטיס, והלקוחה כבר מסומנת. וואטסאפ פותח איתה שיחה.",
    side: "bottom",
  },
  {
    id: "client-tabs",
    route: "/clients/sample",
    match: (p) => /^\/clients\/[0-9a-f-]{36}$/.test(p),
    target: "client-tabs",
    title: "כל המידע במקום אחד",
    body: "התור הבא, היסטוריית התורים, קריאות השירות, הכרטיס הרפואי והסדרות (למשל ״3 מתוך 6 טיפולי לייזר״).",
    side: "bottom",
  },
  {
    id: "appointments",
    route: "/appointments",
    target: "appointments-toolbar",
    title: "היומן של הקליניקה",
    body: "יום או שבוע, מעבר בין ימים וסינון לפי מטפלת. בכל תור: תזכורת, אישרה, בוצע עם סיכום, או ביטול עם סיבה.",
    side: "bottom",
  },
  {
    id: "calls",
    route: "/calls",
    target: "calls-board",
    title: "פנייה מההתחלה ועד הסוף",
    body: "חדשה ← בטיפול ← נסגרה. בכל כרטיס יש שעון המתנה ואפשר להחליף אחראית. סגירה מבקשת משפט סיכום של מה שנעשה.",
    side: "top",
  },
  {
    id: "view-as",
    target: "view-as",
    title: "המערכת בעיני הצוות",
    body: "בוחרים מטפלת ורואים את המסך הראשי, היומן והקריאות כמו שהיא רואה אותם.",
    side: "bottom",
  },
  {
    id: "done",
    target: "help-button",
    title: "מוכנה! 🎉",
    body: "זהו, אפשר להתחיל לעבוד. ההדרכה תמיד זמינה כאן, מכפתור ה-?, וגם מהתפריט שבתחתית סרגל הצד.",
    side: "bottom",
  },
];
