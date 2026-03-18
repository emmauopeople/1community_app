// backend/src/routes/media.js
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { query } from "../../db.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";
import { presignPut, presignGet } from "../services/s3.js";
import { logEvent } from "../services/eventService.js";

console.log("S3_BUCKET:", process.env.S3_BUCKET);

const router = express.Router();

const BUCKET = process.env.S3_BUCKET;
const PREFIX = process.env.S3_PREFIX_SKILLS || "skills";
const EXPIRES = Number(process.env.S3_PRESIGN_EXPIRES_SECONDS || 300);
const MAX_BYTES = Number(process.env.S3_MAX_IMAGE_BYTES || 3145728);
const ALLOWED_MIME = new Set(
  String(process.env.S3_ALLOWED_IMAGE_MIME || "image/jpeg,image/png,image/webp")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

function mimeToExt(mime) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return null;
}

async function providerMustBeActive(providerId) {
  const r = await query(
    `SELECT status FROM users WHERE id=$1 AND role='provider'`,
    [providerId],
  );
  const u = r.rows[0];
  if (!u) return { ok: false, code: 404, error: "Provider not found" };
  if (u.status !== "active")
    return { ok: false, code: 403, error: "Provider is inactive" };
  return { ok: true };
}

async function getOwnedSkill({ skillId, providerId }) {
  const r = await query(
    `SELECT id, provider_id, status FROM skills WHERE id=$1 AND provider_id=$2`,
    [skillId, providerId],
  );
  return r.rows[0] || null;
}

/**
 * POST /media/skills/:skillId/presign
 * Body: { files: [{ mimeType, sizeBytes, sortOrder }] }
 * Returns: { uploads: [{ sortOrder, s3Key, putUrl }] }
 */
router.post(
  "/media/skills/:skillId/presign",
  requireAuth,
  requireRole("provider"),
  async (req, res) => {
    try {
      if (!BUCKET)
        return res.status(500).json({ error: "S3_BUCKET not configured" });

      const providerId = req.session.user.id;
      const gate = await providerMustBeActive(providerId);
      if (!gate.ok) return res.status(gate.code).json({ error: gate.error });

      const skillId = Number(req.params.skillId);
      if (!skillId) return res.status(400).json({ error: "Invalid skill id" });

      const skill = await getOwnedSkill({ skillId, providerId });
      if (!skill) return res.status(404).json({ error: "Skill not found" });
      if (skill.status !== "active")
        return res.status(403).json({ error: "Skill is inactive" });

      const files = Array.isArray(req.body.files) ? req.body.files : [];
      if (files.length === 0)
        return res.status(400).json({ error: "No files provided" });
      if (files.length > 3)
        return res.status(400).json({ error: "Max 3 images allowed" });

      /*existing slots already used
      const existing = await query(
        `SELECT sort_order FROM skill_media WHERE skill_id=$1`,
        [skillId],
      );
      used = new Set(existing.rows.map((r) => Number(r.sort_order))); */

      // validate requested slots are 0..2 and not duplicated
      const requested = new Set();
      for (const f of files) {
        const mimeType = String(f?.mimeType || "").trim();
        const sizeBytes = Number(f?.sizeBytes);
        const sortOrder = Number(f?.sortOrder);

        if (!ALLOWED_MIME.has(mimeType))
          return res
            .status(400)
            .json({ error: `Unsupported mimeType: ${mimeType}` });
        if (
          !Number.isFinite(sizeBytes) ||
          sizeBytes <= 0 ||
          sizeBytes > MAX_BYTES
        )
          return res.status(400).json({ error: "Invalid file size" });
        if (![0, 1, 2].includes(sortOrder))
          return res
            .status(400)
            .json({ error: "sortOrder must be 0, 1, or 2" });
        if (requested.has(sortOrder))
          return res
            .status(400)
            .json({ error: "Duplicate sortOrder in request" });

        requested.add(sortOrder);
      }

      // total slots after upload must still be <= 3 (we only allow 0..2 anyway)
      // but also prevent attempting to fill more than available slots if you want strict “no replace”:
      // For MVP, allow replace by sort_order (confirm will upsert).

      const uploads = [];
      for (const f of files) {
        const mimeType = String(f.mimeType).trim();
        const sortOrder = Number(f.sortOrder);
        const ext = mimeToExt(mimeType);
        if (!ext) return res.status(400).json({ error: "Invalid mime type" });

        const s3Key = `${PREFIX}/${providerId}/${skillId}/img_${sortOrder}.${ext}`;
        const putUrl = await presignPut({
          bucket: BUCKET,
          key: s3Key,
          contentType: mimeType,
          expiresIn: EXPIRES,
        });

        uploads.push({ sortOrder, s3Key, putUrl });
      }

      await logEvent({
        req,
        eventType: "media_presign",
        userId: providerId,
        meta: { skillId, count: uploads.length },
      });

      return res.json({ uploads });
    } catch (e) {
      console.error("MEDIA PRESIGN ERROR:", e);
      return res.status(500).json({ error: "Failed to create upload URLs" });
    }
  },
);

