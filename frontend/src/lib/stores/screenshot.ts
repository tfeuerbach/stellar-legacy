import { writable } from 'svelte/store';

export interface ScreenshotContext {
	domElement: HTMLCanvasElement;
	renderForStation: (stationCode: string, seed: number, delta: number) => void;
}

export const canvasRenderer = writable<ScreenshotContext | null>(null);
