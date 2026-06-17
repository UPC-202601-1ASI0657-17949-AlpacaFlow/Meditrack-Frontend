import { Component, Input, AfterViewInit, OnDestroy, OnChanges, ViewChild, ElementRef, inject } from '@angular/core';
import { Chart, ChartTypeRegistry, LineController, LineElement, PointElement, LinearScale, Tooltip, Legend } from 'chart.js';
import {TranslateService} from "@ngx-translate/core";
import {
  formatChartAxisTick,
  toVitalChartPoints,
  VitalTimePoint,
  vitalChartXBounds
} from '../../../../shared/utils/vital-chart.utils';

Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip, Legend);

@Component({
    selector: 'app-oxygen-saturation',
    standalone: true,
    template: `<canvas #chartCanvas height="300"></canvas>`,
    styleUrls: ['oxygen-saturation.css']
})
export class OxygenSaturation implements AfterViewInit, OnDestroy, OnChanges {

    private translateService = inject(TranslateService);

    @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

    @Input() points: VitalTimePoint[] = [];
    @Input() thresholdMin = 90;

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
        if (this.chartInstance.options.scales?.['y']) {
            this.chartInstance.options.scales['y'].min = Math.max(50, this.thresholdMin - 5);
            this.chartInstance.options.scales['y'].max = 100;
        }
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

        const oxygenSaturationTitle = this.translateService.instant('senior-citizen.statistics.oxygenSaturation');
        const timeAxisLabel = this.translateService.instant('senior-citizen.statistics.measuredAtTime');
        const spO2Label = this.translateService.instant('senior-citizen.statistics.spO2');
        const data = this.chartData();
        const bounds = vitalChartXBounds(data);

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: spO2Label,
                        data,
                        borderColor: 'rgb(99,255,135)',
                        backgroundColor: 'rgba(99,255,135,0.2)',
                        borderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                parsing: false,
                plugins: {
                    legend: { display: true },
                    title: { display: true, text: oxygenSaturationTitle },
                    tooltip: {
                        callbacks: {
                            title: (items) => formatChartAxisTick(items[0]?.parsed.x ?? 0),
                            label: (item) => `${spO2Label}: ${item.parsed.y}%`
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
                        min: Math.max(50, this.thresholdMin - 5),
                        max: 100,
                        title: { display: true, text: spO2Label }
                    }
                }
            }
        });
    }
}
