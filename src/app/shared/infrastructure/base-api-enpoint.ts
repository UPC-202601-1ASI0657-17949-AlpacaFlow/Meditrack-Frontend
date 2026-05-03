import {BaseEntity} from './base-entity';
import {BaseResource, BaseResponse} from './base-response';
import {BaseAssembler} from './base-assembler';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {catchError, map, Observable, throwError} from 'rxjs';

/**
 * Base class for API endpoint operations with generic CRUD functionality.
 * @template TEntity - The entity type (e.g., Course), must extend BaseEntity
 * @template TResource - The resource type, must extend BaseResource
 * @template TResponse - The response type, must extend BaseResponse
 */
export abstract class BaseApiEndpoint<
  TEntity extends BaseEntity,
  TResource extends BaseResource,
  TResponse extends BaseResponse,
  TAssembler extends BaseAssembler<TEntity, TResource, TResponse>
  > {

  constructor(protected http: HttpClient,
              protected endpointUrl: string,
              protected assembler: TAssembler) {
  }

  /**
   * Retrieves all model from the API, handling both response objects and arrays.
   * @returns An Observable for an array of model.
   */
  getAll(): Observable<TEntity[]> {
    return this.http.get<TResponse | TResource[]>(this.endpointUrl).pipe(
      map(response =>{
       if (Array.isArray(response)) {
         return response.map(resource => this.assembler
           .toEntityFromResource(resource));
       }
       return this.assembler.toEntitiesFromResponse(response as TResponse);
      }),
      catchError(this.handleError('Failed to fetch model'))
    );
  }

  /**
   * Handles HTTP errors and returns a user-friendly error message.
   * @param operation - The operation that failed.
   * @returns A function that transforms an error into an Observable.
   */
  protected handleError(operation: string) {
    return (error: HttpErrorResponse): Observable<never> =>{
      console.error(`[BaseApiEndpoint] ${operation} - Error details:`, {
        status: error.status,
        statusText: error.statusText,
        message: error.message,
        error: error.error,
        url: error.url,
        headers: error.headers
      });
      
      let errorMessage = operation;
      if (error.status === 404) {
        errorMessage = `${operation}: Resource not found`;
      } else if (error.status === 401 || error.status === 403) {
        errorMessage = `${operation}: Authentication failed. Please log in again.`;
      } else if (error.status === 400) {
        // Try to extract a more specific error message from the backend
        const backendMessage = error.error?.message || error.error?.error || error.error;
        if (typeof backendMessage === 'string') {
          errorMessage = `${operation}: ${backendMessage}`;
        } else if (backendMessage && typeof backendMessage === 'object') {
          // Try to extract message from nested error object
          const nestedMessage = backendMessage.message || backendMessage.error || JSON.stringify(backendMessage);
          errorMessage = `${operation}: ${nestedMessage}`;
        } else {
          errorMessage = `${operation}: Invalid data. Please check all fields are correct.`;
        }
      } else if (error.status === 409) {
        const backendMessage =
          typeof error.error === 'string' ? error.error : error.error?.message || error.error?.error;
        errorMessage = `${operation}: ${typeof backendMessage === 'string' ? backendMessage : 'Conflict'}`;
      } else if (error.status === 500) {
        const backendMessage = error.error?.message || error.error?.error || error.error;
        errorMessage = `${operation}: Server error. ${typeof backendMessage === 'string' ? backendMessage : 'Please try again later.'}`;
      } else if (error.error instanceof ErrorEvent) {
        errorMessage = `${operation}: ${error.error.message}`;
      } else if (error.error?.message) {
        errorMessage = `${operation}: ${error.error.message}`;
      } else {
        errorMessage = `${operation}: ${error.statusText || error.message || 'Unexpected error'}`;
      }
      return  throwError(()=> new Error(errorMessage));
    };
  }

  /**
   * Retrieves a single entity by ID
   * @param id - The ID of the entity
   * @returns An Observable of the entity.
   */
  getById(id: number): Observable<TEntity> {
    return this.http.get<TResource>(this.endpointUrl + '/' + id).pipe(
      map(resource => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to fetch entity'))
    );
  }

  /**
   * Creates a new Entity
   * @param entity - The entity to create
   * @returns An Observable of the created entity.
   */
  create(entity: TEntity): Observable<TEntity> {
    const resource = this.assembler.toResourceFromEntity(entity);
    return this.http.post<TResource>(this.endpointUrl, resource).pipe(
      map(created => this.assembler.toEntityFromResource(created)),
      catchError(this.handleError('Failed to create entity'))
    );
  }

  /**
   * Deletes an entity by ID
   * @param id - The ID of the entity to delete
   * @returns An Observable of void.
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(this.endpointUrl + '/' + id).pipe(
      catchError(this.handleError('Failed to fetch entity'))
    );
  }

  /**
   * Update an existing entity
   * @param entity - The entity to update
   * @param id - The ID of the entity
   * @returns An Observable of the updated entity.
   */
  update(entity: TEntity, id: number): Observable<TEntity> {
    const resource = this.assembler.toResourceFromEntity(entity);
    return this.http.put<TResource>(this.endpointUrl + '/' + id, resource).pipe(
      map(updated => this.assembler.toEntityFromResource(updated)),
      catchError(this.handleError('Failed to update entity'))
    );
  }

}
