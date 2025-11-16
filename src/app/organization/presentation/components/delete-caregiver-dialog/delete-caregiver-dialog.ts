import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { Caregiver } from '../../../domain/model/caregiver.entity';

export interface DeleteCaregiverDialogData {
  caregiver: Caregiver;
}

@Component({
  selector: 'app-delete-caregiver-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    TranslatePipe
  ],
  templateUrl: './delete-caregiver-dialog.html',
  styleUrls: ['./delete-caregiver-dialog.css']
})
export class DeleteCaregiverDialog {
  constructor(
    public dialogRef: MatDialogRef<DeleteCaregiverDialog>,
    @Inject(MAT_DIALOG_DATA) public data: DeleteCaregiverDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}

