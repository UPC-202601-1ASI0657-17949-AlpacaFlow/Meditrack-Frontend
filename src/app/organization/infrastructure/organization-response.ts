import { BaseResource, BaseResponse } from '../../shared/infrastructure/base-response';

/**
 * Represents the API resource/DTO for an organization
 * This interface matches the backend JSON format (camelCase) following learning-center-platform pattern
 */
export interface OrganizationResource extends BaseResource {
    // id is inherited from BaseResource
    name: string;
    type: 'clinic' | 'resident'; // Backend and frontend both use 'clinic'
}

/**
 * Represents the API response structure for a List of organizations
 */
export interface OrganizationsResponse extends BaseResponse {
    organizations: OrganizationResource[];
}

