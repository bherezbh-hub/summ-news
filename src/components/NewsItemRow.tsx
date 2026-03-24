"use client";
import { useState } from "react";

export interface AnalysisResult {
  id?: string;
  title?: string;
  content?: string;
  activities?: string[];
  medicalFields?: string[];
  competition?: string[];
  sectors?: string[];
  city?: string;
  district?: string;
  source?: string;
  sentiment?: string;
  publishedDate?: string;
  sourceUrl?: string;
  screenshotPath?: string;
  _isNew?: boolean;
  // DB fields (strings when coming from API)
  activities_str?: string;
  medicalFields_str?: string;
}

function parseTags(val: string | string[] | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return [val]; }
}

const sentimentColor: Record<string, string> = {
  חיובי: "bg-green-100 text-green-700",
  שלילי: "bg-red-100 text-red-700",
  נייטרלי: "bg-gray-100 text-gray-600",
  מעורב: "bg-yellow-100 text-yellow-700",
};

interface Props {
  item: AnalysisResult & {
    activities?: string | string[];
    medicalFields?: string | string[];
    competition?: string | string[];
    sectors?: string | string[];
  };
  onDelete: (id: string) => void;
}

export function NewsItemRow({ item, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);

  const activities = parseTags(item.activities);
  const medicalFields = parseTags(item.medicalFields);
  const competition = parseTags(item.competition);
  const sectors = parseTags(item.sectors);

  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-right w-full"
          >
            <div className="flex items-center gap-2 mb-1">
              {item.sentiment && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${sentimentColor[item.sentiment] ?? "bg-gray-100 text-gray-600"}`}>
                  {item.sentiment}
                </span>
              )}
              {item.source && (
                <span className="text-xs text-gray-400 flex-shrink-0">{item.source}</span>
              )}
              {item.publishedDate && (
                <span className="text-xs text-gray-400 flex-shrink-0">{item.publishedDate}</span>
              )}
            </div>
            <p className="font-medium text-gray-800 text-sm text-right">{item.title}</p>
          </button>

          {/* Tags preview */}
          <div className="flex flex-wrap gap-1 mt-2">
            {activities.slice(0, 3).map((a, i) => (
              <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{a}</span>
            ))}
            {medicalFields.slice(0, 2).map((m, i) => (
              <span key={i} className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{m}</span>
            ))}
            {item.city && item.city !== "ארצי" && (
              <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">{item.city}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline"
            >
              מקור
            </a>
          )}
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition"
          >
            {expanded ? "סגור" : "פרטים"}
          </button>
          <button
            onClick={() => item.id && onDelete(item.id)}
            className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition"
          >
            מחק
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t space-y-3 text-sm">
          <p className="text-gray-700 leading-relaxed">{item.content}</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="font-semibold text-gray-500">פעילויות: </span>
              <span className="text-gray-700">{activities.join(" | ")}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-500">תחום: </span>
              <span className="text-gray-700">{medicalFields.join(" | ")}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-500">תחרות: </span>
              <span className="text-gray-700">{competition.join(" | ")}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-500">מגזרים: </span>
              <span className="text-gray-700">{sectors.join(" | ")}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-500">ישוב: </span>
              <span className="text-gray-700">{item.city ?? "ארצי"}</span>
              {item.district && <span className="text-gray-500"> | {item.district}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
