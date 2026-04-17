import { io, type Socket } from 'socket.io-client';
import { currentReading, isConnected, currentStation, readingHistory, type CosmicReading } from './cosmic';
import { get } from 'svelte/store';

let socket: Socket | null = null;
let apiUrl = '';

export function initSocket(wsUrl: string) {
	if (socket) return;

	apiUrl = wsUrl.replace(/^ws/, 'http');

	socket = io(`${wsUrl}/cosmic`, {
		transports: ['websocket'],
		reconnection: true,
		reconnectionDelay: 1000,
		reconnectionAttempts: Infinity
	});

	socket.on('connect', () => {
		isConnected.set(true);
		const station = get(currentStation);
		if (station) {
			socket?.emit('subscribe', { station });
		}
	});

	socket.on('disconnect', () => {
		isConnected.set(false);
	});

	socket.on('reading', (data) => {
		currentReading.set(data);
		readingHistory.update((prev) => {
			const last = prev[prev.length - 1];
			if (last && last.timestamp === data.timestamp) return prev;
			return [...prev, data].slice(-120);
		});
	});
}

export async function subscribeToStation(stationCode: string) {
	currentStation.set(stationCode);
	readingHistory.set([]);

	if (socket?.connected) {
		socket.emit('subscribe', { station: stationCode });
	}

	const base = apiUrl || 'http://localhost:3001';

	try {
		const [latestRes, historyRes] = await Promise.all([
			fetch(`${base}/api/stations/${stationCode}/latest`),
			fetch(`${base}/api/stations/${stationCode}/history?limit=60`)
		]);

		if (latestRes.ok) {
			const latest = await latestRes.json();
			if (latest) {
				currentReading.set({
					station: latest.station_code,
					stationName: latest.station_name,
					counts: latest.raw_counts,
					normalized: latest.normalized,
					fluxDelta: latest.flux_delta,
					timestamp: latest.timestamp,
					credit: latest.credit_text
				});
			}
		}

		if (historyRes.ok) {
			const rows: any[] = await historyRes.json();
			const mapped: CosmicReading[] = rows.reverse().map((d) => ({
				station: d.station_code,
				stationName: d.station_name,
				counts: d.raw_counts,
				normalized: d.normalized,
				fluxDelta: d.flux_delta,
				timestamp: d.timestamp,
				credit: d.credit_text
			}));
			readingHistory.set(mapped);
		}
	} catch (e) {
		console.warn('Failed to load station data', e);
	}
}

export function disconnect() {
	socket?.disconnect();
	socket = null;
}
