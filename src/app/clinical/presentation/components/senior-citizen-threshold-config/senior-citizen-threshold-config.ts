import { Component, Input, OnInit, OnChanges, SimpleChanges, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { TranslatePipe } from '@ngx-translate/core';
import { ClinicalStore } from '../../../application/clinical.store';

const DEFAULT_THRESHOLDS = {
  minBpm: 60,
  maxBpm: 100,
  minSpo2: 90,
  minCelsius: 36.0,
  maxCelsius: 37.5,
};

@Component({
  selector: 'app-senior-citizen-threshold-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatCardModule, TranslatePipe],
  templateUrl: './senior-citizen-threshold-config.html',
  styleUrls: ['./senior-citizen-threshold-config.css']
})
export class SeniorCitizenThresholdConfig implements OnInit, OnChanges {
  @Input() seniorCitizenId!: number;

  form: FormGroup;
  saved = false;

  constructor(
    private fb: FormBuilder,
    public store: ClinicalStore
  ) {
    this.form = this.fb.group({
      minBpm: [DEFAULT_THRESHOLDS.minBpm, [Validators.required, Validators.min(30), Validators.max(200)]],
      maxBpm: [DEFAULT_THRESHOLDS.maxBpm, [Validators.required, Validators.min(30), Validators.max(220)]],
      minSpo2: [DEFAULT_THRESHOLDS.minSpo2, [Validators.required, Validators.min(50), Validators.max(100)]],
      minCelsius: [DEFAULT_THRESHOLDS.minCelsius, [Validators.required, Validators.min(34), Validators.max(42)]],
      maxCelsius: [DEFAULT_THRESHOLDS.maxCelsius, [Validators.required, Validators.min(34), Validators.max(43)]],
    });
    effect(() => {
      const threshold = this.store.patientThreshold();
      if (threshold && threshold.seniorCitizenId === this.seniorCitizenId) {
        this.form.patchValue({
          minBpm: threshold.minBpm,
          maxBpm: threshold.maxBpm,
          minSpo2: threshold.minSpo2,
          minCelsius: threshold.minCelsius,
          maxCelsius: threshold.maxCelsius,
        }, { emitEvent: false });
      } else if (!this.store.patientThresholdLoading() && this.store.patientThreshold() === null) {
        this.resetForm();
      }
    });
  }

  ngOnInit(): void {
    this.loadForCurrentSenior();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['seniorCitizenId'] && !changes['seniorCitizenId'].firstChange) {
      this.loadForCurrentSenior();
    }
  }

  private loadForCurrentSenior(): void {
    this.resetForm();
    if (this.seniorCitizenId) {
      this.store.loadPatientThreshold(this.seniorCitizenId);
    }
  }

  private resetForm(): void {
    this.form.reset(DEFAULT_THRESHOLDS, { emitEvent: false });
  }

  onSave(): void {
    if (this.form.valid) {
      const data = {
        minBpm: Number(this.form.value.minBpm),
        maxBpm: Number(this.form.value.maxBpm),
        minSpo2: Number(this.form.value.minSpo2),
        minCelsius: Number(this.form.value.minCelsius),
        maxCelsius: Number(this.form.value.maxCelsius),
      };
      this.store.savePatientThreshold(this.seniorCitizenId, data);
      this.saved = true;
      setTimeout(() => this.saved = false, 2000);
    }
  }
}
