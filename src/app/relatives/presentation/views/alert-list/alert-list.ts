import {Component, computed, inject, OnInit, effect} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {RelativesStore} from "../../../application/relatives.store";
import {DeviceStore} from "../../../../organization/application/device.store";
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from "@angular/material/card";
import {TranslatePipe} from '@ngx-translate/core';
import {CommonModule} from '@angular/common';
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {MatChipsModule} from "@angular/material/chips";
import {DeviceDegradedBanner} from "../../../../organization/presentation/components/device-degraded-banner/device-degraded-banner";

@Component({
  selector: 'app-alert-list',
    standalone: true,
    imports: [
        CommonModule,
        MatCardContent,
        MatCardTitle,
        MatCardHeader,
        MatCard,
        MatChipsModule,
        MatProgressSpinnerModule,
        TranslatePipe,
        DeviceDegradedBanner
    ],
  templateUrl: './alert-list.html',
  styleUrl: './alert-list.css'
})
export class AlertList implements OnInit {

    private relativesStore = inject(RelativesStore);
    private deviceStore = inject(DeviceStore);
    private route = inject(ActivatedRoute);

    relative = computed(() => this.relativesStore.selectedRelative());
    
    deviceId = computed(() => {
        const sc = this.relative()?.seniorCitizen;
        return sc?.deviceId ? Number(sc.deviceId) : 0;
    });
    isDegraded = computed(() => {
        const id = this.deviceId();
        return id > 0 && this.deviceStore.isDeviceDataDegraded(id)();
    });
    lastSyncedAt = computed(() => {
        const id = this.deviceId();
        return id > 0 ? this.deviceStore.getLastSyncedAt(id)() : null;
    });

    // Loading state
    loading = computed(() => this.deviceStore.loadingAlerts());

    // Solo alertas del API de dispositivos (sin fallback a datos estáticos del modelo).
    alerts = computed(() => {
        const deviceId = this.deviceId();
        if (!deviceId) return [];
        return this.deviceStore.getAlertsForDevice(deviceId)();
    });

    // Sort alerts by date (newest first)
    sortedAlerts = computed(() => {
        const alerts = this.alerts();
        return [...alerts].sort((a, b) => {
            const dateA = a.registeredAt ? new Date(a.registeredAt).getTime() : 
                         (a.date ? new Date(a.date).getTime() : 0);
            const dateB = b.registeredAt ? new Date(b.registeredAt).getTime() : 
                         (b.date ? new Date(b.date).getTime() : 0);
            return dateB - dateA; // Descending order
        });
    });

    constructor() {
        // Effect to automatically load alerts when deviceId changes
        effect(() => {
            const relative = this.relative();
            const deviceId = this.deviceId();
            
            console.log('🚨 Relative AlertList Effect:', {
                relative: relative ? { id: relative.id, name: `${relative.firstName} ${relative.lastName}` } : null,
                seniorCitizen: relative?.seniorCitizen ? { 
                    id: relative.seniorCitizen.firstName, 
                    deviceId: relative.seniorCitizen.deviceId 
                } : null,
                deviceId: deviceId
            });
            
            if (deviceId && deviceId > 0) {
                console.log('🚨 Relative AlertList: Loading alerts for device', deviceId);
                this.deviceStore.loadAlertsByDeviceId(deviceId);
            } else if (relative?.seniorCitizen && !deviceId) {
                console.warn('⚠️ Relative AlertList: Senior citizen loaded but deviceId is missing or 0', {
                    relativeId: relative.id,
                    deviceId: relative.seniorCitizen.deviceId
                });
            } else if (!relative) {
                console.warn('⚠️ Relative AlertList: Relative not loaded yet');
            }
        });
    }

    ngOnInit() {
        const relativeId = this.route.snapshot.parent?.params['id'];
        if (relativeId) {
            const id = parseInt(relativeId, 10);
            if (id) {
                this.relativesStore.loadRelativeById(id);
            }
        }
    }

    formatDate(date: string): string {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatTime(date: string): string {
        if (!date) return '-';
        return new Date(date).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getAlertSeverityClass(alertType: string | undefined): string {
        if (!alertType) return 'alert-info';
        
        const type = alertType.toLowerCase();
        if (type.includes('high') || type.includes('critical') || type.includes('danger')) {
            return 'alert-danger';
        } else if (type.includes('warning') || type.includes('medium')) {
            return 'alert-warning';
        } else if (type.includes('low') || type.includes('info')) {
            return 'alert-info';
        }
        return 'alert-info';
    }
}
