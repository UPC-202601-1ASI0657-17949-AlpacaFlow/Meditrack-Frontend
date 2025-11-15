import {Component, computed, inject, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {RelativesStore} from "../../../application/relatives.store";
import {BloodPreasure} from "../../components/blood-preasure/blood-preasure";
import {HeartRate} from "../../components/hear-rate/hear-rate";
import {OxygenSaturation} from "../../components/oxigen-saturation/oxigen-saturation";
import {TemperatureRate} from "../../components/temperature-rate/temperature-rate";
import {TranslatePipe} from '@ngx-translate/core';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-statistic',
    imports: [
        BloodPreasure,
        HeartRate,
        OxygenSaturation,
        TemperatureRate,
        TranslatePipe,
        CommonModule
    ],
  templateUrl: './statistic.html',
  styleUrl: './statistic.css'
})
export class Statistic implements OnInit {

    private relativeStore = inject(RelativesStore);
    private route = inject(ActivatedRoute);

    relative = computed(() => this.relativeStore.selectedRelative())

    bloodPressure = computed<[number, number][]>(() => {
        const bp = this.relative()?.seniorCitizen?.signalVitals?.bloodPressure;
        if (!bp) return [];
        return bp.map(arr => [arr[0] ?? 0, arr[1] ?? 0] as [number, number]);
    });


    heartRate = computed<number[]>(
        () => this.relative()?.seniorCitizen?.signalVitals?.heartRate ?? []);

    oxigenLevel = computed<any[]>(
        () => this.relative()?.seniorCitizen?.signalVitals?.oxygenLevel ?? []);

    temperature = computed<number[]>(
        () => this.relative()?.seniorCitizen?.signalVitals?.temperature ?? []);



    ngOnInit() {
        const relativeId = this.route.snapshot.parent?.params['id'];
        if (relativeId) {
            const id = parseInt(relativeId, 10);
            if (id) {
                this.relativeStore.loadRelativeById(id);
            }
        }
    }
}
