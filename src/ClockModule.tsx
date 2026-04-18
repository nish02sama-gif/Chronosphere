/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer, History, Globe } from 'lucide-react';
import { motion } from 'motion/react';

const TIMEZONES = [
  { name: 'London', zone: 'Europe/London' },
  { name: 'New York', zone: 'America/New_York' },
  { name: 'Tokyo', zone: 'Asia/Tokyo' },
  { name: 'Dubai', zone: 'Asia/Dubai' },
  { name: 'Sydney', zone: 'Australia/Sydney' },
];

export default function ClockModule() {
  const [time, setTime] = useState(new Date());
  const [mode, setMode] = useState<'clock' | 'timer' | 'stopwatch'>('clock');
  
  // Stopwatch state
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);
  const stopwatchRef = useRef<NodeJS.Timeout | null>(null);

  // Timer state
  const [timerLeft, setTimerLeft] = useState(0);
  const [timerInput, setTimerInput] = useState('00:05:00');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 100);
    return () => clearInterval(interval);
  }, []);

  // Stopwatch Logic
  useEffect(() => {
    if (isRunning) {
      const start = Date.now() - elapsed;
      stopwatchRef.current = setInterval(() => {
        setElapsed(Date.now() - start);
      }, 10);
    } else {
      if (stopwatchRef.current) clearInterval(stopwatchRef.current);
    }
    return () => { if (stopwatchRef.current) clearInterval(stopwatchRef.current); };
  }, [isRunning]);

  // Timer Logic
  useEffect(() => {
    if (isTimerRunning && timerLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimerLeft(prev => Math.max(0, prev - 1000));
      }, 1000);
    } else if (timerLeft === 0) {
      setIsTimerRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTimerRunning, timerLeft]);

  const formatStopwatch = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  const formatTimer = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Analog Clock Calculations
  const seconds = time.getSeconds() + time.getMilliseconds() / 1000;
  const minutes = time.getMinutes() + seconds / 60;
  const hours = (time.getHours() % 12) + minutes / 60;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Mode Switches */}
      <div className="flex justify-center gap-2 p-1 bg-slate-900/50 rounded-xl w-fit mx-auto border border-white/5">
        {(['clock', 'timer', 'stopwatch'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${mode === m ? 'bg-accent-blue text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {mode === 'clock' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center px-4">
          {/* Analog Clock */}
          <div className="relative w-full max-w-[320px] aspect-square mx-auto">
             <div className="absolute inset-0 rounded-full border-8 border-slate-900 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-slate-900/40 backdrop-blur-sm" />
             
             {/* Clock Face Ticks */}
             {[...Array(12)].map((_, i) => (
               <div key={i} className="absolute inset-0" style={{ transform: `rotate(${i * 30}deg)` }}>
                 <div className="w-1.5 h-4 bg-white/10 mx-auto rounded-full mt-2" />
               </div>
             ))}

             {/* Hands */}
             <Hand length={60} thickness={6} color="#fff" rotation={hours * 30} />
             <Hand length={80} thickness={4} color="#94a3b8" rotation={minutes * 6} />
             <Hand length={90} thickness={2} color="#7C4DFF" rotation={seconds * 6} />
             
             {/* Center Pin */}
             <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-4 h-4 rounded-full bg-slate-950 border-2 border-accent-violet z-30" />
             </div>
          </div>

          {/* Digital Clock & Date */}
          <div className="text-center lg:text-left space-y-6">
            <div>
              <h1 className="text-8xl font-black font-mono tracking-tighter tabular-nums text-white">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                <span className="text-3xl font-light text-slate-500 ml-2">
                  {time.toLocaleTimeString([], { second: '2-digit', hour12: false }).split(':')[1]}
                </span>
              </h1>
              <p className="text-2xl text-slate-400 mt-2 font-display">
                {time.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {TIMEZONES.map(tz => (
                <div key={tz.zone} className="glass-card !p-4 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-accent-blue" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{tz.name}</p>
                      <p className="text-lg font-mono font-medium">
                        {new Date().toLocaleTimeString([], { timeZone: tz.zone, hour: '2-digit', minute: '2-digit', hour12: false })}
                      </p>
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${isDay(tz.zone) ? 'bg-orange-400' : 'bg-slate-700'}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === 'stopwatch' && (
        <div className="text-center space-y-8 animate-in fade-in zoom-in duration-300">
           <div className="text-8xl font-mono tracking-tighter text-white tabular-nums drop-shadow-2xl">
             {formatStopwatch(elapsed)}
           </div>

           <div className="flex justify-center gap-6">
              <button 
                onClick={() => { setElapsed(0); setLaps([]); setIsRunning(false); }}
                className="w-16 h-16 rounded-full glass flex items-center justify-center hover:bg-slate-800 transition-all text-slate-400"
              >
                <RotateCcw className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setIsRunning(!isRunning)}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-xl ${isRunning ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-accent-blue hover:bg-accent-blue/80 text-white'}`}
              >
                {isRunning ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-2" />}
              </button>
              <button 
                disabled={!isRunning}
                onClick={() => setLaps([elapsed, ...laps])}
                className="w-16 h-16 rounded-full glass flex items-center justify-center hover:bg-slate-800 transition-all disabled:opacity-30 text-accent-blue"
              >
                <History className="w-6 h-6" />
              </button>
           </div>

           {laps.length > 0 && (
             <div className="max-w-md mx-auto glass rounded-2xl overflow-hidden mt-8">
                <div className="bg-white/5 px-6 py-3 flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
                  <span>Lap</span>
                  <span>Time</span>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-white/5">
                  {laps.map((lap, i) => (
                    <div key={i} className="px-6 py-3 flex justify-between font-mono">
                      <span className="text-slate-500">#{laps.length - i}</span>
                      <span>{formatStopwatch(lap)}</span>
                    </div>
                  ))}
                </div>
             </div>
           )}
        </div>
      )}

      {mode === 'timer' && (
        <div className="text-center space-y-8 animate-in fade-in zoom-in duration-300">
          <div className="space-y-4">
            {!isTimerRunning && timerLeft === 0 ? (
               <div className="flex justify-center items-center gap-2">
                 <input 
                   type="time" 
                   step="1"
                   value={timerInput}
                   onChange={(e) => setTimerInput(e.target.value)}
                   className="text-7xl font-mono bg-transparent border-none focus:ring-0 text-white p-0 text-center"
                 />
               </div>
            ) : (
              <div className="text-8xl font-mono tracking-tighter text-white tabular-nums drop-shadow-2xl">
                {formatTimer(timerLeft)}
              </div>
            )}
          </div>

          <div className="flex justify-center gap-6">
              <button 
                onClick={() => { 
                  setIsTimerRunning(false); 
                  setTimerLeft(0); 
                }}
                className="w-16 h-16 rounded-full glass flex items-center justify-center hover:bg-slate-800 transition-all text-slate-400"
              >
                <RotateCcw className="w-6 h-6" />
              </button>
              <button 
                onClick={() => {
                  if (!isTimerRunning && timerLeft === 0) {
                    const [h, m, s] = timerInput.split(':').map(Number);
                    setTimerLeft((h * 3600 + m * 60 + s) * 1000);
                  }
                  setIsTimerRunning(!isTimerRunning);
                }}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-xl ${isTimerRunning ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-accent-blue hover:bg-accent-blue/80 text-white'}`}
              >
                {isTimerRunning ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-2" />}
              </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Hand({ length, thickness, color, rotation }: { length: number; thickness: number; color: string; rotation: number }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ transform: `rotate(${rotation}deg)` }}>
      <div 
        className="rounded-full shadow-lg"
        style={{ 
          width: thickness, 
          height: `${length}%`, 
          backgroundColor: color, 
          marginBottom: `${length}%` 
        }} 
      />
    </div>
  );
}

function isDay(zone: string) {
  const h = new Date(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: zone }).format(new Date())).getHours();
  return h >= 6 && h < 18;
}
