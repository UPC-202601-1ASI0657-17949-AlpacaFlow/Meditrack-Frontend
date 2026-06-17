import { Component, Input, AfterViewInit, OnDestroy, ViewChild, ElementRef, OnChanges, SimpleChanges, inject } from '@angular/core';
import { Chart, ChartTypeRegistry, registerables } from 'chart.js';
import {TranslateService} from "@ngx-translate/core";
import {
  formatChartAxisTick,
  toVitalChartPoints,
  VitalTimePoint,
  vitalChartXBounds
} from '../../../../shared/utils/vital-chart.utils';

Chart.register(...registerables);

@Component({
    selector: 'app-temperature-rate',
    standalone: true,
    template: `
    <div class="p-4">
      <canvas #chartCanvas height="300"></canvas>
    </div>
  `,
    styleUrls: ['./temperature-rate.css']
})
export class TemperatureRate implements AfterViewInit, OnDestroy, OnChanges {

    private translateService = inject(TranslateService);

    @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
    @Input() points: VitalTimePoint[] = [];
    @Input() thresholdMin = 36.0;
    @Input() thresholdMax = 37.5;

    private chartInstance?: Chart<keyof ChartTypeRegistry, { x: number; y: number }[], unknown>;

    ngAfterViewInit() {
        this.initChart();
    }

    ngOnDestroy() {
        this.chartInstance?.destroy();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (this.chartInstance && (changes['points'] || changes['thresholdMin'] || changes['thresholdMax'])) {
            this.applyChartData();
        }
    }

    private chartData() {
        return toVitalChartPoints(this.points);
    }

    private applyChartData() {
        if (!this.chartInstance) return;
        const data = this.chartData();
        this.chartInstance.data.datasets[0].data = data;
        this.applyXScaleBounds(data);
        if (this.chartInstance.options.scales?.['y']) {
            this.chartInstance.options.scales['y'].min = this.thresholdMin - 1;
            this.chartInstance.options.scales['y'].max = this.thresholdMax + 1;
        }
        this.chartInstance.update('active');
    }

    private applyXScaleBounds(data: { x: number; y: number }[]) {
        const bounds = vitalChartXBounds(data);
        const xScale = this.chartInstance?.options.scales?.['x'];
        if (!xScale || !bounds) return;
        xScale.min = bounds.min;
        xScale.max = bounds.max;
    }

    private initChart() {
        if (!this.chartCanvas) return;
        const ctx = this.chartCanvas.nativeElement.getContext('2d');
        if (!ctx) return;

        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, "rgba(255, 0, 0, 0.5)");
        gradient.addColorStop(0.5, "rgba(255, 255, 0, 0.3)");
        gradient.addColorStop(1, "rgba(0, 123, 255, 0.2)");

        const temperatureLabel = this.translateService.instant('senior-citizen.statistics.temperatureUnit');
        const temperatureTitle = this.translateService.instant('senior-citizen.statistics.temperature');
        const timeAxisLabel = this.translateService.instant('senior-citizen.statistics.measuredAtTime');
        const data = this.chartData();
        const bounds = vitalChartXBounds(data);

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: temperatureLabel,
                        data,
                        fill: true,
                        backgroundColor: gradient,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointBackgroundColor: 'rgba(255, 99, 132, 1)'
                    }
                ]
            },
            options: {
                responsive: true,
                parsing: false,
                plugins: {
                    legend: { display: true },
                    title: { display: true, text: temperatureTitle },
                    tooltip: {
                        callbacks: {
                            title: (items) => formatChartAxisTick(items[0]?.parsed.x ?? 0),
                            label: (item) => `${temperatureLabel}: ${item.parsed.y}°C`
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        min: bounds?.min,
                        max: bounds?.max,
                        title: { display: true, text: timeAxisLabel },
                        ticks: {
                            maxTicksLimit: 8,
                            callback: (value) => formatChartAxisTick(value)
                        }
                    },
                    y: {
                        min: this.thresholdMin - 1,
                        max: this.thresholdMax + 1,
                        title: { display: true, text: temperatureLabel }
                    }
                }
            }
        });
    }
}
