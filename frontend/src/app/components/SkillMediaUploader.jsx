import React, { useMemo, useState } from "react";
import { mediaApi } from "../api/media.api";

const MAX_BYTES = 3 * 1024 * 1024; // 3MB (must match backend)
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

async function putToS3(putUrl, file) {
  const res = await fetch(putUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error(`S3 upload failed (${res.status})`);
}

export default function SkillMediaUploader({ skillId, onUploaded, onError }) {
  const [filesBySlot, setFilesBySlot] = useState({ 0: null, 1: null, 2: null });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({ type: "", text: "" });

  const showError = (text) => {
    setNotice({ type: "error", text });
    onError?.(text);
  };
  const showSuccess = (text) => setNotice({ type: "success", text });

  const selected = useMemo(() => {
    return [0, 1, 2]
      .map((slot) => {
        const f = filesBySlot[slot];
        if (!f) return null;
        return { slot, file: f };
      })
      .filter(Boolean);
  }, [filesBySlot]);

  const setSlot = (slot, file) => {
    setNotice({ type: "", text: "" });

    if (!file) return setFilesBySlot((p) => ({ ...p, [slot]: null }));

    if (!ALLOWED.has(file.type)) {
      return showError("Only JPG, PNG, or WEBP allowed.");
    }
    if (file.size > MAX_BYTES) {
      return showError("Image too large. Max 3MB.");
    }
    setFilesBySlot((p) => ({ ...p, [slot]: file }));
  };

  const upload = async () => {
    try {
      setNotice({ type: "", text: "" });
      if (!skillId) return showError("Create the skill first.");
      if (selected.length === 0) return showError("Select at least one image.");

      setBusy(true);

      // 1) presign
      const presignPayload = selected.map(({ slot, file }) => ({
        mimeType: file.type,
        sizeBytes: file.size,
        sortOrder: slot,
      }));

      const pres = await mediaApi.presignSkill(skillId, presignPayload);

      // 2) upload to S3
      for (const u of pres.uploads) {
        const f = filesBySlot[u.sortOrder];
        if (!f) continue;
        await putToS3(u.putUrl, f);
      }

      // 3) confirm metadata
      const confirmItems = pres.uploads.map((u) => {
        const f = filesBySlot[u.sortOrder];
        return {
          s3Key: u.s3Key,
          mimeType: f.type,
          sizeBytes: f.size,
          sortOrder: u.sortOrder,
        };
      });

      const done = await mediaApi.confirmSkill(skillId, confirmItems);

      showSuccess("✅ Images uploaded.");
      setFilesBySlot({ 0: null, 1: null, 2: null });

      onUploaded?.(done.media || []);
    } catch (e) {
      showError(e?.response?.data?.error || e?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const noticeClass =
    notice.type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : notice.type === "error"
      ? "border-orange-200 bg-orange-50 text-orange-700"
      : "";

  return (
    <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold">Skill images (max 3)</div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((slot) => {
          const f = filesBySlot[slot];
          const inputId = `skill-img-slot-${slot}`;

          return (
            <div key={slot} className="rounded-xl border border-slate-100 p-3 bg-slate-50">
              <div className="text-xs text-slate-600 mb-2">Slot {slot + 1}</div>

              {/* Hidden file input */}
              <input
                id={inputId}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={(e) => setSlot(slot, e.target.files?.[0] || null)}
                className="hidden"
              />

              {/* Button-like label */}
              <label
                htmlFor={inputId}
                className={`h-11 w-full rounded-xl border border-slate-200 bg-slate-100 text-slate-900 font-medium text-sm
                  inline-flex items-center justify-center cursor-pointer hover:bg-slate-200 active:scale-[0.99] transition
                  ${busy ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                Choose file
              </label>

              <div className="mt-2 text-xs text-slate-600 truncate">
                {f ? f.name : "No file chosen"}
              </div>

              {f ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setSlot(slot, null)}
                  className="mt-2 text-xs text-blue-700 hover:underline"
                >
                  Remove
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {notice.text ? (
        <div className={`mt-3 rounded-xl border px-3 py-2 text-sm ${noticeClass}`}>
          {notice.text}
        </div>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={upload}
        className="mt-4 h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-semibold shadow-sm hover:opacity-95 active:scale-[0.99] transition disabled:opacity-60"
      >
        {busy ? "Uploading..." : "Upload selected images"}
      </button>

      <div className="mt-2 text-xs text-slate-500">
        Private S3 + presigned PUT/GET (NIST CSF Protect).
      </div>
    </div>
  );
}