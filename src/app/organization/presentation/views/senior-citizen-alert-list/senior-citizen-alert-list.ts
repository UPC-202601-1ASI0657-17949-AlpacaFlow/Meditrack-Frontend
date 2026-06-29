import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  Signal,
} from '@angular/core';
import { OrganizationStore } from '../../../application/organization.store';
import { DeviceStore } from '../../../application/device.store';
import { Alert } from '../../../domain/model/alert.entity';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DeviceDegradedBanner } from '../../components/device-degraded-banner/device-degraded-banner';
import { alertTimestampMs, formatAlertWhen } from '../../../../shared/utils/vital-chart.utils';

const MAX_ALERTS_DISPLAY = 25;

@Component({
  selector: 'app-senior-citizen-alert-list',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    DeviceDegradedBanner,
  ],
  templateUrl: './senior-citizen-alert-list.html',
  styleUrl: './senior-citizen-alert-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeniorCitizenAlertList implements OnInit, OnDestroy {
  private organizationStore = inject(OrganizationStore);
  private deviceStore = inject(DeviceStore);
  private route = inject(ActivatedRoute);
  private routeSubscription?: Subscription;
  private readonly emptyAlerts = computed(() => [] as Alert[]);
  private alertsSignal?: Signal<Alert[]>;
  private cachedDeviceId = 0;

  seniorCitizen = computed(() => this.organizationStore.selectedSeniorCitizen());
  deviceId = computed(() => this.seniorCitizen()?.deviceId ?? 0);
  isDegraded = computed(() => {
    const id = this.deviceId();
    return id > 0 && this.deviceStore.isDeviceDataDegraded(id)();
  });
  lastSyncedAt = computed(() => {
    const id = this.deviceId();
    return id > 0 ? this.deviceStore.getLastSyncedAt(id)() : null;
  });

  loading = computed(() => this.deviceStore.loadingAlerts());

  displayedAlerts = computed(() => {
    const alerts = this.resolveAlertsSignal()();
    if (!alerts.length) {
      return [];
    }
    return [...alerts]
      .sort((a, b) => alertTimestampMs(b.registeredAt) - alertTimestampMs(a.registeredAt))
      .slice(0, MAX_ALERTS_DISPLAY);
  });

  totalAlertCount = computed(() => this.resolveAlertsSignal()().length);
  hasMoreAlerts = computed(() => this.totalAlertCount() > MAX_ALERTS_DISPLAY);

  ngOnInit(): void {
    this.loadSeniorCitizen();
    this.loadAlertsIfReady();

    this.routeSubscription = this.route.paramMap.subscribe(() => {
      this.loadSeniorCitizen();
      this.loadAlertsIfReady();
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  formatWhen(alert: Alert): string {
    if (alert.registeredAt?.trim()) {
      return formatAlertWhen(alert.registeredAt);
    }
    if (alert.date && alert.time) {
      return `${alert.date} ${alert.time}`;
    }
    return alert.time || alert.date || '-';
  }

  severityClass(alertType: string | undefined): string {
    const type = (alertType ?? '').toLowerCase();
    if (type.includes('high') || type.includes('critical') || type.includes('danger')) {
      return 'alert-danger';
    }
    if (type.includes('warning') || type.includes('medium')) {
      return 'alert-warning';
    }
    return 'alert-info';
  }

  private resolveAlertsSignal(): Signal<Alert[]> {
    const deviceId = this.deviceId();
    if (deviceId !== this.cachedDeviceId) {
      this.cachedDeviceId = deviceId;
      this.alertsSignal = deviceId > 0
        ? this.deviceStore.getAlertsForDevice(deviceId)
        : undefined;
    }
    return this.alertsSignal ?? this.emptyAlerts;
  }

  private loadAlertsIfReady(): void {
    const deviceId = this.deviceId();
    if (deviceId > 0) {
      this.deviceStore.loadAlertsByDeviceId(deviceId);
    }
  }

  private loadSeniorCitizen(): void {
    const seniorCitizenId = this.route.snapshot.paramMap.get('id');
    if (seniorCitizenId) {
      this.organizationStore.loadSeniorCitizenById(Number(seniorCitizenId));
    }
  }
}
