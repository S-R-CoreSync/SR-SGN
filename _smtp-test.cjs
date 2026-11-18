const fs = require("fs");
const nodemailer = require("nodemailer");

const env = fs.readFileSync(".env", "utf8");
const get = (k) => {
  const m = env.match(new RegExp("^" + k + "=(.*)$", "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
};

const host = get("SMTP_HOST");
const port = Number(get("SMTP_PORT")) || 465;
const user = get("SMTP_USER");
const pass = get("SMTP_PASS");
const from = get("SMTP_FROM") || user;
const fromName = get("SMTP_FROM_NAME") || "SGN";

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
});

(async () => {
  console.log(`SMTP ${host}:${port} user=${user} fromName=${fromName}`);
  try {
    await transporter.verify();
    console.log("verify: OK");
  } catch (e) {
    console.log("verify FAILED:", e.message);
    return;
  }
  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${from}>`,
      to: from,
      subject: "اختبار إعدادات البريد — SGN",
      text: "هذه رسالة اختبار للتأكد من أن إعدادات SMTP تعمل بعد تحديث متغيّرات البيئة.",
    });
    console.log("sent:", info.messageId, info.response);
  } catch (e) {
    console.log("send FAILED:", e.message);
  }
})();
