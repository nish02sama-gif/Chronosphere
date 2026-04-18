/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Cloud, Clock, Calendar, Map, Settings as SettingsIcon, 
  MapPin, Bell, CheckCircle2, Navigation, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TabType, ChronoState, WeatherData, CalendarEvent, Settings } from './types';
import WeatherModule from './WeatherModule';
import ClockModule from './ClockModule';
import CalendarModule from './CalendarModule';
import MapsModule from './MapsModule';

const DEFAULT_COORDS: [number, number] = [51.505, -0.09]; // London
const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_KEY || 'c2d1be2ef5e440ba892c4b582814f255';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('clock');
  const [state, setState] = useState<ChronoState>(() => {
    const saved = localStorage.getItem('chrono_state');
    if (saved) return JSON.parse(saved);
    return {
      currentCity: 'Getting location...',
      coords: DEFAULT_COORDS,
      weather: null,
      events: [],
      preferences: {
        units: 'metric',
        timeFormat: '24h',
        accentColor: '#4A90D9',
        notificationsEnabled: true
      },
      onboardingComplete: false
    };
  });

  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem('chrono_state', JSON.stringify(state));
  }, [state]);

  const loadWeatherData = useCallback(async (lat: number, lon: number, cityName?: string) => {
    setIsLoadingWeather(true);
    try {
      // 1. Get City Name if not provided
      let finalCity = cityName;
      if (!finalCity) {
        const geoResp = await window.fetch(`https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${GEOAPIFY_KEY}`);
        const geoData = await geoResp.json();
        const address = geoData.features?.[0]?.properties;
        finalCity = address?.city || address?.town || address?.village || address?.suburb || 'Unknown Location';
      }

      // 2. Get Weather via Open-Meteo
      const weatherResp = await window.fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode,precipitation_probability&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max&timezone=auto`
      );
      const wData = await weatherResp.json();

      // 3. Transform to our type
      const weather: WeatherData = {
        temp: wData.current_weather.temperature,
        condition: 'Clear', // Mapping handled by code
        conditionCode: wData.current_weather.weathercode,
        feelsLike: wData.current_weather.temperature - 2, // Approximation
        humidity: 65,
        windSpeed: wData.current_weather.windspeed,
        windDir: wData.current_weather.winddirection,
        uvIndex: 4,
        aqi: 22,
        sunrise: wData.daily.sunrise[0].split('T')[1],
        sunset: wData.daily.sunset[0].split('T')[1],
        cityName: finalCity!,
        hourly: wData.hourly.time.slice(0, 24).map((t: string, i: number) => ({
          time: t.split('T')[1],
          temp: wData.hourly.temperature_2m[i],
          conditionCode: wData.hourly.weathercode[i],
          precipProb: wData.hourly.precipitation_probability[i]
        })),
        daily: wData.daily.time.map((d: string, i: number) => ({
          date: new Date(d).toLocaleDateString(undefined, { weekday: 'short' }),
          high: wData.daily.temperature_2m_max[i],
          low: wData.daily.temperature_2m_min[i],
          conditionCode: wData.daily.weathercode[i],
          precipProb: wData.daily.precipitation_probability_max[i]
        }))
      };

      setState(prev => ({ ...prev, weather, currentCity: finalCity!, coords: [lat, lon] }));
    } catch (err) {
      console.error('Weather fetch error:', err);
    } finally {
      setIsLoadingWeather(false);
    }
  }, []);

  const searchCity = async (city: string) => {
    setIsLoadingWeather(true);
    try {
      const resp = await window.fetch(`https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(city)}&apiKey=${GEOAPIFY_KEY}`);
      const data = await resp.json();
      if (data.features && data.features[0]) {
        const feature = data.features[0];
        loadWeatherData(feature.properties.lat, feature.properties.lon, feature.properties.city || feature.properties.name || feature.properties.formatted);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingWeather(false);
    }
  };

  useEffect(() => {
    const initLocation = async () => {
      // 1. First attempt: IP-based location for immediate synchronization
      try {
        const ipResp = await window.fetch(`https://api.geoapify.com/v1/ipinfo?apiKey=${GEOAPIFY_KEY}`);
        const ipData = await ipResp.json();
        if (ipData?.location) {
          loadWeatherData(ipData.location.latitude, ipData.location.longitude, ipData.city?.name);
        }
      } catch (e) {
        console.warn('IP info failed, falling back to browser geolocation', e);
      }

      // 2. Second attempt: Precision GPS if available
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => loadWeatherData(pos.coords.latitude, pos.coords.longitude),
          () => console.log('Geolocation permission denied or unavailable')
        );
      }
    };

    if (!state.onboardingComplete) {
      initLocation();
    }
  }, [loadWeatherData, state.onboardingComplete]);

  const addEvent = async (event: Omit<CalendarEvent, 'id'>) => {
    let coords: [number, number] | undefined;
    if (event.location) {
      try {
        const resp = await window.fetch(`https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(event.location)}&apiKey=${GEOAPIFY_KEY}`);
        const data = await resp.json();
        if (data.features && data.features[0]) {
          const feature = data.features[0];
          coords = [feature.properties.lat, feature.properties.lon];
        }
      } catch (e) {
        console.error('Geocoding error:', e);
      }
    }

    const newEvent: CalendarEvent = {
        ...event,
        id: Math.random().toString(36).substr(2, 9),
        locationCoords: coords
    };
    setState(prev => ({ ...prev, events: [...prev.events, newEvent] }));
  };

  const deleteEvent = (id: string) => {
    setState(prev => ({ ...prev, events: prev.events.filter(e => e.id !== id) }));
  };

  const [dismissSummary, setDismissSummary] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tabs: TabType[] = ['weather', 'clock', 'calendar', 'maps'];
      if (e.key === 'ArrowRight') {
        setActiveTab(prev => {
          const idx = tabs.indexOf(prev as any);
          return idx === -1 || idx === tabs.length - 1 ? tabs[0] : tabs[idx + 1];
        });
      }
      if (e.key === 'ArrowLeft') {
        setActiveTab(prev => {
          const idx = tabs.indexOf(prev as any);
          return idx === -1 || idx === 0 ? tabs[tabs.length - 1] : tabs[idx - 1];
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
       {/* Background Noise/Gradient */}
       <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
          <div className="absolute top-0 -left-1/4 w-full h-[800px] bg-accent-blue/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-0 -right-1/4 w-full h-[800px] bg-accent-violet/10 blur-[120px] rounded-full" />
       </div>

       {/* Header Navigation */}
       <header className="fixed top-0 left-0 right-0 h-20 z-40 backdrop-blur-[10px] border-b border-white/10">
          <nav className="max-w-7xl mx-auto px-10 h-full flex items-center justify-between">
             <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold tracking-tighter bg-gradient-to-br from-accent-blue to-accent-violet bg-clip-text text-transparent hidden sm:block uppercase">ASTRAVIEW OS</h1>
             </div>

             <div className="nav-tabs-container">
                <TabButton active={activeTab === 'weather'} onClick={() => setActiveTab('weather')} icon={Cloud} label="Weather" />
                <TabButton active={activeTab === 'clock'} onClick={() => setActiveTab('clock')} icon={Clock} label="Clock" />
                <TabButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={Calendar} label="Calendar" />
                <TabButton active={activeTab === 'maps'} onClick={() => setActiveTab('maps')} icon={Map} label="Maps" />
             </div>

             <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 hover:bg-white/5 rounded-full relative transition-all"
                >
                   <Bell className="w-5 h-5 text-slate-400" />
                   {state.events.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-accent-violet rounded-full" />}
                </button>
                <button onClick={() => setActiveTab('settings')} className="p-2 hover:bg-white/5 rounded-full text-slate-400">
                   <SettingsIcon className="w-5 h-5" />
                </button>
             </div>
          </nav>
       </header>

       {/* Main Content Area */}
       <main className="flex-1 mt-20 pb-24 px-10 max-w-7xl mx-auto w-full pt-10">
          {state.onboardingComplete && !dismissSummary && activeTab === 'clock' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-10 glass-card p-10 relative overflow-hidden"
            >
               <div className="absolute -top-20 -right-20 w-80 h-80 bg-accent-blue/15 blur-[120px]" />
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
                  <div className="space-y-4">
                     <p className="text-xl text-[#94a3b8]">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                     <h3 className="text-5xl font-bold tracking-tight text-white mb-8">Good Day, User</h3>
                     
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-8 w-full">
                       <div className="bg-slate-800 rounded-2xl p-6 border border-white/5">
                          <span className="text-xs uppercase tracking-widest text-[#94a3b8] mb-3 block">Current Temp</span>
                          <div className="text-3xl font-semibold">
                            {state.weather ? `${Math.round(state.weather.temp)}°C` : '--'}
                          </div>
                          <p className="text-sm mt-2 text-green-400">{state.weather?.condition || 'Partly Cloudy'}</p>
                       </div>
                       <div className="bg-slate-800 rounded-2xl p-6 border border-white/5">
                          <span className="text-xs uppercase tracking-widest text-[#94a3b8] mb-3 block">Next Event</span>
                          <div className="text-3xl font-semibold">
                             {state.events[0]?.title || 'No events'}
                          </div>
                          <p className="text-sm mt-2 text-[#94a3b8]">in 45 minutes</p>
                       </div>
                     </div>
                  </div>
                  <button 
                   onClick={() => setDismissSummary(true)}
                   className="px-8 py-3 rounded-full bg-accent-blue text-white font-bold text-sm shadow-xl shadow-accent-blue/30 hover:scale-105 active:scale-95 transition-all"
                  >
                    DASHBOARD INITIALIZED
                  </button>
               </div>
            </motion.div>
          )}
          <AnimatePresence mode="wait">
             <motion.div
               key={activeTab}
               initial={{ opacity: 0, x: 10 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -10 }}
               transition={{ duration: 0.2 }}
               className="h-full"
             >
                {activeTab === 'clock' && <ClockModule />}
                {activeTab === 'weather' && (
                  <WeatherModule 
                    weather={state.weather} 
                    onSearch={searchCity} 
                    isLoading={isLoadingWeather} 
                    units={state.preferences.units} 
                  />
                )}
                {activeTab === 'calendar' && (
                  <CalendarModule 
                    events={state.events} 
                    weather={state.weather}
                    onAddEvent={addEvent} 
                    onDeleteEvent={deleteEvent}
                  />
                )}
                {activeTab === 'maps' && <MapsModule center={state.coords} events={state.events} />}
                {activeTab === 'settings' && <SettingsPanel state={state} setState={setState} />}
             </motion.div>
          </AnimatePresence>
       </main>

       {/* Footer HUD */}
       <footer className="fixed bottom-0 left-0 right-0 h-[60px] bg-black/20 backdrop-blur-md border-t border-white/10 z-30">
          <div className="max-w-7xl mx-auto h-full px-10 flex items-center justify-between text-[13px] font-medium text-[#94a3b8]">
             <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-[#4ade80] shadow-[0_0_10px_#4ade8088]" />
                   <span>GPS Active</span>
                </div>
                <div className="flex items-center gap-2">
                   <MapPin className="w-4 h-4 text-accent-blue" />
                   <span className="text-white">{state.currentCity}, {state.weather ? `${Math.round(state.weather.temp)}°C` : '--'}</span>
                </div>
             </div>

             <div className="hidden md:flex items-center gap-24">
                <span>Last sync: 2 minutes ago</span>
                <div className="flex items-center gap-2 text-white font-mono">
                   {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
             </div>
          </div>
       </footer>

       {/* Onboarding Overlay */}
       <AnimatePresence>
         {!state.onboardingComplete && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] bg-slate-950 backdrop-blur-2xl flex items-center justify-center p-6"
           >
              <div className="max-w-md w-full text-center space-y-8">
                 <div className="w-20 h-20 mx-auto bg-gradient-to-br from-accent-blue to-accent-violet rounded-3xl flex items-center justify-center shadow-2xl shadow-accent-blue/30 rotate-12">
                   <Navigation className="w-10 h-10 text-white -rotate-12" />
                 </div>
                 <div className="space-y-4">
                    <h2 className="text-4xl font-black font-display tracking-tight text-white uppercase italic">Welcome to AstraView OS</h2>
                    <p className="text-slate-400 text-lg leading-relaxed">
                      Your precision-engineered mission control for global time, weather, and world-scale navigation.
                    </p>
                 </div>
                 <div className="space-y-4">
                   <button 
                    onClick={() => {
                      setState(prev => ({ ...prev, onboardingComplete: true }));
                      if ("Notification" in window) {
                        Notification.requestPermission();
                      }
                    }}
                    className="w-full bg-accent-blue hover:bg-accent-blue/80 text-white font-bold py-4 rounded-2xl shadow-xl shadow-accent-blue/20 transition-all active:scale-95"
                   >
                     Initialize Dashboard
                   </button>
                   <p className="text-[10px] uppercase font-bold tracking-widest text-slate-600">Privacy-First • No Tracking • Local Persistence</p>
                 </div>
              </div>
           </motion.div>
         )}
       </AnimatePresence>

       {/* Notifications Slide-over */}
       <AnimatePresence>
          {showNotifications && (
            <motion.div 
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="fixed top-20 right-4 bottom-20 w-80 glass-card !p-0 z-50 flex flex-col shadow-2xl overflow-hidden"
            >
               <div className="p-6 bg-white/5 border-b border-white/5 flex justify-between items-center">
                 <h3 className="font-bold text-sm uppercase tracking-wider">Alerts & Notifications</h3>
                 <button onClick={() => setShowNotifications(false)} className="text-slate-500 hover:text-white"><AlertCircle className="w-5 h-5" /></button>
               </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {state.events.length === 0 ? (
                    <div className="text-center py-20 opacity-20">
                      <Bell className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-xs font-bold">No active alerts</p>
                    </div>
                  ) : (
                    state.events.map(e => (
                      <div key={e.id} className="p-3 bg-white/5 rounded-xl border-l-2 border-accent-blue">
                         <p className="text-xs font-bold text-white mb-1">{e.title}</p>
                         <p className="text-[10px] text-slate-500">{new Date(e.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    ))
                  )}
               </div>
            </motion.div>
          )}
       </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 sm:px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${active ? 'bg-accent-blue text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden md:inline">{label}</span>
      {active && <motion.div layoutId="activeTab" className="absolute" />}
    </button>
  );
}

function SettingsPanel({ state, setState }: { state: ChronoState; setState: any }) {
  return (
    <div className="max-w-2xl mx-auto glass-card">
       <h2 className="text-2xl font-bold mb-8">Preferences</h2>
       <div className="space-y-8">
          <div className="flex justify-between items-center">
             <div>
               <h4 className="font-bold">Temperature Units</h4>
               <p className="text-xs text-slate-500">Choose between Celsius and Fahrenheit</p>
             </div>
             <div className="flex bg-slate-900 rounded-lg p-1 border border-white/10">
                <button 
                  onClick={() => setState((s: any) => ({ ...s, preferences: { ...s.preferences, units: 'metric' } }))}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold ${state.preferences.units === 'metric' ? 'bg-white/10 text-white' : 'text-slate-500'}`}
                >Metric</button>
                <button 
                  onClick={() => setState((s: any) => ({ ...s, preferences: { ...s.preferences, units: 'imperial' } }))}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold ${state.preferences.units === 'imperial' ? 'bg-white/10 text-white' : 'text-slate-500'}`}
                >Imperial</button>
             </div>
          </div>

          <div className="flex justify-between items-center">
             <div>
               <h4 className="font-bold">Notifications</h4>
               <p className="text-xs text-slate-500">Allow browser desktop notifications for events</p>
             </div>
             <button 
                onClick={() => setState((s: any) => ({ ...s, preferences: { ...s.preferences, notificationsEnabled: !s.preferences.notificationsEnabled } }))}
                className={`w-12 h-6 rounded-full transition-all relative ${state.preferences.notificationsEnabled ? 'bg-accent-blue' : 'bg-slate-800'}`}
             >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${state.preferences.notificationsEnabled ? 'left-7' : 'left-1'}`} />
             </button>
          </div>

          <div className="pt-8 border-t border-white/5 text-center">
             <button 
               onClick={() => {
                 localStorage.removeItem('chrono_state');
                 window.location.reload();
               }}
               className="text-red-400 text-xs font-bold uppercase tracking-widest hover:text-red-300 transition-all"
             >
               Reset Local Storage
             </button>
          </div>
       </div>
    </div>
  );
}
