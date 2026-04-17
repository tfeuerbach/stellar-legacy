import { writable, derived } from 'svelte/store';

export interface StationInfo {
	id: string;
	code: string;
	name: string;
	latitude: number;
	longitude: number;
	altitude: number;
	rigidity: number;
	credit_text: string;
}

export interface CosmicReading {
	station: string;
	stationName: string;
	counts: number;
	normalized: number;
	fluxDelta: number;
	timestamp: string;
	credit: string;
}

export type RenderMode = 'noise' | 'pipes' | 'crossing' | 'runner' | 'voxel';

export const stations = writable<StationInfo[]>([]);
export const currentStation = writable<string>('');
export const currentReading = writable<CosmicReading | null>(null);
export const isConnected = writable(false);
export const renderMode = writable<RenderMode>('noise');
export const readingHistory = writable<CosmicReading[]>([]);

export const currentCredit = derived(currentReading, ($reading) => {
	if (!$reading) return '';
	return $reading.credit;
});

export const nmdbCredit =
	'Data provided by NMDB (nmdb.eu), founded under EU FP7 programme (contract no. 213007)';
