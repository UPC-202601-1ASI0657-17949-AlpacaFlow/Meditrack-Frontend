import { Component, Input, AfterViewInit, OnDestroy, ViewChild, ElementRef, OnChanges, inject } from '@angular/core';
import { Chart, ChartTypeRegistry, ChartConfiguration, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import {TranslateService} from "@ngx-translate/core";

Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

@Component({
    selector: 'app-heart-rate',
    standalone: true,
    template: `<canvas #chartCanvas height="300"></canvas>`,
    styleUrls: ['heart-rate.css']
})
export class HeartRate implements AfterViewInit, OnDestroy, OnChanges {

    private translateService = inject(TranslateService);

    @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

    @Input() heartRate: number[] = [];
    private chartInstance?: Chart<keyof ChartTypeRegistry, (number | null)[], unknown>;

    labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    ngAfterViewInit() {
        this.initChart();
    }

    ngOnChanges() {
        if (this.chartInstance) {
            this.chartInstance.data.datasets[0].data = this.heartRate ?? [];
            this.chartInstance.update();
        }
    }

    ngOnDestroy() {
        this.chartInstance?.destroy();
    }

    private initChart() {
        if (!this.chartCanvas) return;

        const ctx = this.chartCanvas.nativeElement.getContext('2d');
        if (!ctx) return;

        const heartRateLabel = this.translateService.instant('senior-citizen.statistics.heartRate');
        const heartRateTitle = this.translateService.instant('senior-citizen.statistics.heartRateTitle');
        const bpmLabel = this.translateService.instant('senior-citizen.statistics.bpm');

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.labels,
                datasets: [
                    {
                        label: heartRateLabel,
                        data: this.heartRate ?? [],
                        borderColor: 'rgb(226,99,255)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        tension: 0.3,
                        fill: true,
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: { position: 'top' },
                    title: {
                        display: true,
                        text: heartRateTitle
                    }
                },
                scales: {
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

