import { BaseResource, BaseResponse } from '../../shared/infrastructure/base-response';

/**
 * Represents the API resource/DTO for a doctor
 * This interface matches the backend JSON format (camelCase) following learning-center-platform pattern
 */
export interface DoctorResource extends BaseResource {
    organizationId: number;
    userId?: number | null;
    firstName: string;
    lastName: string;
    specialty: string;
    age?: number;
    email?: string;
    phoneNumber?: string;
    imageUrl?: string;
    assignedSeniorIds?: number[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
}

/**
 * Represents the API response structure for a List of doctors
 */
export interface DoctorsResponse extends BaseResponse {
    doctors: DoctorResource[];
}
