import { Component, Input, AfterViewInit, OnDestroy, ViewChild, ElementRef, OnChanges } from '@angular/core';
import { Chart, ChartTypeRegistry, ChartConfiguration, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

@Component({
    selector: 'app-heart-rate',
    template: `
        <canvas #chartCanvas height="300"></canvas>`,
    standalone: true,
    styleUrls: ['hear-rate.css']
})
export class HeartRate implements AfterViewInit, OnDestroy, OnChanges {

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

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.labels,
                datasets: [
                    {
                        label: 'Heart Rate (bpm)',
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
                        text: 'Heart Rate - Last 7 Days'
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
                            text: 'BPM'
                        }
                    }
                }
            }
        });
    }
}
