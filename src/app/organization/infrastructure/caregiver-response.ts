import { BaseResource, BaseResponse } from '../../shared/infrastructure/base-response';

/**
 * Represents the API resource/DTO for a caregiver
 * This interface matches the backend JSON format (camelCase) following learning-center-platform pattern
 */
export interface CaregiverResource extends BaseResource {
    organizationId: number;
    userId?: number | null;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    age?: number;
    email?: string;
    imageUrl?: string;
    assignedSeniorIds?: number[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
}

/**
 * Represents the API response structure for a List of caregivers
 */
export interface CaregiversResponse extends BaseResponse {
    caregivers: CaregiverResource[];
}

