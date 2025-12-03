import {Component, computed, inject, OnInit, effect} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {RelativesStore} from "../../../application/relatives.store";
import {DeviceStore} from "../../../../organization/application/device.store";
import {
    BloodPressureMeasurement,
    HeartRateMeasurement,
    TemperatureMeasurement,
    OxygenMeasurement
} from "../../../../organization/domain/model/measurement.entity";
import {BloodPreasure} from "../../components/blood-preasure/blood-preasure";
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
        BloodPreasure,
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
    bloodPressureMeasurements = computed(() => {
        const deviceId = this.deviceId();
        if (!deviceId) return [];
        return this.deviceStore.getBloodPressureMeasurementsForDevice(deviceId)();
    });

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

    // Transform measurements to format expected by chart components
    // Use real-time data from DeviceStore with fallback to static signalVitals
    bloodPressure = computed<[number, number][]>(() => {
        const measurements = this.bloodPressureMeasurements();
        if (measurements.length > 0) {
            return measurements.map((m: BloodPressureMeasurement) => [m.systolic, m.diastolic] as [number, number]);
        }
        // Fallback to static data
        const bp = this.relative()?.seniorCitizen?.signalVitals?.bloodPressure;
        if (!bp) return [];
        return bp.map(arr => [arr[0] ?? 0, arr[1] ?? 0] as [number, number]);
    });

    heartRate = computed<number[]>(() => {
        const measurements = this.heartRateMeasurements();
        if (measurements.length > 0) {
            return measurements.map((m: HeartRateMeasurement) => m.bpm);
        }
        // Fallback to static data
        return this.relative()?.seniorCitizen?.signalVitals?.heartRate ?? [];
    });

    oxigenLevel = computed<{ ox: number }[]>(() => {
        const measurements = this.oxygenMeasurements();
        if (measurements.length > 0) {
            // Convert to format expected by OxygenSaturation component
            return measurements.map((m: OxygenMeasurement) => ({ ox: m.saturation }));
        }
        // Fallback to static data
        const oxygenData = this.relative()?.seniorCitizen?.signalVitals?.oxygenLevel ?? [];
        // Convertir de { ox: number }[] a { ox: number }[] si es necesario
        if (oxygenData.length > 0 && typeof oxygenData[0] === 'object') {
            return oxygenData.map((item: any) => ({ ox: item.ox ?? item }));
        }
        // Si es number[], convertir a { ox: number }[]
        if (oxygenData.length > 0 && typeof oxygenData[0] === 'number') {
            return oxygenData.map((val: number) => ({ ox: val }));
        }
        return [];
    });

    temperature = computed<number[]>(() => {
        const measurements = this.temperatureMeasurements();
        if (measurements.length > 0) {
            return measurements.map((m: TemperatureMeasurement) => m.temperature);
        }
        // Fallback to static data
        return this.relative()?.seniorCitizen?.signalVitals?.temperature ?? [];
    });

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
