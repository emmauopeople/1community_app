import crypto from "crypto";

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

export function hashOtp(otp) {
  const secret = process.env.OTP_SECRET || "dev-secret";
  return crypto
    .createHash("sha256")
    .update(`${secret}:${String(otp)}`)
    .digest("hex");
}
