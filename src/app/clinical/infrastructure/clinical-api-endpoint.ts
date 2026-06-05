import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MedicalRecord } from '../domain/model/medical-record.entity';
import { PatientThreshold } from '../domain/model/patient-threshold.entity';
import { ClinicalAssembler } from './clinical-assembler';
import { MedicalRecordResource, PatientThresholdResource } from './clinical-response';
import { Observable, map, catchError, throwError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ClinicalApiEndpoint {
    private readonly baseUrl: string;
    private readonly assembler = new ClinicalAssembler();

    constructor(private http: HttpClient) {
        this.baseUrl = environment.platformProviderClinicalBaseUrl;
    }

    getMedicalRecord(seniorCitizenId: number): Observable<MedicalRecord | null> {
        return this.http.get<MedicalRecordResource>(`${this.baseUrl}/api/v1/medical-records/senior-citizen/${seniorCitizenId}`).pipe(
            map(r => this.assembler.medicalRecordToEntity(r)),
            catchError(err => err.status === 404 ? throwError(() => null) : throwError(() => new Error('Error loading medical record')))
        );
    }

    createMedicalRecord(data: { seniorCitizenId: number; medicalHistoryDescription: string; allergies: string }): Observable<MedicalRecord> {
        return this.http.post<MedicalRecordResource>(`${this.baseUrl}/api/v1/medical-records`, data).pipe(
            map(r => this.assembler.medicalRecordToEntity(r))
        );
    }

    updateMedicalRecord(seniorCitizenId: number, data: { medicalHistoryDescription: string; allergies: string }): Observable<MedicalRecord> {
        return this.http.put<MedicalRecordResource>(`${this.baseUrl}/api/v1/medical-records/senior-citizen/${seniorCitizenId}`, data).pipe(
            map(r => this.assembler.medicalRecordToEntity(r))
        );
    }

    getPatientThreshold(seniorCitizenId: number): Observable<PatientThreshold | null> {
        return this.http.get<PatientThresholdResource>(`${this.baseUrl}/api/v1/patient-thresholds/senior-citizen/${seniorCitizenId}`).pipe(
            map(r => this.assembler.patientThresholdToEntity(r)),
            catchError(err => err.status === 404 ? throwError(() => null) : throwError(() => new Error('Error loading patient thresholds')))
        );
    }

    createPatientThreshold(seniorCitizenId: number): Observable<PatientThreshold> {
        return this.http.post<PatientThresholdResource>(`${this.baseUrl}/api/v1/patient-thresholds`, { seniorCitizenId }).pipe(
            map(r => this.assembler.patientThresholdToEntity(r))
        );
    }

    updatePatientThreshold(seniorCitizenId: number, data: {
        minBpm: number; maxBpm: number; minSpo2: number; minCelsius: number; maxCelsius: number;
    }): Observable<PatientThreshold> {
        return this.http.put<PatientThresholdResource>(`${this.baseUrl}/api/v1/patient-thresholds/senior-citizen/${seniorCitizenId}`, data).pipe(
            map(r => this.assembler.patientThresholdToEntity(r))
        );
    }
}
