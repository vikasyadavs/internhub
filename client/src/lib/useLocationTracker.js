import { useEffect, useRef, useCallback } from 'react';
import { reverseGeocode, watchLocation, clearLocationWatch } from '../lib/location';
import api from './api';

const PING_INTERVAL_MS = 30_000; // ping every 30 seconds

/**
 * useLocationTracker
 * Starts GPS watchPosition when the user is checked-in and sends pings to backend.
 * Stops automatically on checkout or when the component unmounts.
 *
 * @param {boolean} active - whether tracking should be running (true = checked in)
 * @param {function} onLocationUpdate - optional callback(locationObj) on each update
 */
export function useLocationTracker(active, onLocationUpdate) {
  const watchIdRef = useRef(null);
  const pingTimerRef = useRef(null);
  const lastLocationRef = useRef(null);

  const sendPing = useCallback(async (loc) => {
    try {
      await api.post('/tracking/ping', {
        latitude: loc.latitude,
        longitude: loc.longitude,
        address: loc.address,
        accuracy: loc.accuracy,
      });
    } catch (e) {
      // silent — don't interrupt UX for background ping failures
    }
  }, []);

  const stopTracking = useCallback(async () => {
    clearLocationWatch(watchIdRef.current);
    watchIdRef.current = null;
    clearInterval(pingTimerRef.current);
    pingTimerRef.current = null;
    // Notify server the user is offline
    try { await api.delete('/tracking/ping'); } catch (_) {}
  }, []);

  const startTracking = useCallback(() => {
    watchIdRef.current = watchLocation(
      async (loc) => {
        lastLocationRef.current = loc;
        onLocationUpdate?.(loc);
      },
      (err) => console.warn('Location watch error:', err)
    );

    // Periodic ping every 30s using latest known location
    pingTimerRef.current = setInterval(async () => {
      if (lastLocationRef.current) {
        await sendPing(lastLocationRef.current);
      }
    }, PING_INTERVAL_MS);

    // First ping immediately
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const loc = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            address: await reverseGeocode(pos.coords.latitude, pos.coords.longitude),
          };
          lastLocationRef.current = loc;
          onLocationUpdate?.(loc);
          await sendPing(loc);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [sendPing, onLocationUpdate]);

  useEffect(() => {
    if (active) {
      startTracking();
    } else {
      stopTracking();
    }
    return () => { stopTracking(); };
  }, [active, startTracking, stopTracking]);
}
