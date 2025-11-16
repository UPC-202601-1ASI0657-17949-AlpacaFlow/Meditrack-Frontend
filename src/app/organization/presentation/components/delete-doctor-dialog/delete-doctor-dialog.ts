import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { Doctor } from '../../../domain/model/doctor.entity';

export interface DeleteDoctorDialogData {
  doctor: Doctor;
}

@Component({
  selector: 'app-delete-doctor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    TranslatePipe
  ],
  templateUrl: './delete-doctor-dialog.html',
  styleUrls: ['./delete-doctor-dialog.css']
})
export class DeleteDoctorDialog {
  constructor(
    public dialogRef: MatDialogRef<DeleteDoctorDialog>,
    @Inject(MAT_DIALOG_DATA) public data: DeleteDoctorDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
