/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addDays, startOfDay, endOfDay,
  eachHourOfInterval, isWithinInterval, parseISO
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock, Calendar as CalendarIcon, X, Sun, Cloud, CloudRain } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarEvent, WeatherData } from './types';

interface CalendarModuleProps {
  events: CalendarEvent[];
  weather: WeatherData | null;
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  onDeleteEvent: (id: string) => void;
}

export default function CalendarModule({ events, weather, onAddEvent, onDeleteEvent }: CalendarModuleProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newStart, setNewStart] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [newEnd, setNewEnd] = useState(format(addDays(new Date(), 0), "yyyy-MM-dd'T'HH:mm"));
  const [newLocation, setNewLocation] = useState('');
  const [newColor, setNewColor] = useState('#4A90D9');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const hours = eachHourOfInterval({ start: startOfDay(currentDate), end: endOfDay(currentDate) });

  const currentEvents = useMemo(() => {
    return events.filter(e => isSameMonth(parseISO(e.start), currentDate));
  }, [events, currentDate]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onAddEvent({
      title: newTitle,
      start: new Date(newStart).toISOString(),
      end: new Date(newEnd).toISOString(),
      location: newLocation,
      color: newColor,
      notes: '',
      reminder: 15,
      recurrence: 'none'
    });
    setNewTitle('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold font-display">{format(currentDate, 'MMMM yyyy')}</h2>
          <div className="flex bg-slate-900 border border-white/5 rounded-lg p-1">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 hover:bg-white/5 rounded"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-semibold hover:bg-white/5 rounded">Today</button>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 hover:bg-white/5 rounded"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-white/10 rounded-xl p-1">
          {(['month', 'week', 'day'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${view === v ? 'bg-accent-blue text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Views */}
      <div className="glass-card !p-0 overflow-hidden min-h-[500px]">
        {view === 'month' && (
          <div className="grid grid-cols-7 h-full">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="p-4 text-center text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-white/5">
                {d}
              </div>
            ))}
            {days.map((day, i) => {
              const dayEvents = events.filter(e => isSameDay(parseISO(e.start), day));
              const dayForecast = weather?.daily.find(d => d.date === format(day, 'eee'));
              
              return (
                <div 
                  key={i} 
                  className={`min-h-[100px] border-b border-r border-white/5 p-2 transition-all hover:bg-white/5 cursor-pointer ${!isSameMonth(day, monthStart) ? 'opacity-20' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-sm font-semibold ${isSameDay(day, new Date()) ? 'w-7 h-7 bg-accent-blue text-white rounded-full flex items-center justify-center' : ''}`}>
                      {format(day, 'd')}
                    </span>
                    {dayForecast && isSameMonth(day, monthStart) && (
                      <div className="flex flex-col items-end opacity-40">
                         <span className="text-[9px] font-bold">{Math.round(dayForecast.high)}°</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map(e => (
                      <div key={e.id} className="text-[10px] truncate px-1.5 py-0.5 rounded border border-white/5" style={{ backgroundColor: `${e.color}33`, color: e.color }}>
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && <p className="text-[9px] text-slate-500 pl-1">+{dayEvents.length - 3} more</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === 'day' && (
          <div className="flex flex-col h-[600px] overflow-y-auto hide-scrollbar">
            {hours.map((hour, i) => (
              <div key={i} className="flex border-b border-white/5 min-h-[80px] group">
                <div className="w-20 p-4 text-xs font-mono text-slate-500 border-r border-white/5">
                  {format(hour, 'HH:mm')}
                </div>
                <div className="flex-1 p-2 relative">
                   {events.filter(e => {
                     const start = parseISO(e.start);
                     return isSameDay(start, currentDate) && start.getHours() === hour.getHours();
                   }).map(e => (
                     <div 
                        key={e.id} 
                        className="glass-card !p-3 mb-2 flex items-center justify-between border-l-4"
                        style={{ borderLeftColor: e.color }}
                      >
                       <div className="flex flex-col gap-1">
                         <h4 className="font-bold text-sm tracking-tight">{e.title}</h4>
                         <div className="flex items-center gap-3 text-xs text-slate-400">
                           <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(parseISO(e.start), 'HH:mm')} - {format(parseISO(e.end), 'HH:mm')}</span>
                           {e.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {e.location}</span>}
                         </div>
                       </div>
                       <button onClick={() => onDeleteEvent(e.id)} className="text-slate-600 hover:text-red-400 p-1"><X className="w-4 h-4" /></button>
                     </div>
                   ))}
                   <button 
                    onClick={() => {
                        setNewStart(format(hour, "yyyy-MM-dd'T'HH:mm"));
                        setIsModalOpen(true);
                    }}
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center bg-accent-blue/5 text-accent-blue text-sm font-bold"
                   >
                     <Plus className="w-4 h-4 mr-1" /> Add event at {format(hour, 'HH:mm')}
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'week' && (
          <div className="p-8 text-center text-slate-500">
            <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Weekly view is optimized for desktop. Please check Day or Month view.</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-[80px] right-10 w-16 h-16 bg-gradient-to-br from-accent-blue to-accent-violet text-white rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md glass-card !p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Add Event</h3>
                <button onClick={() => setIsModalOpen(false)}><X className="w-6 h-6 text-slate-400" /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Event Title</label>
                  <input autoFocus required type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="What's happening?" className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 focus:border-accent-blue outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Start</label>
                    <input type="datetime-local" value={newStart} onChange={e => setNewStart(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">End</label>
                    <input type="datetime-local" value={newEnd} onChange={e => setNewEnd(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm" />
                  </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input type="text" value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="Search location..." className="w-full bg-slate-950 border border-white/10 rounded-xl pl-11 pr-4 py-3 focus:border-accent-blue outline-none" />
                    </div>
                </div>
                <div className="flex justify-between items-center pt-4">
                   <div className="flex gap-2">
                     {['#4A90D9', '#7C4DFF', '#10B981', '#F59E0B', '#EF4444'].map(c => (
                       <button key={c} type="button" onClick={() => setNewColor(c)} className={`w-6 h-6 rounded-full border-2 ${newColor === c ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                     ))}
                   </div>
                   <button type="submit" className="btn-primary">Create Event</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
