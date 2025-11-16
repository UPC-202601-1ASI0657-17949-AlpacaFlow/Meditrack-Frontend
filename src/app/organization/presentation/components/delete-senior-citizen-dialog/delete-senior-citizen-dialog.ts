import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { SeniorCitizen } from '../../../domain/model/senior-citizen.entity';

export interface DeleteSeniorCitizenDialogData {
  seniorCitizen: SeniorCitizen;
}

@Component({
  selector: 'app-delete-senior-citizen-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    TranslatePipe
  ],
  templateUrl: './delete-senior-citizen-dialog.html',
  styleUrls: ['./delete-senior-citizen-dialog.css']
})
export class DeleteSeniorCitizenDialog {
  constructor(
    public dialogRef: MatDialogRef<DeleteSeniorCitizenDialog>,
    @Inject(MAT_DIALOG_DATA) public data: DeleteSeniorCitizenDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
