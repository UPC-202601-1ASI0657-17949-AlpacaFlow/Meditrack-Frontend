import {Component, computed, inject, OnInit, OnDestroy} from '@angular/core';
import {OrganizationStore} from "../../../application/organization.store";
import {BloodPressure} from "../../components/blood-pressure/blood-pressure";
import {HeartRate} from "../../components/heart-rate/heart-rate";
import {OxygenSaturation} from "../../components/oxygen-saturation/oxygen-saturation";
import {TemperatureRate} from "../../components/temperature-rate/temperature-rate";
import {ActivatedRoute} from "@angular/router";
import {Subscription} from "rxjs";

@Component({
  selector: 'app-senior-citizen-statistic',
  standalone: true,
  imports: [
    BloodPressure,
    HeartRate,
    OxygenSaturation,
    TemperatureRate
  ],
  templateUrl: './senior-citizen-statistic.html',
  styleUrl: './senior-citizen-statistic.css'
})
export class SeniorCitizenStatistic implements OnInit, OnDestroy {

    private organizationStore = inject(OrganizationStore);
    private route = inject(ActivatedRoute);
    private routeSubscription?: Subscription;

    seniorCitizen = computed(() => this.organizationStore.selectedSeniorCitizen())

    bloodPressure = computed<[number, number][]>(() => {
        const bp = this.seniorCitizen()?.signalVitals?.bloodPressure;
        if (!bp) return [];
        return bp.map(arr => [arr[0] ?? 0, arr[1] ?? 0] as [number, number]);
    });

    heartRate = computed<number[]>(
        () => this.seniorCitizen()?.signalVitals?.heartRate ?? []);

    oxigenLevel = computed<any[]>(
        () => this.seniorCitizen()?.signalVitals?.oxygenLevel ?? []);

    temperature = computed<number[]>(
        () => this.seniorCitizen()?.signalVitals?.temperature ?? []);

    ngOnInit() {
        // Load senior citizen on init
        this.loadSeniorCitizen();
        
        // Subscribe to route changes to reload senior citizen when navigating between different senior citizens
        this.routeSubscription = this.route.paramMap.subscribe(params => {
            const seniorCitizenId = params.get('id');
            if (seniorCitizenId) {
                this.loadSeniorCitizen();
            }
        });
    }

    private loadSeniorCitizen(): void {
        const seniorCitizenId = this.route.snapshot.paramMap.get('id');
        if (seniorCitizenId) {
            console.log(`SeniorCitizenStatistic: Loading senior citizen ${seniorCitizenId}`);
            this.organizationStore.loadSeniorCitizenById(Number(seniorCitizenId));
        }
    }

    ngOnDestroy(): void {
        if (this.routeSubscription) {
            this.routeSubscription.unsubscribe();
        }
    }
}

