/**
 * mobile/lib/prayers.ts
 *
 * Prayer Times Calculation for Netherlands Cities on Mobile
 */

export interface CityCoords {
  id: string;
  nameAr: string;
  nameNl: string;
  nameEn: string;
  lat: number;
  lng: number;
}

export const DUTCH_CITIES: CityCoords[] = [
  { id: "amsterdam", nameAr: "أمستردام", nameNl: "Amsterdam", nameEn: "Amsterdam", lat: 52.3676, lng: 4.9041 },
  { id: "rotterdam", nameAr: "روتردام", nameNl: "Rotterdam", nameEn: "Rotterdam", lat: 51.9244, lng: 4.4777 },
  { id: "denhaag", nameAr: "لاهاي (Den Haag)", nameNl: "Den Haag", nameEn: "The Hague", lat: 52.0705, lng: 4.3007 },
  { id: "utrecht", nameAr: "أوتريخت", nameNl: "Utrecht", nameEn: "Utrecht", lat: 52.0907, lng: 5.1214 },
  { id: "eindhoven", nameAr: "أيندهوفن", nameNl: "Eindhoven", nameEn: "Eindhoven", lat: 51.4416, lng: 5.4697 },
  { id: "groningen", nameAr: "خرونينغن", nameNl: "Groningen", nameEn: "Groningen", lat: 53.2194, lng: 6.5665 },
  { id: "arnhem", nameAr: "آرنهم", nameNl: "Arnhem", nameEn: "Arnhem", lat: 51.9851, lng: 5.8987 },
  { id: "enschede", nameAr: "أنشخيدة", nameNl: "Enschede", nameEn: "Enschede", lat: 52.2215, lng: 6.8937 },
];

export interface PrayerTimesResult {
  city: CityCoords;
  date: string;
  hijriDate: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  nextPrayer: {
    key: "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";
    time: string;
    remainingMinutes: number;
  };
}

const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
function toArabicDigits(str: string): string {
  return str.replace(/[0-9]/g, (d) => ARABIC_DIGITS[parseInt(d, 10)] ?? d);
}

const d2r = (d: number) => (d * Math.PI) / 180;
const r2d = (r: number) => (r * 180) / Math.PI;

