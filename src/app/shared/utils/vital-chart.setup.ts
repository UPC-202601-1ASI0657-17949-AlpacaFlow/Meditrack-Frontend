import { Chart, registerables } from 'chart.js';

let registered = false;

/** Register Chart.js plugins once for all vital-sign charts. */
export function ensureVitalChartsRegistered(): void {
  if (registered) {
    return;
  }
  Chart.register(...registerables);
  registered = true;
}
