"use client";
import { useState, useRef, useEffect } from "react";

interface Props {
  onAnalyze: (url: string) => void;
  onAnalyzeScreenshot: (screenshotUrl: string, fileName: string) => void;
  loading: boolean;
}

export function InputPanel({ onAnalyze, onAnalyzeScreenshot, loading }: Props) {
  const [tab, setTab] = useState<"url" | "screenshot">("url");
  const [urls, setUrls] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSubmitUrl(e: React.FormEvent) {
    e.preventDefault();
    const lines = urls.split("\n").map(l => l.trim()).filter(Boolean);
    for (const url of lines) onAnalyze(url);
    setUrls("");
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { alert("יש להעלות קובץ תמונה בלבד"); return; }
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();
    setUploading(false);
    if (data.url) {
      onAnalyzeScreenshot(data.url, data.fileName);
    } else {
      alert("שגיאה בהעלאת הקובץ: " + (data.error ?? ""));
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const busy = loading || uploading;

  // Paste from clipboard (Ctrl+V anywhere on the page)
  useEffect(() => {
    async function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            setTab("screenshot");
            await handleFile(file);
          }
        }
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border p-5">
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("url")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === "url" ? "bg-white shadow text-blue-700" : "text-gray-500 hover:text-gray-700"}`}
        >
          קישור
        </button>
        <button
          onClick={() => setTab("screenshot")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === "screenshot" ? "bg-white shadow text-blue-700" : "text-gray-500 hover:text-gray-700"}`}
        >
          צילום מסך
        </button>
      </div>

      {tab === "url" ? (
        <form onSubmit={handleSubmitUrl} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">הדבק קישור (ניתן להוסיף כמה שורות)</label>
            <textarea
              value={urls}
              onChange={e => setUrls(e.target.value)}
              placeholder="https://..."
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono"
              disabled={busy}
            />
          </div>
          <button
            type="submit"
            disabled={busy || !urls.trim()}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? <Spinner text="מנתח..." /> : "נתח ידיעה"}
          </button>
        </form>
      ) : (
        <div className="space-y-3">
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
              dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              disabled={busy}
            />
            {uploading ? (
              <Spinner text="מעלה..." />
            ) : (
              <div className="text-gray-500">
                <p className="text-base font-medium">גרור צילום מסך לכאן</p>
                <p className="text-sm mt-1">או לחץ לבחירת קובץ</p>
                <p className="text-sm mt-2 text-blue-500 font-medium">או הדבק עם Ctrl+V</p>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 text-center">לאחר ניתוח צילום המסך תתבקש להוסיף קישור מקור</p>
        </div>
      )}
    </div>
  );
}

function Spinner({ text }: { text: string }) {
  return (
    <span className="flex items-center gap-2 justify-center">
      <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      {text}
    </span>
  );
}
