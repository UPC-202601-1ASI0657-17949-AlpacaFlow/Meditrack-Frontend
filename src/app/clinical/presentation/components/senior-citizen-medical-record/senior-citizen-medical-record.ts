import { Component, Input, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { TranslatePipe } from '@ngx-translate/core';
import { ClinicalStore } from '../../../application/clinical.store';

@Component({
  selector: 'app-senior-citizen-medical-record',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatCardModule, TranslatePipe],
  templateUrl: './senior-citizen-medical-record.html',
  styleUrls: ['./senior-citizen-medical-record.css']
})
export class SeniorCitizenMedicalRecord implements OnInit {
  @Input() seniorCitizenId!: number;

  form: FormGroup;
  saved = false;

  constructor(
    private fb: FormBuilder,
    public store: ClinicalStore
  ) {
    this.form = this.fb.group({
      medicalHistoryDescription: [''],
      allergies: [''],
    });
    effect(() => {
      const record = this.store.medicalRecord();
      if (record) {
        this.form.patchValue({
          medicalHistoryDescription: record.medicalHistoryDescription,
          allergies: record.allergies,
        }, { emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    this.store.loadMedicalRecord(this.seniorCitizenId);
  }

  onSave(): void {
    if (this.form.valid) {
      this.store.saveMedicalRecord(this.seniorCitizenId, this.form.value);
      this.saved = true;
      setTimeout(() => this.saved = false, 2000);
    }
  }
}
