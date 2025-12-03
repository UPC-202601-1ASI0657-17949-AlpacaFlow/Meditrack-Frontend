import { Component, Input, AfterViewInit, OnDestroy, OnChanges, ViewChild, ElementRef } from '@angular/core';
import { Chart, ChartTypeRegistry, ChartConfiguration, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

@Component({
    selector: 'app-oxygen-saturation',
    template: `
        <canvas #chartCanvas height="300"></canvas>`,
    standalone: true,
    styleUrls: ['oxigen-saturation.css']
})
export class OxygenSaturation implements AfterViewInit, OnDestroy, OnChanges {

    @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

    @Input() oxygenLevel: { ox: number }[] = [];

    private chartInstance?: Chart<keyof ChartTypeRegistry, (number | null)[], unknown>;

    labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    ngAfterViewInit() {
        this.initChart();
    }

    ngOnChanges() {
        if (this.chartInstance) {
            this.chartInstance.data.datasets[0].data = this.oxygenLevel?.map(d => d.ox) ?? [];
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

        const data = this.oxygenLevel?.map(d => d.ox) ?? [];

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.labels,
                datasets: [
                    {
                        label: 'SpO2',
                        data: data,
                        borderColor: 'rgb(99,255,135)',
                        backgroundColor: 'rgba(99,255,135,0.2)',
                        borderWidth: 2,
                        pointRadius: 3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true },
                    title: { display: true, text: 'Oxygen Saturation (%) - Last 7 Days' }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Day of the Week' }
                    },
                    y: {
                        min: 90,
                        max: 100,
                        title: { display: true, text: 'SpO₂ (%)' }
                    }
                }
            }
        });
    }
}
