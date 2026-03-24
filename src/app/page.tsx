"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AnalysisResult, NewsItemRow } from "@/components/NewsItemRow";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { InputPanel } from "@/components/InputPanel";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<AnalysisResult[]>([]);
  const [pendingAnalysis, setPendingAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState<"word" | "excel" | null>(null);
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const loadItems = useCallback(async () => {
    const res = await fetch(`/api/news?date=${today}`);
    const data = await res.json();
    setItems(data);
  }, [today]);

  useEffect(() => {
    if (status === "authenticated") loadItems();
  }, [status, loadItems]);

  async function analyzeContent(payload: { url?: string; text?: string }, extra?: Partial<AnalysisResult>) {
    setLoading(true);
    setPendingAnalysis(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.analysis) {
        setPendingAnalysis({ ...data.analysis, ...extra, _isNew: true });
      } else {
        alert("שגיאה בניתוח: " + (data.error ?? "Unknown error"));
      }
    } finally {
      setLoading(false);
    }
  }

  function handleAnalyze(url: string) {
    analyzeContent({ url }, { sourceUrl: url });
  }

  async function handleAnalyzeScreenshot(screenshotUrl: string, fileName: string) {
    const sourceUrl = prompt("הוסף קישור מקור לידיעה (לא חובה):", "") ?? "";
    analyzeContent(
      { text: `צילום מסך מהפוסט: ${screenshotUrl}` },
      { screenshotPath: screenshotUrl, sourceUrl: sourceUrl || screenshotUrl }
    );
  }

  async function handleSave(analysis: AnalysisResult) {
    const res = await fetch("/api/news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(analysis),
    });
    if (res.ok) {
      setPendingAnalysis(null);
      loadItems();
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/news?id=${id}`, { method: "DELETE" });
    loadItems();
  }

  async function downloadReport(format: "word" | "excel") {
    setReportLoading(format);
    const res = await fetch(`/api/report?format=${format}&date=${today}`);
    if (!res.ok) { alert("אין ידיעות להיום"); setReportLoading(null); return; }
    const blob = await res.blob();
    const ext = format === "word" ? "docx" : "xlsx";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `daily-report-${today}.${ext}`;
    a.click();
    setReportLoading(null);
  }

  if (status === "loading") return <div className="flex items-center justify-center min-h-screen text-gray-500">טוען...</div>;
  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">BH</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm">מערכת ניתוח ידיעות בריאות</h1>
              <p className="text-xs text-gray-500">
                {new Date().toLocaleDateString("he-IL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{session.user?.name ?? session.user?.email}</span>
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700 border rounded-lg px-3 py-1.5 hover:bg-gray-50 transition">
              משתמשים
            </Link>
            <button onClick={() => signOut()} className="text-sm text-gray-500 hover:text-gray-700 border rounded-lg px-3 py-1.5 hover:bg-gray-50 transition">
              יציאה
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <InputPanel onAnalyze={handleAnalyze} onAnalyzeScreenshot={handleAnalyzeScreenshot} loading={loading} />

        {pendingAnalysis && (
          <AnalysisPanel analysis={pendingAnalysis} onSave={handleSave} onDiscard={() => setPendingAnalysis(null)} />
        )}

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800">ידיעות היום</h2>
              <p className="text-sm text-gray-500 mt-0.5">{items.length} ידיעות נשמרו</p>
            </div>
            {items.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => downloadReport("word")}
                  disabled={reportLoading === "word"}
                  className="bg-blue-600 text-white text-sm px-3 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {reportLoading === "word" ? "מייצר..." : "הורד Word"}
                </button>
                <button
                  onClick={() => downloadReport("excel")}
                  disabled={reportLoading === "excel"}
                  className="bg-green-600 text-white text-sm px-3 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
                >
                  {reportLoading === "excel" ? "מייצר..." : "הורד Excel"}
                </button>
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg">אין ידיעות שמורות להיום</p>
              <p className="text-sm mt-1">הדבק קישור או העלה צילום מסך</p>
            </div>
          ) : (
            <div className="divide-y">
              {items.map(item => (
                <NewsItemRow key={item.id} item={item} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
