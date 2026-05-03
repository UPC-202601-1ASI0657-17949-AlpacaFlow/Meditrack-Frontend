import {Component, computed, inject, OnInit, effect} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {RelativesStore} from "../../../application/relatives.store";
import {DeviceStore} from "../../../../organization/application/device.store";
import {
    HeartRateMeasurement,
    TemperatureMeasurement,
    OxygenMeasurement
} from "../../../../organization/domain/model/measurement.entity";
import {HeartRate} from "../../components/hear-rate/hear-rate";
import {OxygenSaturation} from "../../components/oxigen-saturation/oxigen-saturation";
import {TemperatureRate} from "../../components/temperature-rate/temperature-rate";
import {TranslatePipe} from '@ngx-translate/core';
import {CommonModule} from '@angular/common';
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";

@Component({
  selector: 'app-statistic',
    standalone: true,
    imports: [
        HeartRate,
        OxygenSaturation,
        TemperatureRate,
        TranslatePipe,
        CommonModule,
        MatProgressSpinnerModule
    ],
  templateUrl: './statistic.html',
  styleUrl: './statistic.css'
})
export class Statistic implements OnInit {

    private relativeStore = inject(RelativesStore);
    private deviceStore = inject(DeviceStore);
    private route = inject(ActivatedRoute);

    relative = computed(() => this.relativeStore.selectedRelative());
    
    deviceId = computed(() => {
        const sc = this.relative()?.seniorCitizen;
        return sc?.deviceId ? Number(sc.deviceId) : 0;
    });

    // Loading state
    loading = computed(() => this.deviceStore.loadingMeasurements());

    // Real-time measurements from device API
    heartRateMeasurements = computed(() => {
        const deviceId = this.deviceId();
        if (!deviceId) return [];
        return this.deviceStore.getHeartRateMeasurementsForDevice(deviceId)();
    });

    temperatureMeasurements = computed(() => {
        const deviceId = this.deviceId();
        if (!deviceId) return [];
        return this.deviceStore.getTemperatureMeasurementsForDevice(deviceId)();
    });

    oxygenMeasurements = computed(() => {
        const deviceId = this.deviceId();
        if (!deviceId) return [];
        return this.deviceStore.getOxygenMeasurementsForDevice(deviceId)();
    });

    heartRate = computed<number[]>(() =>
        this.heartRateMeasurements().map((m: HeartRateMeasurement) => m.bpm)
    );

    oxigenLevel = computed<{ ox: number }[]>(() =>
        this.oxygenMeasurements().map((m: OxygenMeasurement) => ({ ox: m.saturation }))
    );

    temperature = computed<number[]>(() =>
        this.temperatureMeasurements().map((m: TemperatureMeasurement) => m.temperature)
    );

    constructor() {
        // Effect to automatically load measurements when deviceId changes
        effect(() => {
            const relative = this.relative();
            const deviceId = this.deviceId();
            
            console.log('📊 Relative Statistic Effect:', {
                relative: relative ? { id: relative.id, name: `${relative.firstName} ${relative.lastName}` } : null,
                seniorCitizen: relative?.seniorCitizen ? { 
                    id: relative.seniorCitizen.firstName, 
                    deviceId: relative.seniorCitizen.deviceId 
                } : null,
                deviceId: deviceId
            });
            
            if (deviceId && deviceId > 0) {
                console.log('📊 Relative Statistic: Loading measurements for device', deviceId);
                this.deviceStore.loadAllMeasurementsForDevice(deviceId);
            } else if (relative?.seniorCitizen && !deviceId) {
                console.warn('⚠️ Relative Statistic: Senior citizen loaded but deviceId is missing or 0', {
                    relativeId: relative.id,
                    deviceId: relative.seniorCitizen.deviceId
                });
            } else if (!relative) {
                console.warn('⚠️ Relative Statistic: Relative not loaded yet');
            }
        });
    }

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