function getJulianDate(date: Date): number {
  const y = date.getUTCFullYear();
  let m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  let year = y;
  if (m <= 2) {
    year -= 1;
    m += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

function calculateSunPosition(jd: number) {
  const D = jd - 2451545.0;
  const g = (357.529 + 0.98560028 * D) % 360;
  const q = (280.459 + 0.98564736 * D) % 360;
  const L = (q + 1.915 * Math.sin(d2r(g)) + 0.02 * Math.sin(d2r(2 * g))) % 360;
  const e = 23.439 - 0.00000036 * D;
  const RA = (r2d(Math.atan2(Math.cos(d2r(e)) * Math.sin(d2r(L)), Math.cos(d2r(L)))) / 15 + 24) % 24;
  const decl = r2d(Math.asin(Math.sin(d2r(e)) * Math.sin(d2r(L))));
  const EqT = q / 15 - RA;
  return { decl, EqT };
}

function getTimeForAngle(angle: number, lat: number, decl: number, isMorning: boolean) {
  const cosH = (Math.sin(d2r(angle)) - Math.sin(d2r(lat)) * Math.sin(d2r(decl))) /
               (Math.cos(d2r(lat)) * Math.cos(d2r(decl)));
  if (cosH > 1 || cosH < -1) return null;
  const H = r2d(Math.acos(cosH)) / 15;
  return isMorning ? -H : H;
}

function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatHours(hours: number): string {
  let h = Math.floor(hours) % 24;
  if (h < 0) h += 24;
  const m = Math.floor((hours - Math.floor(hours)) * 60);
  return `${padZero(h)}:${padZero(m)}`;
}

export function calculatePrayerTimes(cityId: string = "amsterdam", targetDate: Date = new Date(), locale: string = "ar"): PrayerTimesResult {
  const city = DUTCH_CITIES.find(c => c.id === cityId) || DUTCH_CITIES[0];
  
  const amsStr = targetDate.toLocaleString("en-US", { timeZone: "Europe/Amsterdam" });
  const amsDate = new Date(amsStr);
  const utcDate = new Date(targetDate.toISOString());
  const diffHours = (amsDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
  const tzOffset = Math.round(diffHours);

  const jd = getJulianDate(amsDate);
  const { decl, EqT } = calculateSunPosition(jd);

  const noon = 12 + tzOffset - city.lng / 15 - EqT;

  let sunRiseDiff = getTimeForAngle(-0.833, city.lat, decl, true);
  let sunSetDiff = getTimeForAngle(-0.833, city.lat, decl, false);
  if (sunRiseDiff === null) sunRiseDiff = -6;
  if (sunSetDiff === null) sunSetDiff = 6;

  const sunriseHours = noon + sunRiseDiff;
  const maghribHours = noon + sunSetDiff;

  let fajrDiff = getTimeForAngle(-18, city.lat, decl, true);
  if (fajrDiff === null) {
    const nightDuration = 24 - (maghribHours - sunriseHours);
    fajrDiff = sunRiseDiff - nightDuration / 7;
  }
  const fajrHours = noon + fajrDiff;

  const noonSunAngle = 90 - Math.abs(city.lat - decl);
  const noonShadow = 1 / Math.tan(d2r(noonSunAngle));
  const asrSunAngle = r2d(Math.atan(1 / (1 + noonShadow)));
  let asrDiff = getTimeForAngle(asrSunAngle, city.lat, decl, false);
  if (asrDiff === null) asrDiff = sunSetDiff * 0.6;
  const asrHours = noon + asrDiff;

  let ishaDiff = getTimeForAngle(-16, city.lat, decl, false);
  if (ishaDiff === null) {
    const nightDuration = 24 - (maghribHours - sunriseHours);
    ishaDiff = sunSetDiff + nightDuration / 7;
  }
  const ishaHours = noon + ishaDiff;

  const rawTimes = {
    fajr: formatHours(fajrHours),
    sunrise: formatHours(sunriseHours),
    dhuhr: formatHours(noon),
    asr: formatHours(asrHours),
    maghrib: formatHours(maghribHours),
    isha: formatHours(ishaHours),
  };

  const nowHours = amsDate.getHours() + amsDate.getMinutes() / 60;
  const prayerHoursList = [
    { key: "fajr" as const, hours: fajrHours, str: rawTimes.fajr },
    { key: "sunrise" as const, hours: sunriseHours, str: rawTimes.sunrise },
    { key: "dhuhr" as const, hours: noon, str: rawTimes.dhuhr },
    { key: "asr" as const, hours: asrHours, str: rawTimes.asr },
    { key: "maghrib" as const, hours: maghribHours, str: rawTimes.maghrib },
    { key: "isha" as const, hours: ishaHours, str: rawTimes.isha },
  ];

  let nextP = prayerHoursList.find(p => p.hours > nowHours);
  let remainingMins = 0;
  if (!nextP) {
    nextP = prayerHoursList[0];
    remainingMins = Math.round((24 - nowHours + prayerHoursList[0].hours) * 60);
  } else {
    remainingMins = Math.round((nextP.hours - nowHours) * 60);
  }

  let hijriFormatted = "";
  try {
    const hijriFormatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-islamic-umalqura" : "en-US-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
    hijriFormatted = hijriFormatter.format(amsDate);
  } catch {
    hijriFormatted = locale === "ar" ? "١٤٤٨ هـ" : "1448 AH";
  }

  return {
    city,
    date: amsDate.toISOString().split("T")[0],
    hijriDate: locale === "ar" ? toArabicDigits(hijriFormatted) : hijriFormatted,
    fajr: locale === "ar" ? toArabicDigits(rawTimes.fajr) : rawTimes.fajr,
    sunrise: locale === "ar" ? toArabicDigits(rawTimes.sunrise) : rawTimes.sunrise,
    dhuhr: locale === "ar" ? toArabicDigits(rawTimes.dhuhr) : rawTimes.dhuhr,
    asr: locale === "ar" ? toArabicDigits(rawTimes.asr) : rawTimes.asr,
    maghrib: locale === "ar" ? toArabicDigits(rawTimes.maghrib) : rawTimes.maghrib,
    isha: locale === "ar" ? toArabicDigits(rawTimes.isha) : rawTimes.isha,
    nextPrayer: {
      key: nextP.key,
      time: locale === "ar" ? toArabicDigits(nextP.str) : nextP.str,
      remainingMinutes: remainingMins,
    }
  };
}
