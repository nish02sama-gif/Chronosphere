/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl, FullscreenControl } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { Map as MapIcon, Layers, Sun, Navigation, AlertCircle, Calendar, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarEvent } from './types';

// Fallback to user provided key if env is missing
const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_KEY || 'c2d1be2ef5e440ba892c4b582814f255';

interface MapsModuleProps {
  center: [number, number];
  events: CalendarEvent[];
}

export default function MapsModule({ center, events }: MapsModuleProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showSatellite, setShowSatellite] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [viewState, setViewState] = useState({
    latitude: center[0],
    longitude: center[1],
    zoom: 13
  });

  // Emergency trigger for loading state if onLoad fails to fire
  useEffect(() => {
    const timer = setTimeout(() => setIsMapLoaded(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  // Sync view state when center changes from parent (e.g. searching in weather tab)
  useEffect(() => {
    setViewState(prev => ({
      ...prev,
      latitude: center[0],
      longitude: center[1]
    }));
  }, [center]);

  const styleUrl = useMemo(() => {
    // Constructing an internal style object to bypass network JSON issues
    const baseTiles = `https://maps.geoapify.com/v1/tile/carto/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_KEY}`;
    
    return {
      version: 8,
      sources: {
        'geoapify-tiles': {
          type: 'raster',
          tiles: [baseTiles],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap &copy; Geoapify'
        }
      },
      layers: [
        {
          id: 'geoapify-layer',
          type: 'raster',
          source: 'geoapify-tiles',
          minzoom: 0,
          maxzoom: 20
        }
      ]
    };
  }, []);

  const onRecenter = () => {
    setViewState({
      latitude: center[0],
      longitude: center[1],
      zoom: 13
    });
  };

  if (!GEOAPIFY_KEY) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
          <AlertCircle className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Geoapify Key Missing</h2>
          <p className="text-slate-400 max-w-md">
            Please add your Geoapify API key to the <code className="bg-white/5 px-2 py-1 rounded">VITE_GEOAPIFY_KEY</code> environment variable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-accent-blue/20 flex items-center justify-center text-accent-blue shadow-lg shadow-accent-blue/10">
            <MapIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-3xl font-bold font-display tracking-tight text-white uppercase italic">
              Chronosphere Maps
            </h2>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Global Navigation System</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setShowSatellite(!showSatellite)}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all border ${
              showSatellite 
                ? 'bg-accent-blue border-accent-blue text-white shadow-xl shadow-accent-blue/20' 
                : 'bg-slate-900 border-white/10 text-slate-400 hover:border-accent-blue/50 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            {showSatellite ? 'Satellite View' : 'Topographic View'}
          </button>
        </div>
      </div>

      <div className="relative rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl h-[500px] sm:h-[600px] bg-slate-900/50">
        <Map
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          onLoad={() => setIsMapLoaded(true)}
          onError={(e) => {
            console.error('Map Error:', e);
            setIsMapLoaded(true);
          }}
          mapLib={maplibregl}
          mapStyle={styleUrl as any}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Custom Loading State Overlay */}
          <AnimatePresence>
            {!isMapLoaded && (
              <motion.div 
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center space-y-4"
              >
                <div className="relative">
                   <Loader2 className="w-12 h-12 text-accent-blue animate-spin" />
                   <div className="absolute inset-0 blur-xl bg-accent-blue/20" />
                </div>
                <p className="text-xs font-mono text-slate-500 uppercase tracking-[0.3em] font-bold">Synchronizing Tiles...</p>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Navigation Controls */}
          <NavigationControl position="top-left" />
          <FullscreenControl position="top-left" />

          {/* User Location Marker */}
          <Marker latitude={center[0]} longitude={center[1]}>
             <div className="relative">
                <div className="w-6 h-6 bg-accent-blue rounded-full border-4 border-white shadow-lg animate-pulse" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-accent-blue" />
             </div>
          </Marker>

          {/* Event Markers */}
          {events.filter(e => e.locationCoords).map(event => (
            <Marker 
              key={event.id} 
              latitude={event.locationCoords![0]} 
              longitude={event.locationCoords![1]}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedEvent(event);
              }}
            >
              <div className="cursor-pointer group transition-transform hover:scale-125">
                 <div 
                   className="w-8 h-8 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white"
                   style={{ backgroundColor: event.color }}
                 >
                    <Calendar className="w-4 h-4" />
                 </div>
              </div>
            </Marker>
          ))}

          {selectedEvent && (
            <Popup
              latitude={selectedEvent.locationCoords![0]}
              longitude={selectedEvent.locationCoords![1]}
              onClose={() => setSelectedEvent(null)}
              closeButton={true}
              closeOnClick={false}
              className="chrono-popup"
              maxWidth="240px"
              offset={15}
            >
              <div className="p-3 bg-slate-950 text-white rounded-xl">
                 <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedEvent.color }} />
                    <h4 className="font-bold text-sm tracking-tight">{selectedEvent.title}</h4>
                 </div>
                 <p className="text-[10px] text-slate-400 mb-3 border-l-2 border-white/10 pl-2">{selectedEvent.location}</p>
                 <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-slate-500">
                   <span>{new Date(selectedEvent.start).toDateString()}</span>
                   <span>{new Date(selectedEvent.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                 </div>
              </div>
            </Popup>
          )}

          {/* Map Overlay HUD */}
          <div className="absolute top-6 right-6 z-10 hidden sm:flex flex-col gap-3">
            <div className="glass-card !bg-slate-950/80 !backdrop-blur-xl border-white/10 !p-4 flex items-center gap-4 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-accent-violet flex items-center justify-center text-white shadow-lg shadow-accent-violet/20">
                <Sun className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Engine Status</p>
                <p className="text-sm font-black text-white italic">OPERATIONAL</p>
              </div>
            </div>
          </div>
        </Map>

        {/* Floating Action Button for Location Recenter */}
        <div className="absolute bottom-6 right-6 z-10">
          <button 
            onClick={onRecenter}
            className="w-14 h-14 bg-accent-blue text-white rounded-2xl flex items-center justify-center shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/20 hover:scale-110 active:scale-95 transition-all group"
          >
            <Navigation className="w-6 h-6 fill-current group-hover:rotate-12 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
