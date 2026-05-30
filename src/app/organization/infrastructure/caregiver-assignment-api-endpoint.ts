import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SeniorCitizen } from '../domain/model/senior-citizen.entity';
import { SeniorCitizenResource } from './senior-citizen-response';
import { SeniorCitizensAssembler } from './senior-citizen-assembler';

/**
 * API endpoint for caregiver ↔ senior citizen assignments.
 * Uses organization microservice routes under /api/v1/senior-citizens.
 */
@Injectable({
  providedIn: 'root'
})
export class CaregiverAssignmentApiEndpoint {
  private readonly basePath = `${environment.platformProviderApiBaseUrl}${environment.platformProviderSeniorCitizensEndpointPath}`;
  private readonly assembler = new SeniorCitizensAssembler();

  constructor(private http: HttpClient) {}

  /**
   * Assigns a senior citizen to a caregiver.
   * POST /api/v1/senior-citizens/{seniorCitizenId}/assignments/caregiver/{caregiverId}
   */
  assignSeniorCitizenToCaregiver(caregiverId: number, seniorCitizenId: number): Observable<SeniorCitizen> {
    const url = `${this.basePath}/${seniorCitizenId}/assignments/caregiver/${caregiverId}`;

    console.log(`[API] Assigning senior citizen ${seniorCitizenId} to caregiver ${caregiverId} at: ${url}`);

    return this.http.post<SeniorCitizenResource>(url, {}).pipe(
      map(response => {
        console.log(`[API] Assignment response from server:`, response);
        return this.assembler.toEntityFromResource(response);
      }),
      catchError(error => {
        const errorMessage = error?.error || error?.message || 'Unknown error';
        console.error(`[API] Error assigning senior citizen to caregiver:`, error);
        const enhancedError = new Error(
          `Failed to assign senior citizen ${seniorCitizenId} to caregiver ${caregiverId}: ${errorMessage}`
        );
        (enhancedError as any).status = error?.status;
        (enhancedError as any).error = error?.error;
        return throwError(() => enhancedError);
      })
    );
  }

  /**
   * Unassigns a senior citizen from a caregiver.
   * DELETE /api/v1/senior-citizens/{seniorCitizenId}/assignments/caregiver/{caregiverId}
   */
  unassignSeniorCitizenFromCaregiver(caregiverId: number, seniorCitizenId: number): Observable<void> {
    const url = `${this.basePath}/${seniorCitizenId}/assignments/caregiver/${caregiverId}`;

    console.log(`[API] Unassigning senior citizen ${seniorCitizenId} from caregiver ${caregiverId} at: ${url}`);

    return this.http.delete<SeniorCitizenResource>(url).pipe(
      map(() => {
        console.log(`[API] Successfully unassigned senior citizen ${seniorCitizenId} from caregiver ${caregiverId}`);
      })
    );
  }

  /**
   * Gets all senior citizens assigned to a caregiver.
   * GET /api/v1/senior-citizens/caregiver/{caregiverId}
   */
  getSeniorCitizensByCaregiverId(caregiverId: number): Observable<SeniorCitizen[]> {
    const url = `${this.basePath}/caregiver/${caregiverId}`;

    console.log(`[API] Requesting senior citizens for caregiver ${caregiverId} from: ${url}`);

    return this.http.get<SeniorCitizenResource[]>(url).pipe(
      map(response => {
        console.log(`[API] Raw response from server:`, response);
        return response.map(resource => this.assembler.toEntityFromResource(resource));
      })
    );
  }
}
