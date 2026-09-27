export type Gender = "male" | "female";

export const CUSTOM = "__custom__";
export const NONE = "__none__";

export interface HeadlineOption {
  id: string;
  label: (gender: Gender) => string;
  subtitles: string[];
}

export const HEADLINE_OPTIONS: HeadlineOption[] = [
  {
    id: "trust",
    label: (gender) =>
      gender === "female" ? "אני סומכת רק על הדמוקרטים" : "אני סומך רק על הדמוקרטים",
    subtitles: [
      "שיפעלו למען דו-קיום",
      "שיפעלו לזכויות שוות לנשים",
      "שיהיו נאמנים למגילת העצמאות",
    ],
  },
  {
    id: "truth",
    label: () => "באמת של החיים",
    subtitles: [
      "אני רוצה זכויות שוות לנשים",
      "אני רוצה לחיות כאן בדו-קיום",
      "אני רוצה שיהיו פה נישואים אזרחיים",
    ],
  },
];

export interface FootnoteOption {
  id: string;
  label: (gender: Gender) => string;
}

export const FOOTNOTE_OPTIONS: FootnoteOption[] = [
  { id: "more-reasons", label: () => "ולמי שרוצה לשמוע עוד סיבות - דברו איתי" },
  { id: "your-truth", label: () => "אל תתלבטו – לכו עם האמת שלכם!" },
  { id: "undecided", label: () => "מתלבטים? דברו איתי" },
  {
    id: "convince",
    label: (gender) =>
      gender === "female"
        ? "אני חייבת לשכנע עוד מישהו, דברו איתי"
        : "אני חייב לשכנע עוד מישהו, דברו איתי",
  },
  { id: "final", label: () => "זה סופי!" },
];

export function fixedLineParts(gender: Gender) {
  return {
    pre: "בגלל זה אני",
    verb: gender === "female" ? "שמה" : "שם",
    ballot: "אמת",
    suffix: "(פתק)",
  };
}
