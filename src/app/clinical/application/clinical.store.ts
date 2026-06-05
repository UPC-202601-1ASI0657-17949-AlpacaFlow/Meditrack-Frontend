import { Injectable, signal } from '@angular/core';
import { MedicalRecord } from '../domain/model/medical-record.entity';
import { PatientThreshold } from '../domain/model/patient-threshold.entity';
import { ClinicalApi } from '../infrastructure/clinical-api';
import { take } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ClinicalStore {
    private readonly medicalRecordSignal = signal<MedicalRecord | null>(null);
    readonly medicalRecord = this.medicalRecordSignal.asReadonly();

    private readonly medicalRecordLoadingSignal = signal(false);
    readonly medicalRecordLoading = this.medicalRecordLoadingSignal.asReadonly();

    private readonly patientThresholdSignal = signal<PatientThreshold | null>(null);
    readonly patientThreshold = this.patientThresholdSignal.asReadonly();

    private readonly patientThresholdLoadingSignal = signal(false);
    readonly patientThresholdLoading = this.patientThresholdLoadingSignal.asReadonly();

    constructor(private clinicalApi: ClinicalApi) {}

    loadMedicalRecord(seniorCitizenId: number): void {
        if (!seniorCitizenId) return;
        this.medicalRecordLoadingSignal.set(true);
        this.clinicalApi.getMedicalRecord(seniorCitizenId).subscribe({
            next: (record) => this.medicalRecordSignal.set(record),
            error: () => this.medicalRecordSignal.set(null),
            complete: () => this.medicalRecordLoadingSignal.set(false),
        });
    }

    saveMedicalRecord(seniorCitizenId: number, data: { medicalHistoryDescription: string; allergies: string }): void {
        const current = this.medicalRecordSignal();
        const request = current && current.id > 0
            ? this.clinicalApi.updateMedicalRecord(seniorCitizenId, data)
            : this.clinicalApi.createMedicalRecord({ seniorCitizenId, ...data });
        request.pipe(take(1)).subscribe({
            next: (record) => this.medicalRecordSignal.set(record),
            error: (err) => console.error('Error saving medical record', err),
        });
    }

    loadPatientThreshold(seniorCitizenId: number): void {
        if (!seniorCitizenId) return;
        this.patientThresholdLoadingSignal.set(true);
        this.clinicalApi.getPatientThreshold(seniorCitizenId).subscribe({
            next: (threshold) => this.patientThresholdSignal.set(threshold),
            error: () => this.patientThresholdSignal.set(null),
            complete: () => this.patientThresholdLoadingSignal.set(false),
        });
    }

    savePatientThreshold(seniorCitizenId: number, data: {
        minBpm: number; maxBpm: number; minSpo2: number; minCelsius: number; maxCelsius: number;
    }): void {
        const current = this.patientThresholdSignal();
        const request = current && current.id > 0
            ? this.clinicalApi.updatePatientThreshold(seniorCitizenId, data)
            : this.clinicalApi.createPatientThreshold(seniorCitizenId);
        request.pipe(take(1)).subscribe({
            next: (threshold) => this.patientThresholdSignal.set(threshold),
            error: (err) => console.error('Error saving patient threshold', err),
        });
    }
}
