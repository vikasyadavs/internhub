// ─── HeiGIT / OpenRouteService API Configuration ─────────────────────────────
const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImYzYjU3ZjhiZWMzNjQyNTZhZDZmMjMxZmQyZGUxNjQ0IiwiaCI6Im11cm11cjY0In0=';

// Reverse geocode using HeiGIT / OpenRouteService Geocoding API
export const reverseGeocode = async (latitude, longitude) => {
  try {
    const res = await fetch(
      `https://api.openrouteservice.org/geocode/reverse?api_key=${ORS_API_KEY}&point.lon=${longitude}&point.lat=${latitude}&size=1`,
      {
        headers: { Accept: 'application/json, application/geo+json' },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) throw new Error('ORS API error ' + res.status);
    const data = await res.json();
    const feature = data?.features?.[0];
    if (feature?.properties?.label) {
      return feature.properties.label;
    }
  } catch (e) {
    console.warn('ORS reverse geocode failed, using Nominatim fallback:', e.message);
  }

  // Fallback: OpenStreetMap Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16`,
      {
        headers: { 'Accept-Language': 'en' },
        signal: AbortSignal.timeout(4000),
      }
    );
    const data = await res.json();
    if (data?.display_name) return data.display_name;
  } catch (e) {
    console.warn('Nominatim fallback also failed:', e.message);
  }

  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
};

// Automatic IP Geolocation Fallback
export const getIPLocation = async () => {
  // Option 1: Free IP API (high rate limit, HTTPS, reliable)
  try {
    const res = await fetch('https://freeipapi.com/api/json');
    const data = await res.json();
    if (data && data.latitude && data.longitude) {
      return {
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        accuracy: 3000,
        address: `${data.cityName || 'Unknown City'}, ${data.regionName || ''}, ${data.countryName || ''} (IP Geolocation)`
      };
    }
  } catch (e) {
    console.warn('freeipapi.com failed, trying ipapi.co...', e);
  }

  // Option 2: IPAPI.co
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    if (data && data.latitude && data.longitude) {
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: 5000,
        address: `${data.city || 'Unknown City'}, ${data.region || ''}, ${data.country_name || ''} (IP Geolocation)`
      };
    }
  } catch (e) {
    console.warn('ipapi.co failed, trying ipinfo.io...', e);
  }

  // Option 3: IPinfo.io
  try {
    const res = await fetch('https://ipinfo.io/json');
    const data = await res.json();
    if (data && data.loc) {
      const [latitude, longitude] = data.loc.split(',').map(Number);
      return {
        latitude,
        longitude,
        accuracy: 10000,
        address: `${data.city || 'Unknown City'}, ${data.region || ''}, ${data.country || ''} (IP Geolocation)`
      };
    }
  } catch (e) {
    console.warn('ipinfo.io also failed:', e);
  }

  throw new Error('All location fetching systems failed. Please enable location permissions.');
};

// Get current position using browser GPS + ORS geocoding, with automatic IP Geolocation fallback
export const getBrowserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      // Direct IP fallback if Geolocation not supported by browser
      getIPLocation().then(resolve).catch(reject);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const address = await reverseGeocode(latitude, longitude);
        resolve({ latitude, longitude, address, accuracy });
      },
      async (error) => {
        console.warn('Browser Geolocation failed, attempting automatic IP Geolocation fallback:', error.message);
        try {
          const ipLoc = await getIPLocation();
          resolve(ipLoc);
        } catch (ipErr) {
          reject(new Error('Location access failed. IP fallback also failed: ' + ipErr.message));
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });
};

// Watch position — calls callback on each update, returns watchId for cleanup
export const watchLocation = (onUpdate, onError) => {
  if (!navigator.geolocation) {
    // If not supported, do a single IP lookup and return a dummy watch ID
    getIPLocation()
      .then((loc) => onUpdate({ ...loc, timestamp: new Date().toISOString() }))
      .catch((err) => onError?.(err));
    return 99999;
  }

  const watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      const address = await reverseGeocode(latitude, longitude);
      onUpdate({ latitude, longitude, address, accuracy, timestamp: new Date().toISOString() });
    },
    async (error) => {
      console.warn('watchPosition failed, falling back to IP lookup for this tick:', error.message);
      try {
        const ipLoc = await getIPLocation();
        onUpdate({ ...ipLoc, timestamp: new Date().toISOString() });
      } catch (ipErr) {
        onError?.(error);
      }
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
  );

  return watchId;
};

export const clearLocationWatch = (watchId) => {
  if (watchId !== null && watchId !== undefined) {
    if (watchId === 99999) return;
    navigator.geolocation.clearWatch(watchId);
  }
};
