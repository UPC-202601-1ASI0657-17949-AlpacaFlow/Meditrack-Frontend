import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SeniorCitizen } from '../domain/model/senior-citizen.entity';
import { SeniorCitizenResource } from './senior-citizen-response';
import { SeniorCitizensAssembler } from './senior-citizen-assembler';

/**
 * Resource for assigning a senior citizen to a caregiver
 * Must match the backend AssignSeniorCitizenToCaregiverResource record:
 * - seniorCitizenId: Long
 * - caregiverId: Long
 */
export interface AssignSeniorCitizenToCaregiverResource {
  seniorCitizenId: number;
  caregiverId: number;
}

/**
 * API endpoint for managing caregiver assignments.
 */
@Injectable({
  providedIn: 'root'
})
export class CaregiverAssignmentApiEndpoint {
  private readonly endpointUrl = `${environment.platformProviderApiBaseUrl}/api/v1/caregiver-assignments`;
  private readonly assembler = new SeniorCitizensAssembler();

  constructor(private http: HttpClient) {}

  /**
   * Assigns a senior citizen to a caregiver
   * @param caregiverId - The caregiver ID
   * @param seniorCitizenId - The senior citizen ID
   * @returns An Observable emitting the updated SeniorCitizen entity
   */
  assignSeniorCitizenToCaregiver(caregiverId: number, seniorCitizenId: number): Observable<SeniorCitizen> {
    const url = `${this.endpointUrl}`;
    // Backend expects: seniorCitizenId first, then caregiverId (camelCase)
    const resource: AssignSeniorCitizenToCaregiverResource = {
      seniorCitizenId,
      caregiverId
    };
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    console.log(`[API] Assigning senior citizen ${seniorCitizenId} to caregiver ${caregiverId} at: ${url}`);
    console.log(`[API] Request body:`, JSON.stringify(resource));
    
    return this.http.post<SeniorCitizenResource>(url, resource, { headers }).pipe(
      map(response => {
        console.log(`[API] Assignment response from server:`, response);
        const entity = this.assembler.toEntityFromResource(response);
        console.log(`[API] Transformed entity:`, entity);
        return entity;
      }),
      catchError(error => {
        const errorMessage = error?.error || error?.message || 'Unknown error';
        const errorDetails = {
          status: error?.status,
          statusText: error?.statusText,
          message: error?.message,
          error: error?.error,
          errorBody: typeof error?.error === 'string' ? error.error : (error?.error ? JSON.stringify(error.error) : 'No error body'),
          url: error?.url
        };
        
        console.error(`[API] Error assigning senior citizen to caregiver:`, error);
        console.error(`[API] Error details:`, errorDetails);
        console.error(`[API] Error message from backend:`, errorMessage);
        
        // Log the request that was sent
        console.error(`[API] Request that failed:`, {
          url: url,
          method: 'POST',
          body: JSON.stringify(resource),
          caregiverId,
          seniorCitizenId
        });
        
        // Create a more informative error
        const enhancedError = new Error(`Failed to assign senior citizen ${seniorCitizenId} to caregiver ${caregiverId}: ${errorMessage}`);
        (enhancedError as any).status = error?.status;
        (enhancedError as any).error = error?.error;
        return throwError(() => enhancedError);
      })
    );
  }

  /**
   * Unassigns a senior citizen from a caregiver
   * @param caregiverId - The caregiver ID
   * @param seniorCitizenId - The senior citizen ID
   * @returns An Observable that completes when the unassignment is successful
   */
  unassignSeniorCitizenFromCaregiver(caregiverId: number, seniorCitizenId: number): Observable<void> {
    const url = `${this.endpointUrl}/caregivers/${caregiverId}/senior-citizens/${seniorCitizenId}`;
    
    console.log(`[API] Unassigning senior citizen ${seniorCitizenId} from caregiver ${caregiverId} at: ${url}`);
    
    return this.http.delete<void>(url).pipe(
      map(() => {
        console.log(`[API] Successfully unassigned senior citizen ${seniorCitizenId} from caregiver ${caregiverId}`);
      })
    );
  }

  /**
   * Gets all senior citizens assigned to a caregiver
   * @param caregiverId - The caregiver ID
   * @returns An Observable emitting an array of SeniorCitizen entities
   */
  getSeniorCitizensByCaregiverId(caregiverId: number): Observable<SeniorCitizen[]> {
    const url = `${this.endpointUrl}/caregivers/${caregiverId}/senior-citizens`;
    
    console.log(`[API] Requesting senior citizens for caregiver ${caregiverId} from: ${url}`);
    
    return this.http.get<SeniorCitizenResource[]>(url).pipe(
      map(response => {
        console.log(`[API] Raw response from server:`, response);
        const entities = response.map(resource => this.assembler.toEntityFromResource(resource));
        console.log(`[API] Transformed entities:`, entities);
        return entities;
      })
    );
  }
}

