import { BaseResource, BaseResponse } from '../../shared/infrastructure/base-response';

/**
 * Represents the API resource/DTO for an admin
 * This interface matches the backend JSON format (camelCase) following learning-center-platform pattern
 */
export interface AdminResource extends BaseResource {
    // id is inherited from BaseResource
    organizationId: number;
    userId: number | null; // Changed from string to number | null to match backend
    firstName: string;
    lastName: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}

/**
 * Represents the API response structure for a List of admins
 */
export interface AdminsResponse extends BaseResponse {
    admins: AdminResource[];
}

