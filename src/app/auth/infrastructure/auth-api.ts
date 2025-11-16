import { Injectable } from '@angular/core';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../domain/model/user.entity';
import { Credentials } from '../domain/model/credentials.entity';
import { UserApiEndpoint } from './user-api-endpoint';
import { CredentialsApiEndpoint } from './credentials-api-endpoint';

/**
 * API service for managing authentication-related operations (users, credentials, login, register, etc.)
 * Acts as a facade that aggregates multiple endpoints following the same pattern as OrganizationApi.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthApi extends BaseApi {

  private readonly usersEndpoint: UserApiEndpoint;
  private readonly credentialsEndpoint: CredentialsApiEndpoint;

  constructor(http: HttpClient) {
    super();
    this.usersEndpoint = new UserApiEndpoint(http);
    this.credentialsEndpoint = new CredentialsApiEndpoint(http);
  }

  /**
   * Fetches all users from the API.
   * @returns An Observable emitting an array of User entities.
   */
  getUsers(): Observable<User[]> {
    return this.usersEndpoint.getAll();
  }

  /**
   * Fetches a user by its ID from the API.
   * @param id - The ID of the user to fetch.
   * @returns An Observable emitting the User entity or null if not found.
   */
  getUserById(id: number): Observable<User | null> {
    return this.usersEndpoint.getById(id);
  }

  /**
   * Fetches a user by email from the API.
   * @param email - The email of the user to fetch.
   * @returns An Observable emitting the User entity or null if not found.
   */
  getUserByEmail(email: string): Observable<User | null> {
    return this.usersEndpoint.getByEmail(email);
  }

  /**
   * Creates a new user via the API.
   * @param user - The User entity to create.
   * @returns An Observable emitting the created User entity.
   */
  createUser(user: User): Observable<User> {
    return this.usersEndpoint.create(user);
  }

  /**
   * Updates an existing user via the API.
   * @param user - The User entity to update.
   * @returns An Observable emitting the updated User entity.
   */
  updateUser(user: User): Observable<User> {
    return this.usersEndpoint.update(user, user.id);
  }

  /**
   * Deletes a user by its ID via the API.
   * @param id - The ID of the user to delete.
   * @returns An Observable emitting void upon successful deletion.
   */
  deleteUser(id: number): Observable<void> {
    return this.usersEndpoint.delete(id);
  }

  /**
   * Login - authenticates a user with email and password.
   * @param email - The user's email.
   * @param password - The user's password.
   * @returns An Observable emitting an object with token and user.
   */
  login(email: string, password: string): Observable<{ token: string; user: User }> {
    console.log('[AuthApi] Login called with:', { email, passwordLength: password?.length });
    return this.usersEndpoint.login(email, password);
  }

  /**
   * Register - registers a new user.
   * @param user - The User entity to register.
   * @param password - The user's password.
   * @param additionalData - Optional data for admin registration (firstName, lastName, organizationName, organizationType)
   * @returns An Observable emitting an object with token and user.
   */
  register(user: User, password: string, additionalData?: { 
    firstName?: string; 
    lastName?: string; 
    organizationName?: string; 
    organizationType?: string;
  }): Observable<{ token: string; user: User }> {
    return this.usersEndpoint.register(user, password, additionalData);
  }

  /**
   * Fetches all credentials from the API.
   * @returns An Observable emitting an array of Credentials entities.
   */
  getCredentials(): Observable<Credentials[]> {
    return this.credentialsEndpoint.getAll();
  }

  /**
   * Fetches credentials by ID from the API.
   * @param id - The ID of the credentials to fetch.
   * @returns An Observable emitting the Credentials entity or null if not found.
   */
  getCredentialsById(id: number): Observable<Credentials | null> {
    return this.credentialsEndpoint.getById(id);
  }

  /**
   * Fetches credentials by userId from the API.
   * @param userId - The user ID to search for.
   * @returns An Observable emitting the Credentials entity or null if not found.
   */
  getCredentialsByUserId(userId: number): Observable<Credentials | null> {
    return this.credentialsEndpoint.getByUserId(userId);
  }

  /**
   * Creates new credentials via the API.
   * @param credentials - The Credentials entity to create.
   * @returns An Observable emitting the created Credentials entity.
   */
  createCredentials(credentials: Credentials): Observable<Credentials> {
    return this.credentialsEndpoint.create(credentials);
  }

  /**
   * Updates existing credentials via the API.
   * @param credentials - The Credentials entity to update.
   * @returns An Observable emitting the updated Credentials entity.
   */
  updateCredentials(credentials: Credentials): Observable<Credentials> {
    return this.credentialsEndpoint.update(credentials, credentials.id);
  }

  /**
   * Deletes credentials by ID via the API.
   * @param id - The ID of the credentials to delete.
   * @returns An Observable emitting void upon successful deletion.
   */
  deleteCredentials(id: number): Observable<void> {
    return this.credentialsEndpoint.delete(id);
  }
}

