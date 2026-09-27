"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CUSTOM,
  NONE,
  FOOTNOTE_OPTIONS,
  HEADLINE_OPTIONS,
  Gender,
} from "@/lib/democrats/content";
import {
  DEFAULT_IMAGE_TRANSFORM,
  DEFAULT_TEXT_TRANSFORM,
  FORMAT_SIZES,
  Format,
  ImageTransform,
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  TextTransform,
  clampImageOffset,
  clampTextOffset,
  renderGraphic,
} from "@/lib/democrats/canvas";

type DragMode = "image" | "text";

const TOTAL_STEPS = 6;

export default function DemocratsGeneratorPage() {
  const [step, setStep] = useState(1);

  const [format, setFormat] = useState<Format | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);

  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageTransform, setImageTransform] = useState<ImageTransform>(DEFAULT_IMAGE_TRANSFORM);
  const [textTransform, setTextTransform] = useState<TextTransform>(DEFAULT_TEXT_TRANSFORM);
  const [dragMode, setDragMode] = useState<DragMode>("text");
  const [headlineColor, setHeadlineColor] = useState("#ffffff");
  const [subColor, setSubColor] = useState("#c9d6ec");

  const [headlineId, setHeadlineId] = useState<string | null>(null);
  const [customHeadline, setCustomHeadline] = useState("");

  const [subtitleChoice, setSubtitleChoice] = useState<string | null>(null);
  const [customSubtitle, setCustomSubtitle] = useState("");

  const [footnoteId, setFootnoteId] = useState<string | null>(null);
  const [customFootnote, setCustomFootnote] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number; mode: DragMode } | null>(null);

  const selectedHeadline = useMemo(
    () => HEADLINE_OPTIONS.find((h) => h.id === headlineId) ?? null,
    [headlineId]
  );

  const title = useMemo(() => {
    if (headlineId === CUSTOM) return customHeadline;
    return selectedHeadline ? selectedHeadline.label(gender ?? "male") : "";
  }, [headlineId, customHeadline, selectedHeadline, gender]);

  const subtitle = useMemo(() => {
    if (subtitleChoice === CUSTOM) return customSubtitle;
    return subtitleChoice ?? "";
  }, [subtitleChoice, customSubtitle]);

  const footnote = useMemo(() => {
    if (!footnoteId || footnoteId === NONE) return "";
    if (footnoteId === CUSTOM) return customFootnote;
    const opt = FOOTNOTE_OPTIONS.find((f) => f.id === footnoteId);
    return opt ? opt.label(gender ?? "male") : "";
  }, [footnoteId, customFootnote, gender]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !format || !gender) return;
    renderGraphic(canvas, {
      format,
      gender,
      image: imageEl,
      imageTransform,
      title: title || "הכותרת שלך תופיע כאן",
      subtitle: subtitle || "כותרת המשנה שלך",
      footnote,
      headlineColor,
      subColor,
      textTransform,
    });
  }, [format, gender, imageEl, imageTransform, title, subtitle, footnote, headlineColor, subColor, textTransform]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      const img = new Image();
      img.onload = () => {
        setImageEl(img);
        setImagePreviewUrl(url);
        setImageTransform(DEFAULT_IMAGE_TRANSFORM);
        setDragMode("image");
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  }

  function handleZoomChange(scale: number) {
    setImageTransform((t) => {
      if (!imageEl || !format) return { ...t, scale };
      const size = FORMAT_SIZES[format];
      const clamped = clampImageOffset(size.width, size.height, imageEl.width, imageEl.height, scale, t.offsetX, t.offsetY);
      return { scale, offsetX: clamped.x, offsetY: clamped.y };
    });
  }

  function handleTextSizeChange(scale: number) {
    setTextTransform((t) => ({ ...t, scale }));
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (dragMode === "image" && !imageEl) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const base = dragMode === "image" ? imageTransform : textTransform;
    dragRef.current = { x: e.clientX, y: e.clientY, offsetX: base.offsetX, offsetY: base.offsetY, mode: dragMode };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragRef.current || !format) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = FORMAT_SIZES[format].width / rect.width;
    const dx = (e.clientX - dragRef.current.x) * ratio;
    const dy = (e.clientY - dragRef.current.y) * ratio;

    if (dragRef.current.mode === "image") {
      if (!imageEl) return;
      const size = FORMAT_SIZES[format];
      const clamped = clampImageOffset(
        size.width,
        size.height,
        imageEl.width,
        imageEl.height,
        imageTransform.scale,
        dragRef.current.offsetX + dx,
        dragRef.current.offsetY + dy
      );
      setImageTransform((t) => ({ ...t, offsetX: clamped.x, offsetY: clamped.y }));
    } else {
      const clamped = clampTextOffset(format, dragRef.current.offsetX + dx, dragRef.current.offsetY + dy);
      setTextTransform((t) => ({ ...t, offsetX: clamped.x, offsetY: clamped.y }));
    }
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `democrats-${format}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  function canProceed() {
    switch (step) {
      case 1:
        return !!format;
      case 2:
        return !!gender;
      case 3:
        return true; // photo is optional
      case 4:
        return headlineId === CUSTOM ? customHeadline.trim().length > 0 : !!headlineId;
      case 5:
        return subtitleChoice === CUSTOM ? customSubtitle.trim().length > 0 : !!subtitleChoice;
      case 6:
        return true; // footnote is optional
      default:
        return false;
    }
  }

  function next() {
    if (step === 4) setSubtitleChoice(null);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS + 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 1));
  }

  const previewCanvas = (
    <div className="flex flex-col items-center gap-3 w-full">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="w-full max-w-[320px] rounded-2xl shadow-lg border border-white/10"
        style={{
          aspectRatio: format === "story" ? "9 / 16" : "1 / 1",
          cursor: dragMode === "image" && !imageEl ? "default" : "grab",
          touchAction: "none",
        }}
      />

      <div className="w-full max-w-[320px] flex rounded-lg overflow-hidden border border-white/20 text-xs">
        <button
          type="button"
          onClick={() => imageEl && setDragMode("image")}
          disabled={!imageEl}
          className={`flex-1 py-2 transition ${
            dragMode === "image" ? "bg-blue-600 text-white" : "text-blue-200 disabled:opacity-30"
          }`}
        >
          הזזת תמונה
        </button>
        <button
          type="button"
          onClick={() => setDragMode("text")}
          className={`flex-1 py-2 transition ${
            dragMode === "text" ? "bg-blue-600 text-white" : "text-blue-200"
          }`}
        >
          הזזת כותרות
        </button>
      </div>

      <div className="w-full max-w-[320px] text-blue-200 text-xs space-y-1">
        <p className="text-center opacity-80">
          {dragMode === "image" ? "גררו על התמונה כדי למקם אותה" : "גררו את הכותרות כדי למקם אותן"}
        </p>
        {dragMode === "image" && imageEl && (
          <label className="flex items-center gap-2">
            <span className="whitespace-nowrap">התקרבות</span>
            <input
              type="range"
              min={1}
              max={2.5}
              step={0.01}
              value={imageTransform.scale}
              onChange={(e) => handleZoomChange(Number(e.target.value))}
              className="w-full"
            />
          </label>
        )}
        {dragMode === "text" && (
          <label className="flex items-center gap-2">
            <span className="whitespace-nowrap">גודל כותרות</span>
            <input
              type="range"
              min={TEXT_SCALE_MIN}
              max={TEXT_SCALE_MAX}
              step={0.01}
              value={textTransform.scale}
              onChange={(e) => handleTextSizeChange(Number(e.target.value))}
              className="w-full"
            />
          </label>
        )}
      </div>

      <div className="w-full max-w-[320px] flex gap-4 justify-center text-blue-200 text-xs">
        <label className="flex items-center gap-2">
          <span>צבע כותרת</span>
          <input
            type="color"
            value={headlineColor}
            onChange={(e) => setHeadlineColor(e.target.value)}
            className="w-8 h-8 rounded border border-white/20 bg-transparent p-0"
          />
        </label>
        <label className="flex items-center gap-2">
          <span>צבע כותרת משנה</span>
          <input
            type="color"
            value={subColor}
            onChange={(e) => setSubColor(e.target.value)}
            className="w-8 h-8 rounded border border-white/20 bg-transparent p-0"
          />
        </label>
      </div>

      {step > TOTAL_STEPS && (
        <button
          onClick={handleDownload}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition"
        >
          הורדת התמונה
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0d1b33]" dir="rtl">
      <header className="border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-5 text-center">
          <h1 className="text-white text-xl font-bold">מחולל תמיכה בדמוקרטים</h1>
          <p className="text-blue-200 text-sm mt-1">
            צרו פוסט או סטורי אישי לתמיכה בדמוקרטים בכמה צעדים
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-8 items-start">
        <div className="order-2 md:order-1 bg-white rounded-2xl shadow-sm p-6">
          {step <= TOTAL_STEPS && (
            <div className="mb-6">
              <p className="text-xs text-gray-400 mb-1">
                שלב {step} מתוך {TOTAL_STEPS}
              </p>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <StepShell title="פוסט או סטורי?">
              <div className="grid grid-cols-2 gap-4">
                <OptionCard selected={format === "post"} onClick={() => setFormat("post")}>
                  פוסט (מרובע)
                </OptionCard>
                <OptionCard selected={format === "story"} onClick={() => setFormat("story")}>
                  סטורי (אורך)
                </OptionCard>
              </div>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell title="אני גבר או אישה?">
              <div className="grid grid-cols-2 gap-4">
                <OptionCard selected={gender === "male"} onClick={() => setGender("male")}>
                  גבר
                </OptionCard>
                <OptionCard selected={gender === "female"} onClick={() => setGender("female")}>
                  אישה
                </OptionCard>
              </div>
            </StepShell>
          )}

          {step === 3 && (
            <StepShell title="בחרו תמונה (אופציונלי)">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl py-10 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition flex flex-col items-center gap-2"
              >
                {imagePreviewUrl ? (
                  <img
                    src={imagePreviewUrl}
                    alt="תצוגה מקדימה"
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-3xl">📷</span>
                )}
                <span>{imagePreviewUrl ? "החלפת תמונה" : "העלאת תמונה מהמכשיר"}</span>
              </button>
            </StepShell>
          )}

          {step === 4 && (
            <StepShell title="בחרו כותרת">
              <div className="space-y-3">
                {HEADLINE_OPTIONS.map((h) => (
                  <OptionCard
                    key={h.id}
                    selected={headlineId === h.id}
                    onClick={() => setHeadlineId(h.id)}
                  >
                    {h.label(gender ?? "male")}
                  </OptionCard>
                ))}
                <OptionCard selected={headlineId === CUSTOM} onClick={() => setHeadlineId(CUSTOM)}>
                  כותרת משלי
                </OptionCard>
                {headlineId === CUSTOM && (
                  <input
                    autoFocus
                    value={customHeadline}
                    onChange={(e) => setCustomHeadline(e.target.value)}
                    placeholder="הקלידו כותרת"
                    className="w-full border rounded-lg px-3 py-2 text-right"
                  />
                )}
              </div>
            </StepShell>
          )}

          {step === 5 && (
            <StepShell title="בחרו כותרת משנה">
              <div className="space-y-3">
                {(selectedHeadline?.subtitles ?? []).map((s) => (
                  <OptionCard
                    key={s}
                    selected={subtitleChoice === s}
                    onClick={() => setSubtitleChoice(s)}
                  >
                    {s}
                  </OptionCard>
                ))}
                <OptionCard
                  selected={subtitleChoice === CUSTOM}
                  onClick={() => setSubtitleChoice(CUSTOM)}
                >
                  כותרת משנה משלי
                </OptionCard>
                {subtitleChoice === CUSTOM && (
                  <input
                    autoFocus
                    value={customSubtitle}
                    onChange={(e) => setCustomSubtitle(e.target.value)}
                    placeholder="הקלידו כותרת משנה"
                    className="w-full border rounded-lg px-3 py-2 text-right"
                  />
                )}
              </div>
            </StepShell>
          )}

          {step === 6 && (
            <StepShell title="כוכבית לשכנוע (אופציונלי)">
              <div className="space-y-3">
                <OptionCard selected={footnoteId === NONE} onClick={() => setFootnoteId(NONE)}>
                  בלי כוכבית
                </OptionCard>
                {FOOTNOTE_OPTIONS.map((f) => (
                  <OptionCard
                    key={f.id}
                    selected={footnoteId === f.id}
                    onClick={() => setFootnoteId(f.id)}
                  >
                    {f.label(gender ?? "male")}
                  </OptionCard>
                ))}
                <OptionCard selected={footnoteId === CUSTOM} onClick={() => setFootnoteId(CUSTOM)}>
                  טקסט משלי
                </OptionCard>
                {footnoteId === CUSTOM && (
                  <input
                    autoFocus
                    value={customFootnote}
                    onChange={(e) => setCustomFootnote(e.target.value)}
                    placeholder="הקלידו טקסט"
                    className="w-full border rounded-lg px-3 py-2 text-right"
                  />
                )}
              </div>
            </StepShell>
          )}

          {step > TOTAL_STEPS && (
            <StepShell title="מוכן! זה הפוסט/סטורי שלכם">
              <p className="text-gray-500 text-sm mb-4">
                אפשר להוריד ולשתף ברשתות החברתיות, או לחזור אחורה ולשנות.
              </p>
              <div className="md:hidden">{previewCanvas}</div>
            </StepShell>
          )}

          <div className="flex justify-between mt-8">
            <button
              onClick={back}
              disabled={step === 1}
              className="px-4 py-2 rounded-lg text-gray-500 disabled:opacity-30 hover:bg-gray-100 transition"
            >
              חזרה
            </button>
            {step <= TOTAL_STEPS && (
              <button
                onClick={next}
                disabled={!canProceed()}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-30 hover:bg-blue-700 transition"
              >
                {step === TOTAL_STEPS ? "סיום" : "המשך"}
              </button>
            )}
          </div>
        </div>

        <div className="order-1 md:order-2 hidden md:flex justify-center sticky top-8">
          {format && gender ? (
            previewCanvas
          ) : (
            <div className="text-blue-200 text-sm text-center py-20">
              התצוגה המקדימה תופיע כאן לאחר בחירת פורמט ומגדר
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StepShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function OptionCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-right px-4 py-3 rounded-xl border-2 transition font-medium ${
        selected
          ? "border-blue-600 bg-blue-50 text-blue-700"
          : "border-gray-200 text-gray-700 hover:border-blue-300"
      }`}
    >
      {children}
    </button>
  );
}
