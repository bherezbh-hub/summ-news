"use client";
import { useState } from "react";
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

  function update(field: keyof AnalysisResult, value: unknown) {
    setData(prev => ({ ...prev, [field]: value }));
  }

  const sentimentColor: Record<string, string> = {
    חיובי: "bg-green-100 text-green-700",
    שלילי: "bg-red-100 text-red-700",
    נייטרלי: "bg-gray-100 text-gray-600",
    מעורב: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-blue-200">
      <div className="px-5 py-4 border-b bg-blue-50 rounded-t-xl flex items-center justify-between">
        <h2 className="font-semibold text-blue-800">תוצאת ניתוח — לאישור</h2>
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
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">מקור</label>
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
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">סנטימנט תג</label>
            <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${sentimentColor[data.sentiment ?? "נייטרלי"] ?? "bg-gray-100 text-gray-600"}`}>
              {data.sentiment ?? "נייטרלי"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
