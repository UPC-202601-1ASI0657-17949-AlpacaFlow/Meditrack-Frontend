import { Component, Input, AfterViewInit, OnDestroy, ViewChild, ElementRef, OnChanges, SimpleChanges, inject } from '@angular/core';
import { Chart, ChartTypeRegistry, registerables } from 'chart.js';
import {TranslateService} from "@ngx-translate/core";

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
    @Input() temperature: number[] = [];

    private chartInstance?: Chart<keyof ChartTypeRegistry, number[], unknown>;

    private weekdayLabels(): string[] {
        return (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map((k) =>
            this.translateService.instant(`senior-citizen.statistics.weekdays.${k}`)
        );
    }

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

        const temperatureLabel = this.translateService.instant('senior-citizen.statistics.temperatureUnit');
        const temperatureTitle = this.translateService.instant('senior-citizen.statistics.temperature');
        const dayOfWeekLabel = this.translateService.instant('senior-citizen.statistics.dayOfWeek');

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.weekdayLabels(),
                datasets: [
                    {
                        label: temperatureLabel,
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
                    title: { display: true, text: temperatureTitle }
                },
                scales: {
                    x: { title: { display: true, text: dayOfWeekLabel } },
                    y: { min: 35, max: 38, title: { display: true, text: temperatureLabel } }
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

