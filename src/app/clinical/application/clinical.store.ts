import { Injectable, signal } from '@angular/core';
import { MedicalRecord } from '../domain/model/medical-record.entity';
import { PatientThreshold } from '../domain/model/patient-threshold.entity';
import { ClinicalApi } from '../infrastructure/clinical-api';
import { Observable, catchError, switchMap, tap, throwError } from 'rxjs';

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
    readonly loadedMedicalRecordSeniorId = this.loadedMedicalRecordSeniorIdSignal.asReadonly();

    private readonly loadedThresholdSeniorIdSignal = signal<number | null>(null);
    readonly loadedThresholdSeniorId = this.loadedThresholdSeniorIdSignal.asReadonly();

    private medicalRecordRequestId = 0;
    private thresholdRequestId = 0;
    private loadingMedicalRecordSeniorId: number | null = null;
    private loadingThresholdSeniorId: number | null = null;

    constructor(private clinicalApi: ClinicalApi) {}

    clear(): void {
        this.medicalRecordSignal.set(null);
        this.patientThresholdSignal.set(null);
        this.loadedMedicalRecordSeniorIdSignal.set(null);
        this.loadedThresholdSeniorIdSignal.set(null);
        this.medicalRecordLoadingSignal.set(false);
        this.patientThresholdLoadingSignal.set(false);
        this.loadingMedicalRecordSeniorId = null;
        this.loadingThresholdSeniorId = null;
    }

    loadMedicalRecord(seniorCitizenId: number): void {
        if (!seniorCitizenId) return;
        if (this.loadingMedicalRecordSeniorId === seniorCitizenId) {
            return;
        }
        if (
            this.loadedMedicalRecordSeniorIdSignal() === seniorCitizenId
            && !this.medicalRecordLoadingSignal()
        ) {
            return;
        }
        const requestId = ++this.medicalRecordRequestId;
        this.loadingMedicalRecordSeniorId = seniorCitizenId;
        this.medicalRecordLoadingSignal.set(true);
        this.medicalRecordSignal.set(null);
        this.loadedMedicalRecordSeniorIdSignal.set(null);
        this.clinicalApi.getMedicalRecord(seniorCitizenId).subscribe({
            next: (record) => {
                if (requestId !== this.medicalRecordRequestId) return;
                this.medicalRecordSignal.set(record);
                this.loadedMedicalRecordSeniorIdSignal.set(seniorCitizenId);
                this.medicalRecordLoadingSignal.set(false);
                this.loadingMedicalRecordSeniorId = null;
            },
            error: (err) => {
                if (requestId !== this.medicalRecordRequestId) return;
                console.error('Error loading medical record', err);
                this.medicalRecordSignal.set(null);
                this.loadedMedicalRecordSeniorIdSignal.set(seniorCitizenId);
                this.medicalRecordLoadingSignal.set(false);
                this.loadingMedicalRecordSeniorId = null;
            },
        });
    }

    saveMedicalRecord(
        seniorCitizenId: number,
        data: { medicalHistoryDescription: string; allergies: string }
    ): Observable<MedicalRecord> {
        const update$ = this.clinicalApi.updateMedicalRecord(seniorCitizenId, data);
        const create$ = this.clinicalApi.createMedicalRecord({ seniorCitizenId, ...data });

        return update$.pipe(
            catchError(err => {
                if (err?.status === 404) {
                    return create$.pipe(
                        catchError(createErr => {
                            if (createErr?.status === 400) {
                                return update$;
                            }
                            return throwError(() => createErr);
                        })
                    );
                }
                return throwError(() => err);
            }),
            tap({
                next: (record) => {
                    this.medicalRecordSignal.set(record);
                    this.loadedMedicalRecordSeniorIdSignal.set(seniorCitizenId);
                },
                error: (err) => console.error('Error saving medical record', err),
            })
        );
    }

    loadPatientThreshold(seniorCitizenId: number): void {
        if (!seniorCitizenId) return;
        if (this.loadingThresholdSeniorId === seniorCitizenId) {
            return;
        }
        if (
            this.loadedThresholdSeniorIdSignal() === seniorCitizenId
            && !this.patientThresholdLoadingSignal()
        ) {
            return;
        }
        const requestId = ++this.thresholdRequestId;
        this.loadingThresholdSeniorId = seniorCitizenId;
        this.patientThresholdLoadingSignal.set(true);
        this.patientThresholdSignal.set(null);
        this.loadedThresholdSeniorIdSignal.set(null);
        this.clinicalApi.getPatientThreshold(seniorCitizenId).subscribe({
            next: (threshold) => {
                if (requestId !== this.thresholdRequestId) return;
                this.patientThresholdSignal.set(threshold);
                this.loadedThresholdSeniorIdSignal.set(seniorCitizenId);
                this.patientThresholdLoadingSignal.set(false);
                this.loadingThresholdSeniorId = null;
            },
            error: (err) => {
                if (requestId !== this.thresholdRequestId) return;
                console.error('Error loading patient threshold', err);
                this.patientThresholdSignal.set(null);
                this.loadedThresholdSeniorIdSignal.set(seniorCitizenId);
                this.patientThresholdLoadingSignal.set(false);
                this.loadingThresholdSeniorId = null;
            },
        });
    }

    savePatientThreshold(
        seniorCitizenId: number,
        data: {
            minBpm: number; maxBpm: number; minSpo2: number; minCelsius: number; maxCelsius: number;
        }
    ): Observable<PatientThreshold> {
        const payload = {
            minBpm: Number(data.minBpm),
            maxBpm: Number(data.maxBpm),
            minSpo2: Number(data.minSpo2),
            minCelsius: Number(data.minCelsius),
            maxCelsius: Number(data.maxCelsius),
        };

        const update$ = this.clinicalApi.updatePatientThreshold(seniorCitizenId, payload);
        const createThenUpdate$ = this.clinicalApi.createPatientThreshold(seniorCitizenId).pipe(
            switchMap(() => this.clinicalApi.updatePatientThreshold(seniorCitizenId, payload))
        );

        return update$.pipe(
            catchError(err => {
                if (err?.status === 404) {
                    return createThenUpdate$.pipe(
                        catchError(createErr => {
                            if (createErr?.status === 400) {
                                return update$;
                            }
                            return throwError(() => createErr);
                        })
                    );
                }
                return throwError(() => err);
            }),
            tap({
                next: (threshold) => {
                    this.patientThresholdSignal.set(threshold);
                    this.loadedThresholdSeniorIdSignal.set(seniorCitizenId);
                },
                error: (err) => console.error('Error saving patient threshold', err),
            })
        );
    }
}
