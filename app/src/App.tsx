import React, { useState, useEffect, useCallback } from 'react';
    import { Search, MapPin, Wind, Droplets, Sun, Cloud, CloudRain, CloudSnow } from 'lucide-react';
    import { cn } from './lib/utils';

    const API_KEY = import.meta.env.VITE_OPENWEATHERMAP_API_KEY; // IMPORTANT: Replace with your actual API key

    interface WeatherData {
      current: {
        temp: number;
        feels_like: number;
        weather: {
          main: string;
          description: string;
          icon: string;
        }[];
        humidity: number;
        wind_speed: number;
      };
      hourly: {
        dt: number;
        temp: number;
        weather: {
          icon: string;
        }[];
      }[];
      daily: {
        dt: number;
        temp: {
          min: number;
          max: number;
        };
        weather: {
          main: string;
          icon: string;
        }[];
      }[];
    }

    interface GeoData {
      name: string;
      country: string;
      lat: number;
      lon: number;
    }

    const WeatherIcon = ({ icon, className }: { icon: string; className?: string }) => {
      const iconMap: { [key: string]: React.ElementType } = {
        '01d': Sun, '01n': Sun,
        '02d': Cloud, '02n': Cloud,
        '03d': Cloud, '03n': Cloud,
        '04d': Cloud, '04n': Cloud,
        '09d': CloudRain, '09n': CloudRain,
        '10d': CloudRain, '10n': CloudRain,
        '13d': CloudSnow, '13n': CloudSnow,
      };
      const IconComponent = iconMap[icon] || Sun;
      return <IconComponent className={cn("w-8 h-8", className)} />;
    };

    export default function App() {
      const [location, setLocation] = useState('London');
      const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
      const [geoData, setGeoData] = useState<GeoData | null>(null);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState<string | null>(null);
      const [searchInput, setSearchInput] = useState('London');

      const fetchWeatherData = useCallback(async (lat: number, lon: number) => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,alerts&appid=${API_KEY}&units=metric`);
          if (!response.ok) {
            throw new Error('Weather data not found.');
          }
          const data: WeatherData = await response.json();
          setWeatherData(data);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
          setLoading(false);
        }
      }, []);

      const handleSearch = useCallback(async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!searchInput) return;
        setLoading(true);
        setError(null);
        try {
          const geoResponse = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${searchInput}&limit=1&appid=${API_KEY}`);
          if (!geoResponse.ok) throw new Error('Location not found.');
          const geoResult: GeoData[] = await geoResponse.json();
          if (geoResult.length === 0) throw new Error('Location not found.');
          const { lat, lon, name, country } = geoResult[0];
          setGeoData({ lat, lon, name, country });
          setLocation(name);
          await fetchWeatherData(lat, lon);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred.');
          setLoading(false);
        }
      }, [searchInput, fetchWeatherData]);

      const getLocation = useCallback(() => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            setLoading(true);
            setError(null);
            try {
              const geoResponse = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`);
              if (!geoResponse.ok) throw new Error('Could not determine location.');
              const geoResult: GeoData[] = await geoResponse.json();
              if (geoResult.length === 0) throw new Error('Could not determine location.');
              const { name, country } = geoResult[0];
              setGeoData({ lat: latitude, lon: longitude, name, country });
              setLocation(name);
              setSearchInput(name);
              await fetchWeatherData(latitude, longitude);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'An unknown error occurred.');
              setLoading(false);
            }
          }, (error) => {
            console.error("Geolocation error:", error);
            setError("Geolocation permission denied. Please search for a location.");
            handleSearch(); // Fallback to default location
          });
        } else {
          setError("Geolocation is not supported by this browser.");
          handleSearch(); // Fallback to default location
        }
      }, [handleSearch, fetchWeatherData]);

      useEffect(() => {
        getLocation();
      }, [getLocation]);

      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-4 sm:p-6 lg:p-8 flex items-center justify-center">
          <div className="w-full max-w-4xl bg-black bg-opacity-40 backdrop-blur-lg rounded-2xl shadow-2xl p-6 space-y-6">
            <header className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-2">
                <MapPin className="text-purple-400" />
                <h1 className="text-2xl font-bold">{geoData ? `${geoData.name}, ${geoData.country}` : location}</h1>
              </div>
              <form onSubmit={handleSearch} className="flex items-center w-full sm:w-auto bg-white/10 rounded-full px-4 py-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search for a city..."
                  className="bg-transparent focus:outline-none w-full"
                />
                <button type="submit" className="text-purple-400 hover:text-purple-300 transition-colors">
                  <Search />
                </button>
              </form>
            </header>

            {loading && <div className="text-center p-10">Loading weather data...</div>}
            {error && <div className="text-center p-10 text-red-400">{error}</div>}

            {weatherData && !loading && !error && (
              <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Current Weather */}
                <div className="md:col-span-1 bg-white/10 p-6 rounded-xl flex flex-col items-center justify-center text-center space-y-4">
                  <p className="text-lg">{weatherData.current.weather[0].main}</p>
                  <div className="flex items-start">
                    <span className="text-7xl font-bold">{Math.round(weatherData.current.temp)}</span>
                    <span className="text-2xl font-medium mt-2">°C</span>
                  </div>
                  <WeatherIcon icon={weatherData.current.weather[0].icon} className="w-24 h-24 text-yellow-300" />
                  <p>Feels like {Math.round(weatherData.current.feels_like)}°C</p>
                  <div className="flex justify-around w-full pt-4">
                    <div className="flex items-center space-x-2">
                      <Wind className="text-blue-300" />
                      <span>{weatherData.current.wind_speed} m/s</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Droplets className="text-green-300" />
                      <span>{weatherData.current.humidity}%</span>
                    </div>
                  </div>
                </div>

                {/* Forecasts */}
                <div className="md:col-span-2 space-y-6">
                  {/* Hourly Forecast */}
                  <div className="bg-white/10 p-6 rounded-xl">
                    <h2 className="text-xl font-semibold mb-4">Hourly Forecast</h2>
                    <div className="flex space-x-4 overflow-x-auto pb-2">
                      {weatherData.hourly.slice(0, 24).map((hour, index) => (
                        <div key={index} className="flex flex-col items-center space-y-2 flex-shrink-0 w-20 text-center">
                          <p>{new Date(hour.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          <WeatherIcon icon={hour.weather[0].icon} className="w-10 h-10" />
                          <p className="font-semibold">{Math.round(hour.temp)}°C</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 5-Day Forecast */}
                  <div className="bg-white/10 p-6 rounded-xl">
                    <h2 className="text-xl font-semibold mb-4">5-Day Forecast</h2>
                    <div className="space-y-3">
                      {weatherData.daily.slice(1, 6).map((day, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <p className="w-1/4">{new Date(day.dt * 1000).toLocaleDateString([], { weekday: 'long' })}</p>
                          <WeatherIcon icon={day.weather[0].icon} className="w-8 h-8" />
                          <p className="w-1/4 text-right">{day.weather[0].main}</p>
                          <p className="w-1/4 text-right font-semibold">
                            {Math.round(day.temp.max)}° / {Math.round(day.temp.min)}°
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </main>
            )}
          </div>
        </div>
      );
    }