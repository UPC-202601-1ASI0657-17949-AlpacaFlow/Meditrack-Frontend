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
 * Resource for assigning a senior citizen to a doctor
 * Must match the backend AssignSeniorCitizenToDoctorResource record:
 * - seniorCitizenId: Long
 * - doctorId: Long
 */
export interface AssignSeniorCitizenToDoctorResource {
  seniorCitizenId: number;
  doctorId: number;
}

/**
 * API endpoint for managing doctor assignments.
 */
@Injectable({
  providedIn: 'root'
})
export class DoctorAssignmentApiEndpoint {
  private readonly endpointUrl = `${environment.platformProviderApiBaseUrl}/api/v1/doctor-assignments`;
  private readonly assembler = new SeniorCitizensAssembler();

  constructor(private http: HttpClient) {}

  /**
   * Assigns a senior citizen to a doctor
   * @param doctorId - The doctor ID
   * @param seniorCitizenId - The senior citizen ID
   * @returns An Observable emitting the assignment response (contains seniorCitizenId, doctorId, and id)
   */
  assignSeniorCitizenToDoctor(doctorId: number, seniorCitizenId: number): Observable<AssignSeniorCitizenToDoctorResource & { id: number }> {
    const url = `${this.endpointUrl}`;
    // Backend expects: seniorCitizenId first, then doctorId (camelCase)
    const resource: AssignSeniorCitizenToDoctorResource = {
      seniorCitizenId,
      doctorId
    };
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    console.log(`[API] Assigning senior citizen ${seniorCitizenId} to doctor ${doctorId} at: ${url}`);
    console.log(`[API] Request body:`, JSON.stringify(resource));
    
    // The response from json-server will be the assignment object with an id
    return this.http.post<AssignSeniorCitizenToDoctorResource & { id: number }>(url, resource, { headers }).pipe(
      map(response => {
        console.log(`[API] Assignment response from server:`, response);
        // Return the assignment response directly (not transformed as SeniorCitizen)
        return response;
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
        
        console.error(`[API] Error assigning senior citizen to doctor:`, error);
        console.error(`[API] Error details:`, errorDetails);
        console.error(`[API] Error message from backend:`, errorMessage);
        
        // Log the request that was sent
        console.error(`[API] Request that failed:`, {
          url: url,
          method: 'POST',
          body: JSON.stringify(resource),
          doctorId,
          seniorCitizenId
        });
        
        // Create a more informative error
        const enhancedError = new Error(`Failed to assign senior citizen ${seniorCitizenId} to doctor ${doctorId}: ${errorMessage}`);
        (enhancedError as any).status = error?.status;
        (enhancedError as any).error = error?.error;
        return throwError(() => enhancedError);
      })
    );
  }

  /**
   * Unassigns a senior citizen from a doctor
   * @param doctorId - The doctor ID
   * @param seniorCitizenId - The senior citizen ID
   * @returns An Observable that completes when the unassignment is successful
   */
  unassignSeniorCitizenFromDoctor(doctorId: number, seniorCitizenId: number): Observable<void> {
    const url = `${this.endpointUrl}/doctors/${doctorId}/senior-citizens/${seniorCitizenId}`;
    
    console.log(`[API] Unassigning senior citizen ${seniorCitizenId} from doctor ${doctorId} at: ${url}`);
    
    return this.http.delete<void>(url).pipe(
      map(() => {
        console.log(`[API] Successfully unassigned senior citizen ${seniorCitizenId} from doctor ${doctorId}`);
      })
    );
  }

  /**
   * Gets all senior citizens assigned to a doctor
   * @param doctorId - The doctor ID
   * @returns An Observable emitting an array of SeniorCitizen entities
   */
  getSeniorCitizensByDoctorId(doctorId: number): Observable<SeniorCitizen[]> {
    const url = `${this.endpointUrl}/doctors/${doctorId}/senior-citizens`;
    
    console.log(`[API] Requesting senior citizens for doctor ${doctorId} from: ${url}`);
    
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

