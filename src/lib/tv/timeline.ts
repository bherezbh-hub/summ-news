// What Yair Golan and Benjamin Netanyahu were doing during 7.10, shown beside
// the TV by the same clock as the channels.

export type TimelineEntry = {
  /** Clock time the entry starts, "HH:MM". */
  from: string;
  /** Clock time the entry ends, when the source gives a range. */
  to?: string;
  /** The entry continues to the end of the day ("ואילך"). */
  onward?: boolean;
  text: string;
};

export type Person = {
  id: string;
  title: string;
  entries: TimelineEntry[];
};

export const PEOPLE: Person[] = [
  {
    id: "golan",
    title: "מה יאיר גולן עושה עכשיו",
    entries: [
      { from: "06:25", text: "מתעורר ולאחר האזעקות מתחיל להבין את ממדי המתקפה בעוטף." },
      { from: "08:30", text: "עולה על מדים ונכנס לטויוטה יאריס בדרכו למפקדת פיקוד העורף ברמלה." },
      {
        from: "09:30",
        text: "מגיע למפקדת פיקוד העורף, משתתף בהערכת מצב ומקבל תמונה מפורטת מהשטח. מציע לאלוף הפיקוד רפי מילוא לצאת לעוטף כשליחו האישי בשטח.",
      },
      { from: "11:00", text: "חותם על נשק ויוצא דרומה." },
      {
        from: "11:30",
        to: "12:00",
        text: "מגיע לבסיס אורים, דקות לאחר סיום הקרב. מפקד המחוז נפצע ומתפנה. יאיר מסייע לסגנו לארגן מחדש את הכוחות, סורק עם החיילים את הבסיס לוודא שאין מחבלים, ומתחיל לבנות תמונת מצב.",
      },
      {
        from: "13:24",
        text: "אחותו מתקשרת ומבקשת שיסייע בחילוץ שלושה צעירים שמסתתרים בשטח. היא שולחת סרטון ומיקום. יוצא מיד לנקודה.",
      },
      {
        from: "14:00",
        to: "17:00",
        text: "מחלץ שישה צעירים ממסיבת הנובה. תחילה שלושה יחד עם עוז דוידיאן, ולאחר מכן ממשיך לחילוצים נוספים.",
      },
      {
        from: "19:00",
        onward: true,
        text: "יאיר מבין שחיילים הפועלים באזור עלולים לזהות בטעות את רכבו הפרטי כרכב עוין ולפתוח לעברו באש, ומחליט להישאר בפיקוד העורף, להשתתף בהערכת המצב ולסייע משם.",
      },
    ],
  },
  {
    id: "netanyahu",
    title: "מה בנימין נתניהו עושה עכשיו",
    entries: [
      { from: "06:29", text: "המזכיר הצבאי מעדכן אותו שתוקפים את ישראל. ביבי עונה \"למה הם יורים?\"" },
      { from: "08:22", text: "מגיע לקריה (ע\"פ רישומי השב\"כ)." },
      { from: "09:55", text: "הערכת מצב ראשונה עם ראשי מערכת הביטחון." },
      { from: "10:30", text: "שיחה עם ראש ממשלת הולנד." },
      { from: "11:00", text: "צילום הצהרה לתקשורת." },
      { from: "12:30", text: "פגישה עם סמוטריץ', בן גביר, אלי כהן, גולדקנופף ורון דרמר." },
      { from: "15:15", text: "טלפון עם נשיא צרפת." },
      { from: "16:15", text: "טלפון עם נשיא ארה\"ב." },
      { from: "17:00", text: "פ.ע עם יו\"ר האופוזיציה יאיר לפיד." },
      { from: "18:00", text: "ישיבת ממשלה." },
      { from: "20:30", text: "הצהרה לתקשורת." },
    ],
  },
];

export function entryLabel(entry: TimelineEntry): string {
  if (entry.to) return `${entry.from}–${entry.to}`;
  if (entry.onward) return `${entry.from} ואילך`;
  return entry.from;
}
