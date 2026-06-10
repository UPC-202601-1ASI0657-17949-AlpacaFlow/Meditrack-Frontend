import { Injectable, signal } from '@angular/core';
import { MedicalRecord } from '../domain/model/medical-record.entity';
import { PatientThreshold } from '../domain/model/patient-threshold.entity';
import { ClinicalApi } from '../infrastructure/clinical-api';
import { switchMap, take } from 'rxjs';

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

    private readonly loadedMedicalRecordSeniorIdSignal = signal<number | null>(null);
    private readonly loadedThresholdSeniorIdSignal = signal<number | null>(null);
    private medicalRecordRequestId = 0;
    private thresholdRequestId = 0;

    constructor(private clinicalApi: ClinicalApi) {}

    clear(): void {
        this.medicalRecordSignal.set(null);
        this.patientThresholdSignal.set(null);
        this.loadedMedicalRecordSeniorIdSignal.set(null);
        this.loadedThresholdSeniorIdSignal.set(null);
        this.medicalRecordLoadingSignal.set(false);
        this.patientThresholdLoadingSignal.set(false);
    }

    loadMedicalRecord(seniorCitizenId: number): void {
        if (!seniorCitizenId) return;
        const requestId = ++this.medicalRecordRequestId;
        this.medicalRecordLoadingSignal.set(true);
        this.medicalRecordSignal.set(null);
        this.loadedMedicalRecordSeniorIdSignal.set(null);
        this.clinicalApi.getMedicalRecord(seniorCitizenId).subscribe({
            next: (record) => {
                if (requestId !== this.medicalRecordRequestId) return;
                this.medicalRecordSignal.set(record);
                this.loadedMedicalRecordSeniorIdSignal.set(seniorCitizenId);
                this.medicalRecordLoadingSignal.set(false);
            },
            error: (err) => {
                if (requestId !== this.medicalRecordRequestId) return;
                console.error('Error loading medical record', err);
                this.medicalRecordSignal.set(null);
                this.loadedMedicalRecordSeniorIdSignal.set(seniorCitizenId);
                this.medicalRecordLoadingSignal.set(false);
            },
        });
    }

    saveMedicalRecord(seniorCitizenId: number, data: { medicalHistoryDescription: string; allergies: string }): void {
        const current = this.medicalRecordSignal();
        const hasExistingRecord = current
            && current.id > 0
            && current.seniorCitizenId === seniorCitizenId
            && this.loadedMedicalRecordSeniorIdSignal() === seniorCitizenId;
        const request = hasExistingRecord
            ? this.clinicalApi.updateMedicalRecord(seniorCitizenId, data)
            : this.clinicalApi.createMedicalRecord({ seniorCitizenId, ...data });
        request.pipe(take(1)).subscribe({
            next: (record) => {
                this.medicalRecordSignal.set(record);
                this.loadedMedicalRecordSeniorIdSignal.set(seniorCitizenId);
            },
            error: (err) => console.error('Error saving medical record', err),
        });
    }

    loadPatientThreshold(seniorCitizenId: number): void {
        if (!seniorCitizenId) return;
        const requestId = ++this.thresholdRequestId;
        this.patientThresholdLoadingSignal.set(true);
        this.patientThresholdSignal.set(null);
        this.loadedThresholdSeniorIdSignal.set(null);
        this.clinicalApi.getPatientThreshold(seniorCitizenId).subscribe({
            next: (threshold) => {
                if (requestId !== this.thresholdRequestId) return;
                this.patientThresholdSignal.set(threshold);
                this.loadedThresholdSeniorIdSignal.set(seniorCitizenId);
                this.patientThresholdLoadingSignal.set(false);
            },
            error: (err) => {
                if (requestId !== this.thresholdRequestId) return;
                console.error('Error loading patient threshold', err);
                this.patientThresholdSignal.set(null);
                this.loadedThresholdSeniorIdSignal.set(seniorCitizenId);
                this.patientThresholdLoadingSignal.set(false);
            },
        });
    }

    savePatientThreshold(seniorCitizenId: number, data: {
        minBpm: number; maxBpm: number; minSpo2: number; minCelsius: number; maxCelsius: number;
    }): void {
        const payload = {
            minBpm: Number(data.minBpm),
            maxBpm: Number(data.maxBpm),
            minSpo2: Number(data.minSpo2),
            minCelsius: Number(data.minCelsius),
            maxCelsius: Number(data.maxCelsius),
        };
        const current = this.patientThresholdSignal();
        const hasExistingThreshold = current
            && current.id > 0
            && current.seniorCitizenId === seniorCitizenId
            && this.loadedThresholdSeniorIdSignal() === seniorCitizenId;
        const request = hasExistingThreshold
            ? this.clinicalApi.updatePatientThreshold(seniorCitizenId, payload)
            : this.clinicalApi.createPatientThreshold(seniorCitizenId).pipe(
                switchMap(() => this.clinicalApi.updatePatientThreshold(seniorCitizenId, payload))
            );
        request.pipe(take(1)).subscribe({
            next: (threshold) => {
                this.patientThresholdSignal.set(threshold);
                this.loadedThresholdSeniorIdSignal.set(seniorCitizenId);
            },
            error: (err) => console.error('Error saving patient threshold', err),
        });
    }
}
