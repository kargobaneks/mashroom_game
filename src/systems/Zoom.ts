import { DISPLAY } from '../config/display';

/** Наибольший целый масштаб, при котором экран 256×240 влезает в окно, в пределах min…max. */
export function computeZoom(windowWidth: number, windowHeight: number): number {
  const fit = Math.floor(Math.min(windowWidth / DISPLAY.width, windowHeight / DISPLAY.height));
  return Math.max(DISPLAY.minZoom, Math.min(DISPLAY.maxZoom, fit));
}
