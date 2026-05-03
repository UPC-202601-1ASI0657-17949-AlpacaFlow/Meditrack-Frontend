import { BaseResource, BaseResponse } from '../../shared/infrastructure/base-response';

/**
 * Represents the API resource/DTO for a senior citizen
 * This interface matches the backend JSON format (camelCase) following learning-center-platform pattern
 */
export interface SeniorCitizenResource extends BaseResource {
    organizationId: number;
    firstName: string;
    lastName: string;
    birthDate: string | Date;
    age?: number;
    gender: string;
    weight: number;
    dni: string;
    height: number;
    imageUrl: string;
    deviceId: number;
    assignedDoctorId?: number | null;
    assignedCaregiverId?: number | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    signalVitals?: {
        heartRate?: number[];
        temperature?: number[];
        oxygenLevel?: { ox: number }[];
    };
    alerts?: Array<{
        id: number | null;
        alertTitle: string;
        date: string;
        time: string;
        dataRegistered: string;
        reason: string;
    }>;
}

/**
 * Represents the API response structure for a List of senior citizens
 */
export interface SeniorCitizensResponse extends BaseResponse {
    seniorCitizens: SeniorCitizenResource[];
}

