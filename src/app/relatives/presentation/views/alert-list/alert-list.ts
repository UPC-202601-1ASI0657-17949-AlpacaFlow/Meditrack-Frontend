import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  Signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { RelativesStore } from '../../../application/relatives.store';
import { DeviceStore } from '../../../../organization/application/device.store';
import { Alert } from '../../../../organization/domain/model/alert.entity';
import { DeviceDegradedBanner } from '../../../../organization/presentation/components/device-degraded-banner/device-degraded-banner';
import { alertTimestampMs, formatAlertWhen } from '../../../../shared/utils/vital-chart.utils';

const MAX_ALERTS_DISPLAY = 25;

@Component({
  selector: 'app-alert-list',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    DeviceDegradedBanner,
  ],
  templateUrl: './alert-list.html',
  styleUrl: './alert-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertList implements OnInit {
  private relativesStore = inject(RelativesStore);
  private deviceStore = inject(DeviceStore);
  private route = inject(ActivatedRoute);
  private readonly emptyAlerts = computed(() => [] as Alert[]);
  private alertsSignal?: Signal<Alert[]>;
  private cachedDeviceId = 0;

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

  constructor() {
    effect(() => {
      const deviceId = this.deviceId();
      if (deviceId > 0) {
        this.deviceStore.loadAlertsByDeviceId(deviceId);
      }
    });
  }

  ngOnInit(): void {
    this.loadRelative();
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

  private loadRelative(): void {
    const relativeId = this.route.snapshot.parent?.params['id'];
    if (relativeId) {
      const id = parseInt(relativeId, 10);
      if (id) {
        this.relativesStore.loadRelativeById(id);
      }
    }
  }
}
