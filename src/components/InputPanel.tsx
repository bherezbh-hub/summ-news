"use client";
import { useState } from "react";

interface Props {
  onAnalyze: (url: string) => void;
  loading: boolean;
}

export function InputPanel({ onAnalyze, loading }: Props) {
  const [urls, setUrls] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const lines = urls.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    // Analyze one by one (submit first URL, user can add more after)
    for (const url of lines) {
      onAnalyze(url);
    }
    setUrls("");
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-5">
      <h2 className="font-semibold text-gray-800 mb-3">הוספת ידיעה לניתוח</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            הדבק קישור (ניתן להוסיף כמה שורות)
          </label>
          <textarea
            value={urls}
            onChange={e => setUrls(e.target.value)}
            placeholder="https://..."
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !urls.trim()}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              מנתח...
            </span>
          ) : "נתח ידיעה"}
        </button>
      </form>
    </div>
  );
}