/**
 * POST /media/skills/:skillId/confirm
 * Body: { items: [{ s3Key, mimeType, sizeBytes, sortOrder }] }
 * Returns: { media: [...] } (with signed GET urls)
 */
router.post(
  "/media/skills/:skillId/confirm",
  requireAuth,
  requireRole("provider"),
  async (req, res) => {
    try {
      if (!BUCKET)
        return res.status(500).json({ error: "S3_BUCKET not configured" });

      const providerId = req.session.user.id;
      const gate = await providerMustBeActive(providerId);
      if (!gate.ok) return res.status(gate.code).json({ error: gate.error });

      const skillId = Number(req.params.skillId);
      if (!skillId) return res.status(400).json({ error: "Invalid skill id" });

      const skill = await getOwnedSkill({ skillId, providerId });
      if (!skill) return res.status(404).json({ error: "Skill not found" });
      if (skill.status !== "active")
        return res.status(403).json({ error: "Skill is inactive" });

      const items = Array.isArray(req.body.items) ? req.body.items : [];
      if (items.length === 0)
        return res.status(400).json({ error: "No items provided" });
      if (items.length > 3)
        return res.status(400).json({ error: "Max 3 images allowed" });

      const prefix = `${PREFIX}/${providerId}/${skillId}/`;
      const seen = new Set();

      for (const it of items) {
        const s3Key = String(it?.s3Key || "").trim();
        const mimeType = String(it?.mimeType || "").trim();
        const sizeBytes = Number(it?.sizeBytes);
        const sortOrder = Number(it?.sortOrder);

        if (!s3Key.startsWith(prefix))
          return res.status(400).json({ error: "Invalid s3Key prefix" });
        if (!ALLOWED_MIME.has(mimeType))
          return res.status(400).json({ error: "Unsupported mimeType" });
        if (
          !Number.isFinite(sizeBytes) ||
          sizeBytes <= 0 ||
          sizeBytes > MAX_BYTES
        )
          return res.status(400).json({ error: "Invalid file size" });
        if (![0, 1, 2].includes(sortOrder))
          return res
            .status(400)
            .json({ error: "sortOrder must be 0, 1, or 2" });
        if (seen.has(sortOrder))
          return res
            .status(400)
            .json({ error: "Duplicate sortOrder in confirm" });

        seen.add(sortOrder);
      }

      // Upsert media metadata per slot (replaces old row if same sort_order)
      await query("BEGIN");
      try {
        for (const it of items) {
          await query(
            `INSERT INTO skill_media (skill_id, provider_id, media_type, bucket, s3_key, mime_type, size_bytes, sort_order, updated_at)
           VALUES ($1,$2,'image',$3,$4,$5,$6,$7,NOW())
           ON CONFLICT (skill_id, sort_order)
           DO UPDATE SET
             bucket=$3,
             s3_key=$4,
             mime_type=$5,
             size_bytes=$6,
             updated_at=NOW()`,
            [
              skillId,
              providerId,
              BUCKET,
              it.s3Key,
              it.mimeType,
              it.sizeBytes,
              it.sortOrder,
            ],
          );
        }
        await query("COMMIT");
      } catch (err) {
        await query("ROLLBACK");
        throw err;
      }

      // Return all media with signed GET URLs (for provider UI preview)
      const rows = await query(
        `SELECT id, s3_key, mime_type, size_bytes, sort_order, created_at, updated_at
       FROM skill_media
       WHERE skill_id=$1
       ORDER BY sort_order ASC`,
        [skillId],
      );

      const media = [];
      for (const r of rows.rows) {
        const url = await presignGet({
          bucket: BUCKET,
          key: r.s3_key,
          expiresIn: EXPIRES,
        });
        media.push({
          id: r.id,
          sortOrder: r.sort_order,
          mimeType: r.mime_type,
          sizeBytes: r.size_bytes,
          url,
        });
      }

      await logEvent({
        req,
        eventType: "media_confirm",
        userId: providerId,
        meta: { skillId, count: items.length },
      });

      return res.json({ ok: true, media });
    } catch (e) {
      console.error("MEDIA CONFIRM ERROR:", e);
      return res.status(500).json({ error: "Failed to confirm uploads" });
    }
  },
);

export default router;
