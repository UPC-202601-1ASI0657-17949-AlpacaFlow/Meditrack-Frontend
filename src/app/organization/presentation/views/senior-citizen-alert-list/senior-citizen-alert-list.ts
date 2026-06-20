import {Component, computed, inject, OnInit, OnDestroy, effect} from '@angular/core';
import {OrganizationStore} from "../../../application/organization.store";
import {DeviceStore} from "../../../application/device.store";
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from "@angular/material/card";
import {ActivatedRoute} from "@angular/router";
import {Subscription} from "rxjs";
import {TranslatePipe} from "@ngx-translate/core";
import {CommonModule} from "@angular/common";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {MatChipsModule} from "@angular/material/chips";

@Component({
  selector: 'app-senior-citizen-alert-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardContent,
    MatCardTitle,
    MatCardHeader,
    MatCard,
    MatChipsModule,
    MatProgressSpinnerModule,
    TranslatePipe
  ],
  templateUrl: './senior-citizen-alert-list.html',
  styleUrl: './senior-citizen-alert-list.css'
})
export class SeniorCitizenAlertList implements OnInit, OnDestroy {

    private organizationStore = inject(OrganizationStore);
    private deviceStore = inject(DeviceStore);
    private route = inject(ActivatedRoute);
    private routeSubscription?: Subscription;

    seniorCitizen = computed(() => this.organizationStore.selectedSeniorCitizen());
    deviceId = computed(() => this.seniorCitizen()?.deviceId ?? 0);

    // Loading state
    loading = computed(() => this.deviceStore.loadingAlerts());

    // Real-time alerts from device API
    alerts = computed(() => {
        const deviceId = this.deviceId();
        if (!deviceId) return [];
        return this.deviceStore.getAlertsForDevice(deviceId)();
    });

    // Connection error state
    hasConnectionError = computed(() => {
        return this.deviceId() > 0 && !!this.deviceStore.error();
    });

    // Sort alerts by date (newest first)
    sortedAlerts = computed(() => {
        const alerts = this.alerts();
        return [...alerts].sort((a, b) => {
            const dateA = a.registeredAt ? new Date(a.registeredAt).getTime() : 0;
            const dateB = b.registeredAt ? new Date(b.registeredAt).getTime() : 0;
            return dateB - dateA; // Descending order
        });
    });

    constructor() {
        // Effect to automatically load alerts when deviceId changes
        effect(() => {
            const seniorCitizen = this.seniorCitizen();
            const deviceId = this.deviceId();
            
            console.log('🚨 SeniorCitizenAlertList Effect:', {
                seniorCitizen: seniorCitizen ? { id: seniorCitizen.id, name: seniorCitizen.fullName, deviceId: seniorCitizen.deviceId } : null,
                deviceId: deviceId
            });
            
            if (deviceId && deviceId > 0) {
                console.log('🚨 SeniorCitizenAlertList: Loading alerts for device', deviceId);
                this.deviceStore.loadAlertsByDeviceId(deviceId);
            } else if (seniorCitizen && !deviceId) {
                console.warn('⚠️ SeniorCitizenAlertList: Senior citizen loaded but deviceId is missing or 0', {
                    seniorCitizenId: seniorCitizen.id,
                    deviceId: seniorCitizen.deviceId
                });
            } else if (!seniorCitizen) {
                console.warn('⚠️ SeniorCitizenAlertList: Senior citizen not loaded yet');
            }
        });
    }

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
            const id = Number(seniorCitizenId);
            console.log(`🚨 SeniorCitizenAlertList: Loading senior citizen ${id}`);
            this.organizationStore.loadSeniorCitizenById(id);
            
            // Log after a short delay to see if senior citizen was loaded
            setTimeout(() => {
                const loaded = this.seniorCitizen();
                console.log('🚨 SeniorCitizenAlertList: After loadSeniorCitizenById:', {
                    requestedId: id,
                    loaded: loaded ? { id: loaded.id, name: loaded.fullName, deviceId: loaded.deviceId } : null
                });
            }, 100);
        } else {
            console.error('❌ SeniorCitizenAlertList: No senior citizen ID found in route');
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

    ngOnDestroy(): void {
        if (this.routeSubscription) {
            this.routeSubscription.unsubscribe();
        }
    }
}

