import { useEffect, useRef, useState } from 'react';

// Leaflet CSS injected dynamically
let leafletCssInjected = false;
function injectLeafletCSS() {
  if (leafletCssInjected) return;
  leafletCssInjected = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
}

const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImYzYjU3ZjhiZWMzNjQyNTZhZDZmMjMxZmQyZGUxNjQ0IiwiaCI6Im11cm11cjY0In0=';

// ─── Single-user map (for employee self-view) ───────────────────────────────
export function LiveMap({ latitude, longitude, address, zoom = 15, height = 260, label }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    injectLeafletCSS();
    if (!latitude || !longitude) return;

    import('leaflet').then((L) => {
      if (!containerRef.current) return;

      // Fix default marker icon paths (Leaflet/Vite issue)
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, {
          zoomControl: true,
          scrollWheelZoom: false,
        }).setView([latitude, longitude], zoom);

        // Standard OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(mapRef.current);

        markerRef.current = L.marker([latitude, longitude])
          .addTo(mapRef.current)
          .bindPopup(`<b>📍 ${label || 'Current Location'}</b><br/>${address || ''}`)
          .openPopup();

        // Accuracy circle
        L.circle([latitude, longitude], {
          color: '#7C3AED',
          fillColor: '#A78BFA',
          fillOpacity: 0.15,
          radius: 80,
        }).addTo(mapRef.current);

      } else {
        mapRef.current.setView([latitude, longitude], zoom);
        markerRef.current.setLatLng([latitude, longitude]);
        markerRef.current.setPopupContent(`<b>📍 ${label || 'Current Location'}</b><br/>${address || ''}`);
      }
    });
  }, [latitude, longitude, address, zoom, label]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  if (!latitude || !longitude) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-2xl"
      >
        <p className="text-sm text-gray-400">📍 Location not available</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: '1rem', zIndex: 0 }}
      className="overflow-hidden border border-gray-200 dark:border-slate-700"
    />
  );
}

// ─── Multi-user admin tracking map ──────────────────────────────────────────
export function AdminLiveMap({ tracks = [], height = 460 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    injectLeafletCSS();
    if (tracks.length === 0 && !mapRef.current) return;

    import('leaflet').then((L) => {
      if (!containerRef.current) return;

      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const firstTrack = tracks[0];
      const centerLat = firstTrack?.latitude || 23.0225;
      const centerLon = firstTrack?.longitude || 72.5714;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, {
          zoomControl: true,
          scrollWheelZoom: true,
        }).setView([centerLat, centerLon], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(mapRef.current);
      }

      // Role → color map
      const roleColors = {
        employee: '#7C3AED',
        it_intern: '#2563EB',
        bd_intern: '#16A34A',
        recruitment_intern: '#D97706',
      };

      // Update/add markers
      const activeIds = new Set();
      tracks.forEach((track) => {
        const uid = track.user_id;
        activeIds.add(uid);
        const color = roleColors[track.user?.role] || '#64748B';
        const name = track.user?.full_name || 'Unknown';
        const role = track.user?.role?.replace('_', ' ') || '';
        const timeAgo = track.timestamp
          ? Math.round((Date.now() - new Date(track.timestamp).getTime()) / 60000)
          : null;

        const svgIcon = L.divIcon({
          className: '',
          html: `<div style="
            background:${color};
            width:36px;height:36px;border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            border:3px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
          ">
            <span style="transform:rotate(45deg);font-size:14px;">👤</span>
          </div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -36],
        });

        if (markersRef.current[uid]) {
          markersRef.current[uid].setLatLng([track.latitude, track.longitude]);
          markersRef.current[uid].setPopupContent(
            `<div style="min-width:160px">
              <b style="color:${color}">🟢 ${name}</b><br/>
              <span style="font-size:11px;color:#666">${role}</span><br/>
              <hr style="margin:4px 0"/>
              📍 ${track.address || `${track.latitude.toFixed(4)}, ${track.longitude.toFixed(4)}`}<br/>
              <span style="font-size:11px;color:#888">Updated ${timeAgo !== null ? timeAgo + ' min ago' : 'just now'}</span>
            </div>`
          );
        } else {
          markersRef.current[uid] = L.marker([track.latitude, track.longitude], { icon: svgIcon })
            .addTo(mapRef.current)
            .bindPopup(
              `<div style="min-width:160px">
                <b style="color:${color}">🟢 ${name}</b><br/>
                <span style="font-size:11px;color:#666">${role}</span><br/>
                <hr style="margin:4px 0"/>
                📍 ${track.address || `${track.latitude.toFixed(4)}, ${track.longitude.toFixed(4)}`}<br/>
                <span style="font-size:11px;color:#888">Updated ${timeAgo !== null ? timeAgo + ' min ago' : 'just now'}</span>
              </div>`
            );
        }
      });

      // Remove stale markers
      Object.keys(markersRef.current).forEach((uid) => {
        if (!activeIds.has(uid)) {
          markersRef.current[uid].remove();
          delete markersRef.current[uid];
        }
      });

      // Fit bounds if multiple
      if (tracks.length > 1) {
        const bounds = tracks.map((t) => [t.latitude, t.longitude]);
        mapRef.current.fitBounds(bounds, { padding: [40, 40] });
      }
    });
  }, [tracks]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  if (tracks.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-2xl gap-3"
      >
        <span className="text-4xl">🗺️</span>
        <p className="text-sm font-semibold text-gray-500">No employees currently tracked live</p>
        <p className="text-xs text-gray-400">Employees who have checked in will appear here</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: '1rem', zIndex: 0 }}
      className="overflow-hidden border border-gray-200 dark:border-slate-700"
    />
  );
}
