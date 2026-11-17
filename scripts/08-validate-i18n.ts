#!/usr/bin/env node
/**
 * scripts/08-validate-i18n.ts
 *
 * فحص النصوص العربية المباشرة (hardcoded) في كود الويب.
 *
 * يعتمد أسلوب "خط الأساس" (Baseline / Ratchet):
 *   - لا يمنع وجود دين تقني قديم، لكنه يمنع إضافة نصوص عربية جديدة.
 *   - عند تحسين ملف (تقليل عدد النصوص) يتم تحديث خط الأساس تلقائياً بالوضع الجديد.
 *
 * الاستخدام:
 *   npm run i18n:check              # فحص ومقارنة بخط الأساس (يفشل عند وجود مخالفات جديدة)
 *   npm run i18n:check -- --report  # عرض كل المواضع
 *   npm run i18n:check -- --update-baseline  # اعتماد الوضع الحالي كخط أساس
 *
 * استثناء سطر من الفحص: أضف التعليق  // i18n-ignore  في نهاية السطر.
 */

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "fs"
import { join, dirname, relative, sep } from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, "..")
const srcDir = join(projectRoot, "src")
const baselinePath = join(__dirname, "i18n-baseline.json")

const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

interface Issue {
  file: string
  line: number
  content: string
}

interface Baseline {
  generatedAt: string
  files: Record<string, number>
}

const issues: Issue[] = []

/** إزالة التعليقات الكتلية والسطرية قبل الفحص */
function stripComments(source: string): string {
  // تعليقات كتلية /* ... */
  let out = source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
  // تعليقات سطرية // ...
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + " ".repeat(m.length - p1.length))
  return out
}

function scanDir(dir: string) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)

    if (entry === "node_modules" || entry === ".next" || entry === "messages") continue

    if (statSync(fullPath).isDirectory()) {
      // تخطي مجلدات الاختبارات
      if (entry === "__tests__" || entry === "__mocks__" || entry === "tests") continue
      scanDir(fullPath)
      continue
    }

    if (!/\.(ts|tsx)$/.test(entry)) continue
    if (/\.(test|spec)\.(ts|tsx)$/.test(entry)) continue

    const raw = readFileSync(fullPath, "utf-8")
    if (!arabicRegex.test(raw)) continue

    const withoutComments = stripComments(raw)
    const lines = raw.split("\n")
    const codeLines = withoutComments.split("\n")

    lines.forEach((line, i) => {
      if (!arabicRegex.test(codeLines[i] ?? "")) return
      const trimmed = line.trim()
      // تخطي السجلات والتشخيص
      if (/^console\.(log|warn|error|info|debug)\(/.test(trimmed)) return
      if (trimmed.includes("i18n-ignore")) return

      issues.push({
        file: relative(srcDir, fullPath).split(sep).join("/"),
        line: i + 1,
        content: trimmed.substring(0, 100),
      })
    })
  }
}

function countByFile(list: Issue[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const issue of list) counts[issue.file] = (counts[issue.file] ?? 0) + 1
  return counts
}

function loadBaseline(): Baseline | null {
  if (!existsSync(baselinePath)) return null
  try {
    return JSON.parse(readFileSync(baselinePath, "utf-8")) as Baseline
  } catch {
    return null
  }
}

function main() {
  const args = process.argv.slice(2)
  const updateBaseline = args.includes("--update-baseline")
  const reportAll = args.includes("--report")

  console.log(`\n╔════════════════════════════════════════════════════════════╗`)
  console.log(`║  🌍 فحص i18n — النصوص العربية المباشرة في كود الويب        ║`)
  console.log(`╚════════════════════════════════════════════════════════════╝\n`)
  console.log(`📁 المجلد المفحوص: src/\n`)

  scanDir(srcDir)
  const current = countByFile(issues)

  if (updateBaseline) {
    const baseline: Baseline = {
      generatedAt: new Date().toISOString(),
      files: Object.fromEntries(Object.entries(current).sort((a, b) => a[0].localeCompare(b[0]))),
    }
    writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + "\n", "utf-8")
    console.log(`✅ تم تحديث خط الأساس: ${Object.keys(current).length} ملف / ${issues.length} سطر.\n`)
    process.exit(0)
  }

  const baseline = loadBaseline()
  if (!baseline) {
    console.log(`⚠️  لا يوجد خط أساس بعد. سيتم إنشاؤه تلقائياً للوضع الحالي.\n`)
    writeFileSync(
      baselinePath,
      JSON.stringify(
        { generatedAt: new Date().toISOString(), files: Object.fromEntries(Object.entries(current).sort((a, b) => a[0].localeCompare(b[0]))) },
        null,
        2
      ) + "\n",
      "utf-8"
    )
    console.log(`✅ أُنشئ خط الأساس (${issues.length} سطر). من الآن، أي نص عربي جديد سيُرفض.\n`)
    process.exit(0)
  }

  // المخالفات الجديدة = زيادة عن خط الأساس لكل ملف + ملفات جديدة
  const regressions: Array<{ file: string; added: number }> = []
  for (const [file, count] of Object.entries(current)) {
    const allowed = baseline.files[file] ?? 0
    if (count > allowed) regressions.push({ file, added: count - allowed })
  }

  const improved = Object.entries(baseline.files).filter(
    ([file, count]) => (current[file] ?? 0) < count
  )
  const totalCurrent = issues.length
  const totalBaseline = Object.values(baseline.files).reduce((a, b) => a + b, 0)

  if (reportAll) {
    console.log(`📋 كل المواضع الحالية (${totalCurrent}):\n`)
    for (const issue of issues) {
      console.log(`  ${issue.file}:${issue.line}`)
      console.log(`     ${issue.content}`)
    }
    console.log("")
  }

  if (regressions.length === 0) {
    console.log(`✅ لا توجد نصوص عربية جديدة مضافة.`)
    console.log(`   الحالي: ${totalCurrent} سطر / خط الأساس: ${totalBaseline} سطر.`)
    if (improved.length > 0) {
      console.log(`   👍 تم تحسين ${improved.length} ملف (يمكنك تشغيل --update-baseline لتثبيت التحسن).`)
    }
    console.log(`${"═".repeat(62)}\n`)
    process.exit(0)
  }

  console.log(`❌ تمت إضافة نصوص عربية جديدة (${regressions.length} ملف):\n`)
  for (const { file, added } of regressions) {
    console.log(`  • ${file}: +${added} سطر`)
    for (const issue of issues.filter((i) => i.file === file).slice(-added)) {
      console.log(`      ${issue.line}: ${issue.content}`)
    }
  }
  console.log(`\n${"═".repeat(62)}`)
  console.log(`💡 الحل:`)
  console.log(`   1. استخدم useTranslations() أو getTranslations() بدلاً من النص المباشر.`)
  console.log(`   2. أضف المفاتيح إلى messages/{ar,en,nl}.json.`)
  console.log(`   3. أضف أيضاً المفاتيح المقابلة في mobile/i18n/{ar,en,nl}.json عند الحاجة.`)
  console.log(`   4. للاستثناءات المشروعة فقط: أضف  // i18n-ignore  في نهاية السطر.\n`)
  process.exit(1)
}

main()
