import { Injectable } from '@angular/core';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-enpoint';
import { Doctor } from '../domain/model/doctor.entity';
import { DoctorResource, DoctorsResponse } from './doctor-response';
import { DoctorsAssembler } from './doctor-assembler';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs';

/**
 * API endpoint for managing doctors.
 */
@Injectable({
  providedIn: 'root'
})
export class DoctorsApiEndpoint extends
    BaseApiEndpoint<Doctor, DoctorResource, DoctorsResponse, DoctorsAssembler> {
  constructor(http: HttpClient) {
    super(
        http,
        `${environment.platformProviderApiBaseUrl}${environment.platformProviderDoctorsEndpointPath}`,
        new DoctorsAssembler()
    );
  }

  /**
   * Gets doctors by organizationId
   * Uses query parameter for json-server: ?organizationId={organizationId}
   */
  getByOrganizationId(organizationId: number) {
    const url = `${this.endpointUrl}?organizationId=${organizationId}`;
    console.log(`[API] Requesting doctors from: ${url} (organizationId=${organizationId})`);
    return this.http.get<DoctorResource[]>(url)
      .pipe(
        map(response => {
          console.log(`[API] Raw response from server:`, response);
          // Backend returns array directly
          const entities = response.map(resource => this.assembler.toEntityFromResource(resource));
          console.log(`[API] Transformed entities:`, entities);
          return entities;
        })
      );
  }

  /**
   * Gets a doctor by userId
   * Uses query parameter for json-server: ?userId={userId}
   */
  getByUserId(userId: number) {
    const url = `${this.endpointUrl}?userId=${userId}`;
    console.log(`[API] Requesting doctor from: ${url} (userId=${userId})`);
    return this.http.get<DoctorResource[]>(url)
      .pipe(
        map(response => {
          console.log(`[API] Raw response from server:`, response);
          // json-server returns an array, get the first element
          const resource = response && response.length > 0 ? response[0] : null;
          if (!resource) {
            return null;
          }
          const entity = this.assembler.toEntityFromResource(resource);
          console.log(`[API] Transformed entity:`, entity);
          return entity;
        })
      );
  }

  /**
   * Gets a doctor by userId and organizationId
   * This ensures the doctor belongs to the specified organization
   * Uses path variable following backend endpoint pattern: /user/{userId}/organization/{organizationId}
   */
  getByUserIdAndOrganizationId(userId: number, organizationId: number) {
    const url = `${this.endpointUrl}/user/${userId}/organization/${organizationId}`;
    console.log(`[API] Requesting doctor from: ${url} (userId=${userId}, organizationId=${organizationId})`);
    return this.http.get<DoctorResource>(url)
      .pipe(
        map(response => {
          console.log(`[API] Raw response from server:`, response);
          const entity = this.assembler.toEntityFromResource(response);
          console.log(`[API] Transformed entity:`, entity);
          return entity;
        })
      );
  }
}