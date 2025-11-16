import { BaseResource, BaseResponse } from '../../shared/infrastructure/base-response';

/**
 * Represents the API resource/DTO for credentials
 */
export interface CredentialsResource extends BaseResource {
    password: string;
    userId?: number;
}

/**
 * Represents the API response structure for a List of credentials
 */
export interface CredentialsResponse extends BaseResponse {
    credentials: CredentialsResource[];
}

