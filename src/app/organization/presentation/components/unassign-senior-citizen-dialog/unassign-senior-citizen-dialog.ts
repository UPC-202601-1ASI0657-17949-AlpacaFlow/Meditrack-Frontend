import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { SeniorCitizen } from '../../../domain/model/senior-citizen.entity';

export interface UnassignSeniorCitizenDialogData {
  seniorCitizen: SeniorCitizen;
}

@Component({
  selector: 'app-unassign-senior-citizen-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    TranslatePipe
  ],
  templateUrl: './unassign-senior-citizen-dialog.html',
  styleUrls: ['./unassign-senior-citizen-dialog.css']
})
export class UnassignSeniorCitizenDialog {
  constructor(
    public dialogRef: MatDialogRef<UnassignSeniorCitizenDialog>,
    @Inject(MAT_DIALOG_DATA) public data: UnassignSeniorCitizenDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}

