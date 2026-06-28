import { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from './AuthContext';
import api from '../lib/api';
import { reverseGeocode, getIPLocation } from '../lib/location';

const TrackingContext = createContext({
  currentLocation: null,
  isTracking: false,
  startTracking: () => {},
  stopTracking: () => {},
  syncTrackingState: () => {},
});

export const useTracking = () => useContext(TrackingContext);

const PING_INTERVAL_MS = 30_000; // ping every 30 seconds

export function TrackingProvider({ children }) {
  const { user } = useAuth();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  // Refs so callbacks always see latest values without re-creating them
  const watchIdRef = useRef(null);
  const pingTimerRef = useRef(null);
  const lastLocRef = useRef(null);
  const activeRef = useRef(false);  // tracks whether we are currently running

  // ── Send a location ping to the backend ─────────────────────────────────────
  const sendPing = useCallback(async (loc) => {
    if (!loc) return;
    try {
      await api.post('/tracking/ping', {
        latitude: loc.latitude,
        longitude: loc.longitude,
        address: loc.address,
        accuracy: loc.accuracy,
      });
    } catch (_) {}
  }, []);

  // ── Stop all tracking and remove the server record ───────────────────────────
  const stopTracking = useCallback(async () => {
    if (!activeRef.current) return;
    activeRef.current = false;
    setIsTracking(false);

    // Clear GPS watch
    if (watchIdRef.current !== null && watchIdRef.current !== undefined) {
      try { navigator.geolocation?.clearWatch(watchIdRef.current); } catch (_) {}
      watchIdRef.current = null;
    }

    // Clear ping interval
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }

    // Tell server this user is offline
    try { await api.delete('/tracking/ping'); } catch (_) {}
  }, []);

  // ── Start GPS watch + periodic ping ──────────────────────────────────────────
  const startTracking = useCallback(() => {
    if (activeRef.current) return;  // already running — don't double-start
    activeRef.current = true;
    setIsTracking(true);

    const handleGPSPosition = async (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      try {
        const address = await reverseGeocode(latitude, longitude);
        const loc = { latitude, longitude, address, accuracy, timestamp: new Date().toISOString() };
        lastLocRef.current = loc;
        setCurrentLocation(loc);
      } catch (_) {
        const loc = { latitude, longitude, address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, accuracy };
        lastLocRef.current = loc;
        setCurrentLocation(loc);
      }
    };

    const handleGPSError = async (err) => {
      console.warn('GPS unavailable, falling back to IP geolocation:', err?.message);
      try {
        const ipLoc = await getIPLocation();
        const loc = { ...ipLoc, timestamp: new Date().toISOString() };
        lastLocRef.current = loc;
        setCurrentLocation(loc);
      } catch (_) {}
    };

    if (navigator.geolocation) {
      // Initial immediate position fetch
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await handleGPSPosition(pos);
          if (lastLocRef.current) await sendPing(lastLocRef.current);
        },
        async (err) => {
          await handleGPSError(err);
          if (lastLocRef.current) await sendPing(lastLocRef.current);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      // Continuous watch — updates whenever device moves
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => handleGPSPosition(pos),
        (err) => handleGPSError(err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } else {
      // No GPS API at all — IP-only
      getIPLocation().then(async (ipLoc) => {
        const loc = { ...ipLoc, timestamp: new Date().toISOString() };
        lastLocRef.current = loc;
        setCurrentLocation(loc);
        await sendPing(loc);
      }).catch(() => {});
    }

    // Periodic ping every 30 seconds using latest known location
    pingTimerRef.current = setInterval(async () => {
      if (lastLocRef.current && activeRef.current) {
        lastLocRef.current = { ...lastLocRef.current, timestamp: new Date().toISOString() };
        await sendPing(lastLocRef.current);
      }
    }, PING_INTERVAL_MS);
  }, [sendPing]);

  // ── Check attendance status and sync tracking state ──────────────────────────
  const syncTrackingState = useCallback(async () => {
    if (!user || user.role === 'admin') {
      if (activeRef.current) await stopTracking();
      return;
    }

    try {
      const res = await api.get('/attendance/today');
      const att = res.data.attendance;
      const shouldTrack = !!(att?.check_in && !att?.check_out);

      if (shouldTrack && !activeRef.current) {
        startTracking();
      } else if (!shouldTrack && activeRef.current) {
        await stopTracking();
      }
    } catch (_) {}
  }, [user, startTracking, stopTracking]);

  // ── On login / user change — check if we should start tracking ───────────────
  useEffect(() => {
    if (!user) {
      stopTracking();
      return;
    }

    if (user.role === 'admin') return;

    syncTrackingState();

    // Re-check every 2 minutes in case state drifts
    const pollTimer = setInterval(syncTrackingState, 2 * 60 * 1000);
    return () => clearInterval(pollTimer);
  }, [user?.id]); // only re-run when user changes, not on every syncTrackingState recreation

  // ── Cleanup on app unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      // Don't call stopTracking on unmount — this is app-level, it should persist the session
      if (watchIdRef.current !== null && watchIdRef.current !== undefined) {
        try { navigator.geolocation?.clearWatch(watchIdRef.current); } catch (_) {}
      }
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
    };
  }, []);

  return (
    <TrackingContext.Provider value={{ currentLocation, isTracking, startTracking, stopTracking, syncTrackingState }}>
      {children}
    </TrackingContext.Provider>
  );
}
