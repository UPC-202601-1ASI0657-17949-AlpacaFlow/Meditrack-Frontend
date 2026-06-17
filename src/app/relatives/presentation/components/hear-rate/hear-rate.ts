import { Component, Input, AfterViewInit, OnDestroy, ViewChild, ElementRef, OnChanges, inject } from '@angular/core';
import { Chart, ChartTypeRegistry, LineController, LineElement, PointElement, LinearScale, Tooltip, Legend } from 'chart.js';
import { TranslateService } from '@ngx-translate/core';
import {
  formatChartAxisTick,
  toVitalChartPoints,
  VitalTimePoint,
  vitalChartXBounds
} from '../../../../shared/utils/vital-chart.utils';

Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip, Legend);

@Component({
    selector: 'app-heart-rate',
    template: `<canvas #chartCanvas height="300"></canvas>`,
    standalone: true,
    styleUrls: ['hear-rate.css']
})
export class HeartRate implements AfterViewInit, OnDestroy, OnChanges {

    private translateService = inject(TranslateService);

    @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

    @Input() points: VitalTimePoint[] = [];
    private chartInstance?: Chart<keyof ChartTypeRegistry, { x: number; y: number }[], unknown>;

    ngAfterViewInit() {
        this.initChart();
    }

    ngOnChanges() {
        if (this.chartInstance) {
            this.applyChartData();
        }
    }

    ngOnDestroy() {
        this.chartInstance?.destroy();
    }

    private chartData() {
        return toVitalChartPoints(this.points);
    }

    private applyChartData() {
        if (!this.chartInstance) return;
        const data = this.chartData();
        this.chartInstance.data.datasets[0].data = data;
        this.applyXScaleBounds(data);
        this.chartInstance.update();
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

        const heartRateLabel = this.translateService.instant('senior-citizen.statistics.heartRate');
        const heartRateTitle = this.translateService.instant('senior-citizen.statistics.heartRateTitle');
        const bpmLabel = this.translateService.instant('senior-citizen.statistics.bpm');
        const timeAxisLabel = this.translateService.instant('senior-citizen.statistics.measuredAtTime');
        const data = this.chartData();
        const bounds = vitalChartXBounds(data);

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: heartRateLabel,
                        data,
                        borderColor: 'rgb(226,99,255)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        tension: 0.3,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                responsive: true,
                parsing: false,
                interaction: {
                    mode: 'nearest',
                    intersect: false,
                    axis: 'x'
                },
                plugins: {
                    legend: { position: 'top' },
                    title: {
                        display: true,
                        text: heartRateTitle
                    },
                    tooltip: {
                        callbacks: {
                            title: (items) => formatChartAxisTick(items[0]?.parsed.x ?? 0),
                            label: (item) => `${heartRateLabel}: ${item.parsed.y} ${bpmLabel}`
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
                        type: 'linear',
                        display: true,
                        position: 'left',
                        suggestedMin: 60,
                        suggestedMax: 100,
                        title: {
                            display: true,
                            text: bpmLabel
                        }
                    }
                }
            }
        });
    }
}
