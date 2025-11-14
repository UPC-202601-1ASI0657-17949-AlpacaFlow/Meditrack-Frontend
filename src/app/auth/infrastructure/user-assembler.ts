import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { User } from '../domain/model/user.entity';
import { UserResource, UsersResponse } from './user-response';
import { CredentialsAssembler } from './credentials-assembler';

/**
 * Assembler for converting between User entities, UserResource resources, and UsersResponse.
 */
export class UserAssembler implements
    BaseAssembler<User, UserResource, UsersResponse> {

    private credentialsAssembler: CredentialsAssembler;

    constructor() {
        this.credentialsAssembler = new CredentialsAssembler();
    }

    /**
     * Converts a UsersResponse to an array of User entities.
     * @param response - The API response containing users.
     * @returns An array of User entities.
     */
    toEntitiesFromResponse(response: UsersResponse): User[] {
        return response.users.map(resource =>
            this.toEntityFromResource(resource as UserResource));
    }

    /**
     * Converts a UserResource to a User entity.
     * @param resource - The resource to convert.
     * @returns The converted User entity.
     */
    toEntityFromResource(resource: UserResource): User {
        return new User({
            id: resource.id,
            email: resource.email,
            role: resource.role,
            credentials: resource.credentials
                ? this.credentialsAssembler.toEntityFromResource(resource.credentials)
                : undefined
        });
    }

    /**
     * Converts a User entity to a UserResource.
     * @param entity - The entity to convert.
     * @returns The converted UserResource.
     */
    toResourceFromEntity(entity: User): UserResource {
        return {
            id: entity.id,
            email: entity.email,
            role: entity.role,
            credentials: entity.credentials
                ? this.credentialsAssembler.toResourceFromEntity(entity.credentials)
                : undefined
        } as UserResource;
    }
}

