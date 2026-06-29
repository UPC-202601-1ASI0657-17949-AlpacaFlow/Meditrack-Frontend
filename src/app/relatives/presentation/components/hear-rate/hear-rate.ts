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
  selector: 'app-heart-rate',
  standalone: true,
  template: `<canvas #chartCanvas height="300"></canvas>`,
  styleUrls: ['hear-rate.css'],
})
export class HeartRate implements AfterViewInit, OnDestroy {
  private translateService = inject(TranslateService);

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  @Input() thresholdMin = 60;
  @Input() thresholdMax = 100;

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
    if (this.chartInstance.options.scales?.['y']) {
      this.chartInstance.options.scales['y'].min = this.thresholdMin - 5;
      this.chartInstance.options.scales['y'].max = this.thresholdMax + 5;
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

    const heartRateLabel = this.translateService.instant('senior-citizen.statistics.heartRate');
    const heartRateTitle = this.translateService.instant('senior-citizen.statistics.heartRateTitle');
    const trendSubtitle = this.translateService.instant('senior-citizen.statistics.chartTrendSubtitle');
    const bpmLabel = this.translateService.instant('senior-citizen.statistics.bpm');
    const timeAxisLabel = this.translateService.instant('senior-citizen.statistics.measuredAtTime');
    const data = this.chartData();
    const bounds = vitalChartXBounds(data);
    const pointRadius = vitalChartPointRadius(data.length);

    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: heartRateLabel,
          data,
          borderColor: 'rgb(226,99,255)',
          borderWidth: 2.5,
          tension: 0,
          stepped: 'after',
          fill: false,
          spanGaps: false,
          pointRadius,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgb(226,99,255)',
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
            text: [heartRateTitle, trendSubtitle],
            padding: { bottom: 12 },
          },
          tooltip: {
            callbacks: {
              title: (items) => formatVitalTimeLabel(new Date(items[0]?.parsed.x ?? 0).toISOString()),
              label: (item) => `${heartRateLabel}: ${item.parsed.y} ${bpmLabel}`,
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
            min: this.thresholdMin - 5,
            max: this.thresholdMax + 5,
            title: { display: true, text: bpmLabel },
          },
        },
      },
    });
  }
}
