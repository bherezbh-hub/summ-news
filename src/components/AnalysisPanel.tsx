"use client";
import { useState, useRef } from "react";
import { AnalysisResult } from "./NewsItemRow";

interface Props {
  analysis: AnalysisResult;
  onSave: (a: AnalysisResult) => void;
  onDiscard: () => void;
}

const TAG_COLORS: Record<string, string> = {
  activities: "bg-blue-100 text-blue-700",
  medicalFields: "bg-purple-100 text-purple-700",
  competition: "bg-orange-100 text-orange-700",
  sectors: "bg-teal-100 text-teal-700",
};

function TagList({ values, color }: { values: string[]; color: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v, i) => (
        <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{v}</span>
      ))}
    </div>
  );
}

export function AnalysisPanel({ analysis: initial, onSave, onDiscard }: Props) {
  const [data, setData] = useState<AnalysisResult>({ ...initial });
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const screenshotRef = useRef<HTMLInputElement>(null);

  function update(field: keyof AnalysisResult, value: unknown) {
    setData(prev => ({ ...prev, [field]: value }));
  }

  async function handleScreenshotUpload(file: File) {
    if (!file.type.startsWith("image/")) return;
    setUploadingScreenshot(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const result = await res.json();
    setUploadingScreenshot(false);
    if (result.url) {
      update("screenshotPath", result.url);
    } else {
      alert("שגיאה בהעלאת צילום המסך: " + (result.error ?? ""));
    }
  }

  const sentimentColor: Record<string, string> = {
    חיובי: "bg-green-100 text-green-700",
    שלילי: "bg-red-100 text-red-700",
    נייטרלי: "bg-gray-100 text-gray-600",
    מעורב: "bg-yellow-100 text-yellow-700",
  };

  const isFromScreenshot = !!data.screenshotPath;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-blue-200">
      <div className="px-5 py-4 border-b bg-blue-50 rounded-t-xl flex items-center justify-between">
        <h2 className="font-semibold text-blue-800">
          תוצאת ניתוח — לאישור
          {isFromScreenshot && <span className="mr-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">צילום מסך</span>}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => onSave(data)}
            className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            שמור ידיעה
          </button>
          <button
            onClick={onDiscard}
            className="text-gray-500 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            בטל
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Title */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">נושא הידיעה</label>
          <input
            value={data.title ?? ""}
            onChange={e => update("title", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Content */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">תוכן הידיעה</label>
          <textarea
            value={data.content ?? ""}
            onChange={e => update("content", e.target.value)}
            rows={5}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Tags row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">פעילויות ושירותים</label>
            <TagList values={data.activities ?? []} color={TAG_COLORS.activities} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">תחום רפואי</label>
            <TagList values={data.medicalFields ?? []} color={TAG_COLORS.medicalFields} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">סביבת תחרות</label>
            <TagList values={data.competition ?? []} color={TAG_COLORS.competition} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">מגזרים</label>
            <TagList values={data.sectors ?? []} color={TAG_COLORS.sectors} />
          </div>
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">ישוב</label>
            <input
              value={data.city ?? ""}
              onChange={e => update("city", e.target.value)}
              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">מחוז</label>
            <input
              value={data.district ?? ""}
              onChange={e => update("district", e.target.value)}
              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">מקור מידע</label>
            <input
              value={data.source ?? ""}
              onChange={e => update("source", e.target.value)}
              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">סנטימנט</label>
            <select
              value={data.sentiment ?? "נייטרלי"}
              onChange={e => update("sentiment", e.target.value)}
              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {["חיובי", "שלילי", "נייטרלי", "מעורב"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">תאריך פרסום</label>
            <input
              value={data.publishedDate ?? ""}
              onChange={e => update("publishedDate", e.target.value)}
              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="YYYY-MM-DD"
            />
          </div>
        </div>

        {/* קישור מקור */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
            קישור מקור {isFromScreenshot && <span className="text-blue-500 font-normal normal-case">(אופציונלי — מומלץ להוסיף)</span>}
          </label>
          <input
            value={data.sourceUrl ?? ""}
            onChange={e => update("sourceUrl", e.target.value)}
            placeholder="https://..."
            className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
          />
        </div>

        {/* צילום מסך */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">צילום מסך</label>
          {data.screenshotPath ? (
            <div className="flex items-center gap-3">
              <img src={data.screenshotPath} alt="צילום מסך" className="h-20 rounded-lg border object-cover" />
              <button
                onClick={() => update("screenshotPath", "")}
                className="text-xs text-red-500 hover:text-red-700"
              >
                הסר
              </button>
            </div>
          ) : (
            <div>
              <input
                ref={screenshotRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleScreenshotUpload(e.target.files[0])}
              />
              <button
                onClick={() => screenshotRef.current?.click()}
                disabled={uploadingScreenshot}
                className="text-sm border border-dashed border-gray-300 rounded-lg px-4 py-2 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition disabled:opacity-50"
              >
                {uploadingScreenshot ? "מעלה..." : "+ צרף צילום מסך"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
