import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-enpoint';
import { Caregiver } from '../domain/model/caregiver.entity';
import { CaregiverResource, CaregiversResponse } from './caregiver-response';
import { CaregiversAssembler } from './caregiver-assembler';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs';

/**
 * API endpoint for managing caregivers.
 */
export class CaregiversApiEndpoint extends
    BaseApiEndpoint<Caregiver, CaregiverResource, CaregiversResponse, CaregiversAssembler> {

  constructor(
    http: HttpClient,
  ) {
    super(
        http,
        `${environment.platformProviderApiBaseUrl}${environment.platformProviderCaregiversEndpointPath}`,
        new CaregiversAssembler()
    );
  }

  /**
   * Gets caregivers by organizationId
   * Uses path variable following backend endpoint pattern: /organization/{organizationId}
   */
  getByOrganizationId(organizationId: number) {
    const url = `${this.endpointUrl}/organization/${organizationId}`;
    console.log(`[API] Requesting caregivers from: ${url} (organizationId=${organizationId})`);
    return this.http.get<CaregiverResource[]>(url)
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

  getCaregiverByUserId(userId: number) {
        const url = `${this.endpointUrl}/user/${userId}`;
        console.log(`[API] Requesting caregiver from: ${url} (userId=${userId})`);
        return this.http.get<CaregiverResource>(url)
            .pipe(
                map(response => {
                    console.log(`[API] Raw response from server:`, response);
                    const entity = this.assembler.toEntityFromResource(response);
                    console.log(`[API] Transformed entity:`, entity);
                    return entity;
                })
            );
    }

    getByUserIdAndOrganizationId(userId: number, organizationId: number) {
        const url = `${this.endpointUrl}/user/${userId}/organization/${organizationId}`;
        console.log(`[API] Requesting caregiver from: ${url} (userId=${userId}, organizationId=${organizationId})`);
        return this.http.get<CaregiverResource>(url)
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

