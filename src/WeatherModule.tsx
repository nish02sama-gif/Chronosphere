/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, Wind, Droplets, Thermometer, Sunrise, Sunset, Search, Navigation } from 'lucide-react';
import { WeatherData } from './types';
import { motion, AnimatePresence } from 'motion/react';

interface WeatherModuleProps {
  weather: WeatherData | null;
  onSearch: (city: string) => void;
  isLoading: boolean;
  units: 'metric' | 'imperial';
}

const CONDITION_MAP: Record<number, { label: string; icon: any; color: string }> = {
  0: { label: 'Clear Sky', icon: Sun, color: 'from-orange-400 to-orange-600' },
  1: { label: 'Mainly Clear', icon: Sun, color: 'from-orange-300 to-orange-500' },
  2: { label: 'Partly Cloudy', icon: Cloud, color: 'from-blue-400 to-slate-400' },
  3: { label: 'Overcast', icon: Cloud, color: 'from-slate-500 to-slate-700' },
  45: { label: 'Fog', icon: Cloud, color: 'from-slate-600 to-slate-800' },
  48: { label: 'Fog', icon: Cloud, color: 'from-slate-600 to-slate-800' },
  51: { label: 'Drizzle', icon: CloudRain, color: 'from-blue-400 to-blue-600' },
  61: { label: 'Rain', icon: CloudRain, color: 'from-blue-600 to-indigo-800' },
  71: { label: 'Snow', icon: Cloud, color: 'from-white to-blue-200' },
  95: { label: 'Thunderstorm', icon: CloudRain, color: 'from-indigo-900 to-purple-900' },
};

export default function WeatherModule({ weather, onSearch, isLoading, units }: WeatherModuleProps) {
  const [searchInput, setSearchInput] = useState('');

  const condition = weather ? CONDITION_MAP[weather.conditionCode] || CONDITION_MAP[0] : CONDITION_MAP[0];
  const Icon = condition.icon;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearch(searchInput);
      setSearchInput('');
    }
  };

  if (!weather && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <Navigation className="w-16 h-16 text-accent-blue mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold mb-2">Enable Location</h2>
        <p className="text-slate-400 max-w-md mx-auto mb-6">
          To give you accurate weather and local time, please enable location services or search for a city.
        </p>
        <form onSubmit={handleSubmit} className="relative w-full max-w-sm">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search city..."
            className="w-full bg-slate-900 border border-white/10 rounded-full px-6 py-3 pl-12 focus:outline-none focus:border-accent-blue transition-all"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            {weather?.cityName || 'Current Weather'}
            <span className="text-slate-500 text-sm font-normal">Now</span>
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="relative w-full md:w-64">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search city..."
            className="w-full bg-slate-900 border border-white/10 rounded-full px-5 py-2 pl-10 focus:outline-none focus:border-accent-blue transition-all"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        </form>
      </div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 h-64 bg-white/5 animate-pulse rounded-2xl" />
            <div className="h-64 bg-white/5 animate-pulse rounded-2xl" />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Hero Card */}
            <div className={`lg:col-span-2 relative overflow-hidden glass-card h-80 flex flex-col justify-between group`}>
               {/* Background Glow */}
               <div className={`absolute -right-20 -top-20 w-80 h-80 bg-gradient-to-br ${condition.color} opacity-20 blur-3xl rounded-full transition-all duration-700 group-hover:scale-110`} />
               
               <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">{condition.label}</p>
                    <div className="flex items-end gap-3">
                      <h3 className="text-7xl font-bold">
                        {Math.round(weather!.temp)}°
                        <span className="text-3xl font-normal opacity-50">{units === 'metric' ? 'C' : 'F'}</span>
                      </h3>
                      <Icon className="w-16 h-16 text-white mb-2" />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-sm">Feels like</p>
                    <p className="text-2xl font-semibold">{Math.round(weather!.feelsLike)}°</p>
                  </div>
               </div>

               <div className="grid grid-cols-4 gap-4 relative z-10 border-t border-white/5 pt-6">
                  <DetailItem icon={Droplets} label="Humidity" value={`${weather!.humidity}%`} />
                  <DetailItem icon={Wind} label="Wind" value={`${Math.round(weather!.windSpeed)} km/h`} />
                  <DetailItem icon={Sun} label="UV Index" value={weather!.uvIndex.toString()} />
                  <DetailItem icon={Cloud} label="Visibility" value="10 km" />
               </div>
            </div>

            {/* Sun Progress & Details */}
            <div className="glass-card flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-6 font-mono">Astronomy</h4>
                <div className="relative h-24 mb-6">
                  {/* Sunset Progress Arc */}
                  <div className="absolute inset-0 border-t-2 border-white/10 rounded-t-full" />
                  <div className="absolute inset-0 border-t-2 border-accent-blue rounded-t-full" style={{ clipPath: 'inset(0 50% 0 0)' }} />
                  <div className="absolute bottom-0 w-full flex justify-between px-2 text-xs text-slate-500">
                    <div className="flex flex-col items-center">
                      <Sunrise className="w-4 h-4 mb-1 text-orange-400" />
                      <span>{weather!.sunrise}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Sunset className="w-4 h-4 mb-1 text-slate-400" />
                      <span>{weather!.sunset}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">AQI Index</span>
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-500 rounded-full text-xs">Good ({weather!.aqi})</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Pressure</span>
                  <span className="text-white">1012 hPa</span>
                </div>
              </div>
            </div>

            {/* Hourly Forecast */}
            <div className="lg:col-span-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 px-2 font-mono">24-Hour Forecast</h4>
              <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                {weather!.hourly.map((h, i) => {
                  const HIcon = CONDITION_MAP[h.conditionCode]?.icon || Cloud;
                  return (
                    <div key={i} className="flex-shrink-0 w-24 glass-card p-4 flex flex-col items-center gap-2 hover:bg-white/10">
                      <span className="text-xs font-medium text-slate-400">{h.time}</span>
                      <HIcon className="w-6 h-6 text-white" />
                      <span className="text-lg font-bold">{Math.round(h.temp)}°</span>
                      <div className="flex items-center gap-1 text-[10px] text-blue-400">
                        <Droplets className="w-3 h-3" />
                        <span>{h.precipProb}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 7-Day Forecast */}
            <div className="lg:col-span-3 glass-card">
               <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6 font-mono">7-Day Outlook</h4>
               <div className="space-y-4">
                 {weather!.daily.map((d, i) => {
                   const DIcon = CONDITION_MAP[d.conditionCode]?.icon || Cloud;
                   return (
                     <div key={i} className="flex justify-between items-center group py-2 border-b border-white/5 last:border-0 hover:px-2 transition-all">
                       <span className="w-24 font-medium">{d.date}</span>
                       <div className="flex items-center gap-3 flex-1 px-4">
                         <DIcon className="w-5 h-5 text-slate-400" />
                         <div className="flex items-center gap-2 text-xs text-blue-400 opacity-60">
                           <CloudRain className="w-3 h-3" />
                           <span>{d.precipProb}%</span>
                         </div>
                       </div>
                       <div className="flex items-center gap-4">
                         <span className="font-bold">{Math.round(d.high)}°</span>
                         <span className="text-slate-500">{Math.round(d.low)}°</span>
                       </div>
                     </div>
                   );
                 })}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-slate-400 text-xs">
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </div>
      <span className="font-semibold text-lg">{value}</span>
    </div>
  );
}
