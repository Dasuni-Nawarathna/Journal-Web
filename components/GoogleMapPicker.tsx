'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X, Check, Search, Loader2 } from 'lucide-react';

interface LatLng {
  lat: number;
  lng: number;
}

interface GoogleMapPickerProps {
  /** Called when user confirms a pin. Passes lat/lng + reverse-geocoded place name. */
  onLocationPicked: (lat: number, lng: number, placeName: string) => void;
  /** Initial position to show a pin (optional) */
  initialLat?: number;
  initialLng?: number;
  initialPlaceName?: string;
  /** Google Maps API key from env */
  apiKey: string;
}

declare global {
  interface Window {
    google: any;
    initGoogleMap?: () => void;
  }
}

export default function GoogleMapPicker({
  onLocationPicked,
  initialLat,
  initialLng,
  initialPlaceName,
  apiKey,
}: GoogleMapPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadError, setIsLoadError] = useState(false);
  const [pickedLatLng, setPickedLatLng] = useState<LatLng | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const [pickedPlaceName, setPickedPlaceName] = useState(initialPlaceName || '');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Load Google Maps JS API script
  const loadGoogleMapsScript = useCallback(() => {
    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsLoaded(true));
      return;
    }

    window.initGoogleMap = () => setIsLoaded(true);

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMap&libraries=geocoding,places`;
    script.async = true;
    script.defer = true;
    script.onerror = () => setIsLoadError(true);
    document.head.appendChild(script);
  }, [apiKey]);

  // Initialize the map once script is loaded and panel is open
  useEffect(() => {
    if (!isOpen || !isLoaded || !mapRef.current || googleMapRef.current) return;

    const center = pickedLatLng || { lat: 20, lng: 0 };

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: pickedLatLng ? 13 : 3,
      mapTypeId: 'roadmap',
      disableDefaultUI: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#FAF7F2' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#2D2A26' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#E2D9F3' }] },
        { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#D1E2D3' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
        { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#F5E1E2' }] },
        { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#E2D9F3' }] },
      ],
    });

    googleMapRef.current = map;

    // Place initial marker if we have a position
    if (pickedLatLng) {
      placeMarker(map, pickedLatLng);
    }

    // Click on map to place pin
    map.addListener('click', (e: any) => {
      const latLng: LatLng = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      placeMarker(map, latLng);
      setPickedLatLng(latLng);
      reverseGeocode(latLng);
    });
  }, [isOpen, isLoaded, pickedLatLng]);

  const placeMarker = (map: any, position: LatLng) => {
    if (markerRef.current) markerRef.current.setMap(null);

    const marker = new window.google.maps.Marker({
      position,
      map,
      title: 'Memory Location',
      animation: window.google.maps.Animation.DROP,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#F5E1E2',
        fillOpacity: 1,
        strokeColor: '#2D2A26',
        strokeWeight: 2,
      },
    });

    markerRef.current = marker;
    map.panTo(position);
  };

  // Convert lat/lng to a readable place name
  const reverseGeocode = async (latLng: LatLng) => {
    if (!window.google?.maps) return;
    setIsGeocoding(true);

    try {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: latLng }, (results: any[], status: string) => {
        if (status === 'OK' && results[0]) {
          // Try to get a friendly neighborhood or city name
          const locality = results.find((r: any) =>
            r.types.includes('locality') || r.types.includes('neighborhood')
          );
          const name = locality?.formatted_address || results[0].formatted_address;
          setPickedPlaceName(name);
        } else {
          setPickedPlaceName(`${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}`);
        }
        setIsGeocoding(false);
      });
    } catch {
      setIsGeocoding(false);
    }
  };

  // Search for a place by name
  const handleSearch = async () => {
    if (!searchQuery.trim() || !window.google?.maps) return;
    setIsSearching(true);

    try {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: searchQuery }, (results: any[], status: string) => {
        if (status === 'OK' && results[0]) {
          const loc = results[0].geometry.location;
          const latLng: LatLng = { lat: loc.lat(), lng: loc.lng() };
          setPickedLatLng(latLng);
          setPickedPlaceName(results[0].formatted_address);
          if (googleMapRef.current) {
            placeMarker(googleMapRef.current, latLng);
            googleMapRef.current.setZoom(14);
          }
        }
        setIsSearching(false);
      });
    } catch {
      setIsSearching(false);
    }
  };

  const handleConfirm = () => {
    if (!pickedLatLng) return;
    onLocationPicked(pickedLatLng.lat, pickedLatLng.lng, pickedPlaceName);
    setIsOpen(false);
  };

  const handleOpen = () => {
    setIsOpen(true);
    // Reset map ref so it re-initializes fresh
    googleMapRef.current = null;
    if (!window.google?.maps) {
      loadGoogleMapsScript();
    } else {
      setIsLoaded(true);
    }
  };

  const hasApiKey = apiKey && apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY' && apiKey.length > 10;

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={hasApiKey ? handleOpen : undefined}
        className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
          pickedLatLng
            ? 'bg-lavender/40 border-lavender text-espresso shadow-sm'
            : hasApiKey
              ? 'bg-white border border-blush/35 text-espresso/80 hover:bg-canvas/80 hover:text-espresso shadow-sm'
              : 'bg-canvas border border-blush/25 text-espresso/60 font-semibold cursor-not-allowed'
        }`}
        title={hasApiKey ? 'Pin a location on Google Maps' : 'Add NEXT_PUBLIC_GOOGLE_MAPS_KEY to .env.local'}
      >
        <MapPin className="w-3 h-3 text-blush" />
        <span>{pickedLatLng ? (pickedPlaceName ? pickedPlaceName.split(',')[0] : 'Location Set') : 'Pin Location'}</span>
      </button>

      {!hasApiKey && (
        <p className="text-[9px] text-espresso/70 font-semibold mt-0.5">Add Google Maps API key to .env.local</p>
      )}

      {/* Full-screen map modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-espresso/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white/95 backdrop-blur-md rounded-3xl border border-blush/25 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
              style={{ height: '580px' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-canvas">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-semibold text-espresso flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blush animate-bounce" />
                    Pin Your Memory Location
                  </h2>
                  <p className="text-[10px] text-espresso/75 font-semibold">
                    Click anywhere on the map or search to place your pin.
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-canvas text-espresso/60 hover:text-espresso transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="px-5 py-3 border-b border-canvas flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-espresso/70" />
                  <input
                    type="text"
                    placeholder="Search for a place..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-9 pr-3 py-2 bg-canvas/60 border border-blush/20 rounded-xl text-xs text-espresso focus:outline-none focus:border-lavender placeholder:text-espresso/55 font-medium"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="px-3 py-2 bg-espresso text-canvas text-xs font-semibold rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                  <span>Search</span>
                </button>
              </div>

              {/* Map Container */}
              <div className="flex-1 relative">
                {isLoadError ? (
                  <div className="absolute inset-0 flex items-center justify-center text-center p-6 space-y-2">
                    <div>
                      <MapPin className="w-8 h-8 text-espresso/40 mx-auto mb-2" />
                      <p className="text-xs font-bold text-espresso/90">Google Maps failed to load.</p>
                      <p className="text-[10px] text-espresso/75 font-semibold mt-1">Check your API key and browser console.</p>
                    </div>
                  </div>
                ) : !isLoaded ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-6 h-6 text-lavender animate-spin" />
                      <p className="text-[10px] text-espresso/80 font-semibold">Loading map...</p>
                    </div>
                  </div>
                ) : null}
                <div ref={mapRef} className="w-full h-full rounded-b-none" style={{ minHeight: '350px' }} />
              </div>

              {/* Footer: picked location + confirm */}
              <div className="px-5 py-4 border-t border-canvas flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {pickedLatLng ? (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-blush flex-shrink-0" />
                        <span className="text-xs font-bold text-espresso truncate">
                          {isGeocoding ? 'Fetching location name...' : pickedPlaceName || 'Location selected'}
                        </span>
                      </div>
                      <p className="text-[9px] text-espresso/70 font-mono font-semibold pl-4">
                        {pickedLatLng.lat.toFixed(5)}, {pickedLatLng.lng.toFixed(5)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-espresso/75 font-semibold italic">Click the map to drop a pin...</p>
                  )}
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {pickedLatLng && (
                    <button
                      onClick={() => {
                        setPickedLatLng(null);
                        setPickedPlaceName('');
                        if (markerRef.current) markerRef.current.setMap(null);
                      }}
                      className="px-3 py-1.5 bg-rose-50 text-rose-500 text-xs font-medium rounded-xl hover:bg-rose-100 active:scale-95 transition-all cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={handleConfirm}
                    disabled={!pickedLatLng || isGeocoding}
                    className="px-4 py-1.5 bg-espresso text-canvas text-xs font-semibold rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Location</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
