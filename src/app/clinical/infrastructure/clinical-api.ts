import { Injectable } from '@angular/core';
import { ClinicalApiEndpoint } from './clinical-api-endpoint';
import { MedicalRecord } from '../domain/model/medical-record.entity';
import { PatientThreshold } from '../domain/model/patient-threshold.entity';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ClinicalApi {
    constructor(private endpoint: ClinicalApiEndpoint) {}

    getMedicalRecord(seniorCitizenId: number): Observable<MedicalRecord | null> {
        return this.endpoint.getMedicalRecord(seniorCitizenId);
    }

    createMedicalRecord(data: { seniorCitizenId: number; medicalHistoryDescription: string; allergies: string }): Observable<MedicalRecord> {
        return this.endpoint.createMedicalRecord(data);
    }

    updateMedicalRecord(seniorCitizenId: number, data: { medicalHistoryDescription: string; allergies: string }): Observable<MedicalRecord> {
        return this.endpoint.updateMedicalRecord(seniorCitizenId, data);
    }

    getPatientThreshold(seniorCitizenId: number): Observable<PatientThreshold | null> {
        return this.endpoint.getPatientThreshold(seniorCitizenId);
    }

    createPatientThreshold(seniorCitizenId: number): Observable<PatientThreshold> {
        return this.endpoint.createPatientThreshold(seniorCitizenId);
    }

    updatePatientThreshold(seniorCitizenId: number, data: {
        minBpm: number; maxBpm: number; minSpo2: number; minCelsius: number; maxCelsius: number;
    }): Observable<PatientThreshold> {
        return this.endpoint.updatePatientThreshold(seniorCitizenId, data);
    }
}
