import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-device-degraded-banner',
  standalone: true,
  imports: [TranslatePipe, DatePipe],
  template: `
    @if (visible()) {
      <div class="degraded-banner" role="status">
        <p class="degraded-banner__title">{{ 'devices.degraded.title' | translate }}</p>
        <p class="degraded-banner__detail">{{ 'devices.degraded.detail' | translate }}</p>
        @if (lastSyncedAt()) {
          <p class="degraded-banner__sync">
            {{ 'devices.degraded.lastSync' | translate }}:
            {{ lastSyncedAt() | date:'short' }}
          </p>
        }
      </div>
    }
  `,
  styles: [`
    .degraded-banner {
      margin-bottom: 1rem;
      padding: 0.75rem 1rem;
      border-left: 4px solid #ed6c02;
      background: #fff4e5;
      border-radius: 4px;
      color: #5d4037;
    }

    .degraded-banner__title {
      margin: 0 0 0.25rem;
      font-weight: 600;
    }

    .degraded-banner__detail,
    .degraded-banner__sync {
      margin: 0.15rem 0 0;
      font-size: 0.9rem;
    }
  `]
})
export class DeviceDegradedBanner {
  visible = input(false);
  lastSyncedAt = input<string | null>(null);
}
