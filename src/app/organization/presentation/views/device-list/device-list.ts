import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { DeviceStore } from '../../../application/device.store';
import { Device } from '../../../domain/model/device.entity';
import { HideDeviceDialog } from '../../components/hide-device-dialog/hide-device-dialog';

@Component({
  selector: 'app-device-list',
  standalone: true,
  imports: [CommonModule, TranslatePipe, MatButtonModule, MatDialogModule],
  templateUrl: './device-list.html',
  styleUrl: './device-list.css'
})
export class DeviceList implements OnInit {
  constructor(
    public deviceStore: DeviceStore,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.deviceStore.loadAllDevices();
  }

  trackById(_index: number, device: Device): number {
    return device.id ?? _index;
  }

  confirmRemove(device: Device): void {
    if (device.id == null) {
      return;
    }

    const dialogRef = this.dialog.open(HideDeviceDialog, {
      width: '420px',
      data: {
        deviceId: device.id,
        model: device.model || '—'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed || device.id == null) {
        return;
      }
      this.deviceStore.hideDeviceFromList(device.id);
    });
  }
}
