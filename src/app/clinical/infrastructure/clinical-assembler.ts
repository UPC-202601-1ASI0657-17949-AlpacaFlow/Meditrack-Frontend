import { MedicalRecord } from '../domain/model/medical-record.entity';
import { PatientThreshold } from '../domain/model/patient-threshold.entity';
import {
    MedicalRecordResource,
    MedicalRecordsResponse,
    PatientThresholdResource,
    PatientThresholdsResponse,
} from './clinical-response';

export class ClinicalAssembler {
    medicalRecordToEntity(resource: MedicalRecordResource): MedicalRecord {
        return new MedicalRecord({
            id: resource.id,
            medicalRecordNumber: resource.medicalRecordNumber,
            seniorCitizenId: resource.seniorCitizenId,
            medicalHistoryDescription: resource.medicalHistoryDescription,
            allergies: resource.allergies,
        });
    }

    medicalRecordToResource(entity: MedicalRecord): MedicalRecordResource {
        return {
            id: entity.id,
            medicalRecordNumber: entity.medicalRecordNumber,
            seniorCitizenId: entity.seniorCitizenId,
            medicalHistoryDescription: entity.medicalHistoryDescription,
            allergies: entity.allergies,
        };
    }

    patientThresholdToEntity(resource: PatientThresholdResource): PatientThreshold {
        return new PatientThreshold({
            id: resource.id,
            seniorCitizenId: resource.seniorCitizenId,
            minBpm: resource.minBpm,
            maxBpm: resource.maxBpm,
            minSpo2: resource.minSpo2,
            minCelsius: resource.minCelsius,
            maxCelsius: resource.maxCelsius,
        });
    }

    patientThresholdToResource(entity: PatientThreshold): PatientThresholdResource {
        return {
            id: entity.id,
            seniorCitizenId: entity.seniorCitizenId,
            minBpm: entity.minBpm,
            maxBpm: entity.maxBpm,
            minSpo2: entity.minSpo2,
            minCelsius: entity.minCelsius,
            maxCelsius: entity.maxCelsius,
        };
    }
}
