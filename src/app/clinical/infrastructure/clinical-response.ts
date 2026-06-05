import { BaseResource, BaseResponse } from '../../shared/infrastructure/base-response';

export interface MedicalRecordResource extends BaseResource {
    medicalRecordNumber: string;
    seniorCitizenId: number;
    medicalHistoryDescription: string;
    allergies: string;
}

export interface MedicalRecordsResponse extends BaseResponse {
    medicalRecords: MedicalRecordResource[];
}

export interface PatientThresholdResource extends BaseResource {
    seniorCitizenId: number;
    minBpm: number;
    maxBpm: number;
    minSpo2: number;
    minCelsius: number;
    maxCelsius: number;
}

export interface PatientThresholdsResponse extends BaseResponse {
    patientThresholds: PatientThresholdResource[];
}
