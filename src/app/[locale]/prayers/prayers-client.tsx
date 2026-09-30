"use client";

import { useState, useEffect } from "react";
import { DUTCH_CITIES, calculatePrayerTimes, PrayerTimesResult } from "@/lib/prayers";
import { Compass, Clock, MapPin, Calendar, Sun, Moon, Sunrise, Sunset, Bell } from "lucide-react";

interface Props {
  initialData: PrayerTimesResult;
  locale: string;
  labels: {
    title: string;
    subtitle: string;
    selectCity: string;
    fajr: string;
    sunrise: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
    nextPrayer: string;
    remaining: string;
    minutes: string;
    hijriDate: string;
    gregorianDate: string;
    qiblaDirection: string;
  };
}

export function PrayersClient({ initialData, locale, labels }: Props) {
  const [selectedCity, setSelectedCity] = useState(initialData.city.id);
  const [data, setData] = useState<PrayerTimesResult>(initialData);

  useEffect(() => {
    const updated = calculatePrayerTimes(selectedCity, new Date(), locale);
    setData(updated);
  }, [selectedCity, locale]);

  const prayersList = [
    { key: "fajr", label: labels.fajr, time: data.fajr, icon: Moon, color: "from-indigo-900 to-slate-900" },
    { key: "sunrise", label: labels.sunrise, time: data.sunrise, icon: Sunrise, color: "from-amber-600 to-orange-500" },
    { key: "dhuhr", label: labels.dhuhr, time: data.dhuhr, icon: Sun, color: "from-yellow-500 to-amber-500" },
    { key: "asr", label: labels.asr, time: data.asr, icon: Sun, color: "from-orange-500 to-amber-600" },
    { key: "maghrib", label: labels.maghrib, time: data.maghrib, icon: Sunset, color: "from-rose-600 to-indigo-800" },
    { key: "isha", label: labels.isha, time: data.isha, icon: Moon, color: "from-slate-900 to-blue-950" },
  ];

  return (
    <div className="space-y-8">
      {/* City Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 p-2 bg-card rounded-2xl border border-border shadow-sm">
        {DUTCH_CITIES.map((c) => {
          const isSelected = c.id === selectedCity;
          const cityName = locale === "ar" ? c.nameAr : locale === "nl" ? c.nameNl : c.nameEn;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedCity(c.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-md scale-105"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <MapPin className="w-3.5 h-3.5 inline-block mr-1 ml-1" />
              <span>{cityName}</span>
            </button>
          );
        })}
      </div>

      {/* Main Focus Card: Next Prayer & Hijri Calendar */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B132B] via-[#1C2541] to-[#122340] border-2 border-[#CCAA00]/40 p-8 sm:p-12 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#CCAA00]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CCAA00]/20 text-[#CCAA00] text-xs font-bold border border-[#CCAA00]/30">
              <Calendar className="w-3.5 h-3.5" />
              <span>{data.hijriDate}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              {labels.nextPrayer}:{" "}
              <span className="text-[#CCAA00]">
                {labels[data.nextPrayer.key as keyof typeof labels] || data.nextPrayer.key}
              </span>
            </h2>
            <p className="text-gray-300 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#CCAA00]" />
              <span>
                {labels.remaining} {data.nextPrayer.remainingMinutes} {labels.minutes} ({data.nextPrayer.time})
              </span>
            </p>
          </div>

          <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-2xl p-6 border border-gray-800 text-center space-y-2 min-w-[200px]">
            <Compass className="w-8 h-8 text-[#CCAA00] mx-auto animate-pulse" />
            <span className="text-xs uppercase tracking-wider text-gray-400 block font-mono">
              QIBLA COMPASS
            </span>
            <span className="text-lg font-bold text-white block">
              ١٢٨° SE
            </span>
            <span className="text-[11px] text-gray-400 block leading-tight">
              {labels.qiblaDirection}
            </span>
          </div>
        </div>
      </div>

      {/* Grid of 6 Prayer Times */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {prayersList.map((p) => {
          const isNext = p.key === data.nextPrayer.key;
          const Icon = p.icon;
          return (
            <div
              key={p.key}
              className={`rounded-2xl p-5 border text-center transition-all duration-300 ${
                isNext
                  ? "bg-gradient-to-b from-[#1a5632]/20 to-card border-emerald-500 shadow-xl scale-105"
                  : "bg-card border-border/70 hover:border-primary/40 shadow-sm"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-muted mx-auto flex items-center justify-center mb-3">
                <Icon className={`w-5 h-5 ${isNext ? "text-emerald-500" : "text-muted-foreground"}`} />
              </div>
              <span className="text-xs font-bold text-muted-foreground block mb-1">
                {p.label}
              </span>
              <span className={`text-xl sm:text-2xl font-extrabold font-mono block ${isNext ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                {p.time}
              </span>
              {isNext && (
                <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                  {labels.nextPrayer}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
