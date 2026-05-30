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
 * API endpoint for doctor ↔ senior citizen assignments.
 * Uses organization microservice routes under /api/v1/senior-citizens.
 */
@Injectable({
  providedIn: 'root'
})
export class DoctorAssignmentApiEndpoint {
  private readonly basePath = `${environment.platformProviderApiBaseUrl}${environment.platformProviderSeniorCitizensEndpointPath}`;
  private readonly assembler = new SeniorCitizensAssembler();

  constructor(private http: HttpClient) {}

  /**
   * Assigns a senior citizen to a doctor.
   * POST /api/v1/senior-citizens/{seniorCitizenId}/assignments/doctor/{doctorId}
   */
  assignSeniorCitizenToDoctor(doctorId: number, seniorCitizenId: number): Observable<SeniorCitizen> {
    const url = `${this.basePath}/${seniorCitizenId}/assignments/doctor/${doctorId}`;

    console.log(`[API] Assigning senior citizen ${seniorCitizenId} to doctor ${doctorId} at: ${url}`);

    return this.http.post<SeniorCitizenResource>(url, {}).pipe(
      map(response => {
        console.log(`[API] Assignment response from server:`, response);
        return this.assembler.toEntityFromResource(response);
      }),
      catchError(error => {
        const errorMessage = error?.error || error?.message || 'Unknown error';
        console.error(`[API] Error assigning senior citizen to doctor:`, error);
        const enhancedError = new Error(
          `Failed to assign senior citizen ${seniorCitizenId} to doctor ${doctorId}: ${errorMessage}`
        );
        (enhancedError as any).status = error?.status;
        (enhancedError as any).error = error?.error;
        return throwError(() => enhancedError);
      })
    );
  }

  /**
   * Unassigns a senior citizen from a doctor.
   * DELETE /api/v1/senior-citizens/{seniorCitizenId}/assignments/doctor/{doctorId}
   */
  unassignSeniorCitizenFromDoctor(doctorId: number, seniorCitizenId: number): Observable<void> {
    const url = `${this.basePath}/${seniorCitizenId}/assignments/doctor/${doctorId}`;

    console.log(`[API] Unassigning senior citizen ${seniorCitizenId} from doctor ${doctorId} at: ${url}`);

    return this.http.delete<SeniorCitizenResource>(url).pipe(
      map(() => {
        console.log(`[API] Successfully unassigned senior citizen ${seniorCitizenId} from doctor ${doctorId}`);
      })
    );
  }

  /**
   * Gets all senior citizens assigned to a doctor.
   * GET /api/v1/senior-citizens/doctor/{doctorId}
   */
  getSeniorCitizensByDoctorId(doctorId: number): Observable<SeniorCitizen[]> {
    const url = `${this.basePath}/doctor/${doctorId}`;

    console.log(`[API] Requesting senior citizens for doctor ${doctorId} from: ${url}`);

    return this.http.get<SeniorCitizenResource[]>(url).pipe(
      map(response => {
        console.log(`[API] Raw response from server:`, response);
        return response.map(resource => this.assembler.toEntityFromResource(resource));
      })
    );
  }
}
