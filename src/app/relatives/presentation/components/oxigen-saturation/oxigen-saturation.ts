import { Component, Input, AfterViewInit, OnDestroy, OnChanges, ViewChild, ElementRef, inject } from '@angular/core';
import { Chart, ChartTypeRegistry, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { TranslateService } from '@ngx-translate/core';

Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

@Component({
    selector: 'app-oxygen-saturation',
    template: `
        <canvas #chartCanvas height="300"></canvas>`,
    standalone: true,
    styleUrls: ['oxigen-saturation.css']
})
export class OxygenSaturation implements AfterViewInit, OnDestroy, OnChanges {

    private translateService = inject(TranslateService);

    @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

    @Input() oxygenLevel: { ox: number }[] = [];

    private chartInstance?: Chart<keyof ChartTypeRegistry, (number | null)[], unknown>;

    private weekdayLabels(): string[] {
        return (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map((k) =>
            this.translateService.instant(`senior-citizen.statistics.weekdays.${k}`)
        );
    }

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
        const oxygenSaturationTitle = this.translateService.instant('senior-citizen.statistics.oxygenSaturation');
        const dayOfWeekLabel = this.translateService.instant('senior-citizen.statistics.dayOfWeek');
        const spO2Label = this.translateService.instant('senior-citizen.statistics.spO2');

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.weekdayLabels(),
                datasets: [
                    {
                        label: spO2Label,
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
