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
  vitalChartXBounds,
} from '../../../../shared/utils/vital-chart.utils';

ensureVitalChartsRegistered();

@Component({
  selector: 'app-oxygen-saturation',
  standalone: true,
  template: `<canvas #chartCanvas height="300"></canvas>`,
  styleUrls: ['oxigen-saturation.css'],
})
export class OxygenSaturation implements AfterViewInit, OnDestroy {
  private translateService = inject(TranslateService);

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  @Input() thresholdMin = 90;

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
    const bounds = vitalChartXBounds(data);
    const xScale = this.chartInstance.options.scales?.['x'];
    if (xScale) {
      xScale.min = bounds.min;
      xScale.max = bounds.max;
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

    const title = this.translateService.instant('senior-citizen.statistics.oxygenSaturation');
    const trendSubtitle = this.translateService.instant('senior-citizen.statistics.chartTrendSubtitle');
    const timeAxisLabel = this.translateService.instant('senior-citizen.statistics.measuredAtTime');
    const spO2Label = this.translateService.instant('senior-citizen.statistics.spO2');
    const data = this.chartData();
    const bounds = vitalChartXBounds(data);
    const yMin = Math.max(50, this.thresholdMin - 5);
    const pointRadius = vitalChartPointRadius(data.length);

    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: spO2Label,
          data,
          borderColor: 'rgb(46, 168, 92)',
          borderWidth: 2.5,
          tension: 0,
          stepped: 'after',
          fill: false,
          spanGaps: false,
          pointRadius,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgb(46, 168, 92)',
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
            text: [title, trendSubtitle],
            padding: { bottom: 12 },
          },
          tooltip: {
            callbacks: {
              title: (items) => formatVitalTimeLabel(new Date(items[0]?.parsed.x ?? 0).toISOString()),
              label: (item) => `${spO2Label}: ${item.parsed.y}%`,
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            min: bounds.min,
            max: bounds.max,
            title: { display: true, text: timeAxisLabel },
            ticks: { maxTicksLimit: 6, callback: (value) => formatChartAxisTick(value) },
          },
          y: {
            min: yMin,
            max: 100,
            title: { display: true, text: spO2Label },
          },
        },
      },
    });
  }
}
