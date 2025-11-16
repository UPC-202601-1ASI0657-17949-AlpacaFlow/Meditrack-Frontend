import { BaseResource, BaseResponse } from '../../shared/infrastructure/base-response';
import { CredentialsResource } from './credentials-response';

/**
 * Represents the API resource/DTO for a user
 */
export interface UserResource extends BaseResource {
    email: string;
    role: string | null;
    credentials?: CredentialsResource;
}

/**
 * Represents the API response structure for a List of users
 */
export interface UsersResponse extends BaseResponse {
    users: UserResource[];
}

