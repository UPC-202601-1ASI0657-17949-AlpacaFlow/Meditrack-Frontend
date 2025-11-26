import { Component, Input, AfterViewInit, OnDestroy, OnChanges, ViewChild, ElementRef, inject } from '@angular/core';
import { Chart, ChartTypeRegistry, ChartConfiguration, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import {TranslateService} from "@ngx-translate/core";

Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

@Component({
    selector: 'app-oxygen-saturation',
    standalone: true,
    template: `<canvas #chartCanvas height="300"></canvas>`,
    styleUrls: ['oxygen-saturation.css']
})
export class OxygenSaturation implements AfterViewInit, OnDestroy, OnChanges {

    private translateService = inject(TranslateService);

    @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

    @Input() oxygenLevel: number[] | { ox: number }[] = [];

    private chartInstance?: Chart<keyof ChartTypeRegistry, (number | null)[], unknown>;

    labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    ngAfterViewInit() {
        this.initChart();
    }

    ngOnChanges() {
        if (this.chartInstance) {
            this.chartInstance.data.datasets[0].data = this.getOxygenData();
            this.chartInstance.update();
        }
    }

    private getOxygenData(): number[] {
        if (!this.oxygenLevel || this.oxygenLevel.length === 0) return [];
        
        // Check if it's an array of objects or numbers
        if (typeof this.oxygenLevel[0] === 'object' && 'ox' in this.oxygenLevel[0]) {
            return (this.oxygenLevel as { ox: number }[]).map(d => d.ox);
        }
        return this.oxygenLevel as number[];
    }

    ngOnDestroy() {
        this.chartInstance?.destroy();
    }

    private initChart() {
        if (!this.chartCanvas) return;

        const ctx = this.chartCanvas.nativeElement.getContext('2d');
        if (!ctx) return;

        const data = this.getOxygenData();
        const oxygenSaturationTitle = this.translateService.instant('senior-citizen.statistics.oxygenSaturation');
        const dayOfWeekLabel = this.translateService.instant('senior-citizen.statistics.dayOfWeek');
        const spO2Label = this.translateService.instant('senior-citizen.statistics.spO2');

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
                    title: { display: true, text: oxygenSaturationTitle }
                },
                scales: {
                    x: {
                        title: { display: true, text: dayOfWeekLabel }
                    },
                    y: {
                        min: 90,
                        max: 100,
                        title: { display: true, text: spO2Label }
                    }
                }
            }
        });
    }
}

