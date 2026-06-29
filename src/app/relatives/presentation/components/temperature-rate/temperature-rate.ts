import { Component, Input, AfterViewInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { Chart } from 'chart.js';
import { TranslateService } from '@ngx-translate/core';
import { ensureVitalChartsRegistered } from '../../../../shared/utils/vital-chart.setup';
import {
  formatChartAxisTick,
  formatVitalTimeLabel,
  toVitalChartPoints,
  VitalChartDatum,
  VitalTimePoint,
  vitalChartPointRadius,
  vitalChartTemperatureYBounds,
  vitalChartXBounds,
} from '../../../../shared/utils/vital-chart.utils';

ensureVitalChartsRegistered();

@Component({
  selector: 'app-temperature-rate',
  standalone: true,
  template: `<canvas #chartCanvas height="300"></canvas>`,
  styleUrls: ['temperature-rate.css'],
})
export class TemperatureRate implements AfterViewInit, OnDestroy {
  private translateService = inject(TranslateService);

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  @Input() thresholdMin = 36.0;
  @Input() thresholdMax = 37.5;

  @Input() set points(value: VitalTimePoint[]) {
    this._points = value ?? [];
    this.refresh();
  }

  private _points: VitalTimePoint[] = [];
  private chartInstance?: Chart<'line', VitalChartDatum[], unknown>;

  ngAfterViewInit(): void {
    this.initChart();
    this.refresh();
  }

  ngOnDestroy(): void {
    this.chartInstance?.destroy();
  }

  private chartData(): VitalChartDatum[] {
    return toVitalChartPoints(this._points);
  }

  private refresh(): void {
    if (!this.chartCanvas) {
      return;
    }
    if (!this.chartInstance) {
      this.initChart();
      return;
    }
    this.applyChartData();
  }

  private applyChartData(): void {
    if (!this.chartInstance) {
      return;
    }
    const data = this.chartData();
    this.chartInstance.data.datasets[0].data = data;
    this.chartInstance.data.datasets[0].pointRadius = vitalChartPointRadius(data.length);
    const xBounds = vitalChartXBounds(data);
    const yBounds = vitalChartTemperatureYBounds(data, this.thresholdMin, this.thresholdMax);
    const xScale = this.chartInstance.options.scales?.['x'];
    const yScale = this.chartInstance.options.scales?.['y'];
    if (xScale) {
      xScale.min = xBounds.min;
      xScale.max = xBounds.max;
    }
    if (yScale) {
      yScale.min = yBounds.min;
      yScale.max = yBounds.max;
    }
    this.chartInstance.update('none');
  }

  private initChart(): void {
    if (!this.chartCanvas || this.chartInstance) {
      return;
    }
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      return;
    }

    const temperatureLabel = this.translateService.instant('senior-citizen.statistics.temperatureUnit');
    const temperatureTitle = this.translateService.instant('senior-citizen.statistics.temperature');
    const trendSubtitle = this.translateService.instant('senior-citizen.statistics.chartTrendSubtitle');
    const timeAxisLabel = this.translateService.instant('senior-citizen.statistics.measuredAtTime');
    const data = this.chartData();
    const xBounds = vitalChartXBounds(data);
    const yBounds = vitalChartTemperatureYBounds(data, this.thresholdMin, this.thresholdMax);
    const pointRadius = vitalChartPointRadius(data.length);

    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: temperatureLabel,
          data,
          borderColor: 'rgb(230, 74, 96)',
          borderWidth: 2.5,
          tension: 0,
          stepped: 'after',
          fill: false,
          spanGaps: false,
          pointRadius,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgb(230, 74, 96)',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,
        animation: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: [temperatureTitle, trendSubtitle],
            padding: { bottom: 12 },
          },
          tooltip: {
            callbacks: {
              title: (items) => formatVitalTimeLabel(new Date(items[0]?.parsed.x ?? 0).toISOString()),
              label: (item) => `${temperatureLabel}: ${item.parsed.y}°C`,
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            min: xBounds.min,
            max: xBounds.max,
            title: { display: true, text: timeAxisLabel },
            ticks: { maxTicksLimit: 6, callback: (value) => formatChartAxisTick(value) },
          },
          y: {
            min: yBounds.min,
            max: yBounds.max,
            title: { display: true, text: temperatureLabel },
          },
        },
      },
    });
  }
}
