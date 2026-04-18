/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TabType = 'weather' | 'clock' | 'calendar' | 'maps' | 'settings';

export interface WeatherData {
  temp: number;
  condition: string;
  conditionCode: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDir: number;
  uvIndex: number;
  aqi: number;
  sunrise: string;
  sunset: string;
  cityName: string;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
}

export interface HourlyForecast {
  time: string;
  temp: number;
  conditionCode: number;
  precipProb: number;
}

export interface DailyForecast {
  date: string;
  high: number;
  low: number;
  conditionCode: number;
  precipProb: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO string
  end: string;   // ISO string
  location: string;
  locationCoords?: [number, number];
  color: string;
  notes: string;
  reminder: number; // minutes before
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
}

export interface Settings {
  units: 'metric' | 'imperial';
  timeFormat: '12h' | '24h';
  accentColor: string;
  notificationsEnabled: boolean;
}

export interface ChronoState {
  currentCity: string;
  coords: [number, number];
  weather: WeatherData | null;
  events: CalendarEvent[];
  preferences: Settings;
  onboardingComplete: boolean;
}
