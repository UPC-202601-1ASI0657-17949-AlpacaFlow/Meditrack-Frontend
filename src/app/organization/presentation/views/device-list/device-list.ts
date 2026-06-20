import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { DeviceStore } from '../../../application/device.store';
import { Device } from '../../../domain/model/device.entity';

@Component({
  selector: 'app-device-list',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './device-list.html',
  styleUrl: './device-list.css'
})
export class DeviceList implements OnInit {
  constructor(public deviceStore: DeviceStore) {}

  ngOnInit(): void {
    this.deviceStore.loadAllDevices();
  }

  trackById(_index: number, device: Device): number {
    return device.id ?? _index;
  }
}
