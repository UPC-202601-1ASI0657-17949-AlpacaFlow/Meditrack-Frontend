import { Component, effect, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { TranslatePipe } from '@ngx-translate/core';
import { ClinicalStore } from '../../../application/clinical.store';
import { take } from 'rxjs';

@Component({
  selector: 'app-senior-citizen-medical-record',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatCardModule, TranslatePipe],
  templateUrl: './senior-citizen-medical-record.html',
  styleUrls: ['./senior-citizen-medical-record.css']
})
export class SeniorCitizenMedicalRecord {
  readonly seniorCitizenId = input.required<number>();

  form: FormGroup;
  saved = false;
  saveError = false;
  saving = false;

  constructor(
    private fb: FormBuilder,
    public store: ClinicalStore
  ) {
    this.form = this.fb.group({
      medicalHistoryDescription: [''],
      allergies: [''],
    });

    effect(() => {
      const id = Number(this.seniorCitizenId());
      if (!id) return;
      this.store.loadMedicalRecord(id);
    });

    effect(() => {
      this.syncFormFromStore();
    });
  }

  private syncFormFromStore(): void {
    const id = Number(this.seniorCitizenId());
    if (!id) return;

    const record = this.store.medicalRecord();
    const loading = this.store.medicalRecordLoading();
    const loadedForId = Number(this.store.loadedMedicalRecordSeniorId());

    if (loading && loadedForId !== id) {
      return;
    }

    if (record && Number(record.seniorCitizenId) === id) {
      this.form.patchValue({
        medicalHistoryDescription: record.medicalHistoryDescription,
        allergies: record.allergies,
      }, { emitEvent: false });
      return;
    }

    if (!loading && loadedForId === id && !record) {
      this.resetForm();
    }
  }

  private resetForm(): void {
    this.form.reset({
      medicalHistoryDescription: '',
      allergies: '',
    }, { emitEvent: false });
  }

  onSave(): void {
    if (!this.form.valid || this.saving) {
      return;
    }

    this.saving = true;
    this.saveError = false;
    this.saved = false;

    this.store.saveMedicalRecord(this.seniorCitizenId(), this.form.value).pipe(take(1)).subscribe({
      next: () => {
        this.saving = false;
        this.saved = true;
        setTimeout(() => this.saved = false, 2000);
      },
      error: () => {
        this.saving = false;
        this.saveError = true;
      },
    });
  }
}
