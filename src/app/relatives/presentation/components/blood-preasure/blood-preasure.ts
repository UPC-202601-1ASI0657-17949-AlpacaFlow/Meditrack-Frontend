import {Component, Input, AfterViewInit, OnDestroy, ViewChild, ElementRef, computed} from '@angular/core';
import { Chart, ChartConfiguration, ChartTypeRegistry, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

@Component({
    selector: 'app-blood-preasure',
    template: `
        <canvas #chartCanvas height="300"></canvas>`,
    standalone: true,
    styleUrls: ['./blood-preasure.css']
})
export class BloodPreasure implements AfterViewInit, OnDestroy {


    @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

    @Input() bloodPressure: [number, number][] = [];
    private chartInstance?: Chart<keyof ChartTypeRegistry, (number | [number, number] | null)[], unknown>;

    labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    ngAfterViewInit() {
        this.initChart();
    }

    ngOnDestroy() {
        this.chartInstance?.destroy();
    }

    private initChart() {
        if (!this.chartCanvas) return;

        const ctx = this.chartCanvas.nativeElement.getContext('2d');
        if (!ctx) return;

        this.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.labels,
                datasets: [
                    {
                        label: 'Blood Pressure (mmHg)',
                        data: this.bloodPressure,
                        backgroundColor: 'rgba(255, 99, 132, 0.6)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: {
                        display: true,
                        text: 'Blood Pressure (Diastolic & Systolic) - Last 7 Days'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const val = context.raw as [number, number];
                                return `Diastolic: ${val[0]}, Systolic: ${val[1]}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        suggestedMin: 60,
                        suggestedMax: 140,
                        title: { display: true, text: 'mmHg' }
                    }
                }
            }
        });
    }

    ngOnChanges() {
        if (this.chartInstance) {
            this.chartInstance.data.datasets[0].data = this.bloodPressure ?? [];
            this.chartInstance.update();
        }
    }
}
