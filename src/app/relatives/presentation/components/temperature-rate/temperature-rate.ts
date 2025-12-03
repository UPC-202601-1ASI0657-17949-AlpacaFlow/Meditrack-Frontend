import { Component, Input, AfterViewInit, OnDestroy, ViewChild, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import { Chart, ChartTypeRegistry, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
    selector: 'app-temperature-rate',
    template: `
        <div class="p-4">
            <canvas #chartCanvas height="300"></canvas>
        </div>
    `,
    standalone: true,
    styleUrls: ['./temperature-rate.css']
})
export class TemperatureRate implements AfterViewInit, OnDestroy, OnChanges {

    @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
    @Input() temperature: number[] = [];

    private chartInstance?: Chart<keyof ChartTypeRegistry, number[], unknown>;
    private labels: string[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    ngAfterViewInit() {
        this.initChart();
    }

    ngOnDestroy() {
        this.chartInstance?.destroy();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (this.chartInstance && changes['temperature']?.currentValue) {
            this.updateChartData();
        }
    }

    private initChart() {
        if (!this.chartCanvas) return;
        const ctx = this.chartCanvas.nativeElement.getContext('2d');
        if (!ctx) return;

        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, "rgba(255, 0, 0, 0.5)");
        gradient.addColorStop(0.5, "rgba(255, 255, 0, 0.3)");
        gradient.addColorStop(1, "rgba(0, 123, 255, 0.2)");

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.labels,
                datasets: [
                    {
                        label: 'Temperature (°C)',
                        data: this.temperature,
                        fill: true,
                        backgroundColor: gradient,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 6,
                        pointBackgroundColor: 'rgba(255, 99, 132, 1)'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true },
                    title: { display: true, text: 'Body Temperature - Last 7 Days' }
                },
                scales: {
                    x: { title: { display: true, text: 'Day of the Week' } },
                    y: { min: 35, max: 38, title: { display: true, text: 'Temperature (°C)' } }
                }
            }
        });
    }

    private updateChartData() {
        if (!this.chartInstance) return;
        this.chartInstance.data.datasets[0].data = this.temperature ?? [];
        this.chartInstance.update('active');
    }
}
