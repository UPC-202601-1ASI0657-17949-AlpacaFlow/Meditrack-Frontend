import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';

export interface HideDeviceDialogData {
  deviceId: number;
  model: string;
}

@Component({
  selector: 'app-hide-device-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, TranslatePipe],
  templateUrl: './hide-device-dialog.html',
  styleUrls: ['./hide-device-dialog.css']
})
export class HideDeviceDialog {
  constructor(
    public dialogRef: MatDialogRef<HideDeviceDialog>,
    @Inject(MAT_DIALOG_DATA) public data: HideDeviceDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
