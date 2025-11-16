import { Injectable } from '@angular/core';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-enpoint';
import { Admin } from '../domain/model/admin.entity';
import { AdminResource, AdminsResponse } from './admin-response';
import { AdminsAssembler } from './admin-assembler';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs';

/**
 * API endpoint for managing admins.
 */
@Injectable({
  providedIn: 'root'
})
export class AdminsApiEndpoint extends
    BaseApiEndpoint<Admin, AdminResource, AdminsResponse, AdminsAssembler> {
  constructor(http: HttpClient) {
    super(
        http,
        `${environment.platformProviderApiBaseUrl}${environment.platformProviderAdminsEndpointPath}`,
        new AdminsAssembler()
    );
  }

  /**
   * Gets admins by organizationId
   * Uses path variable following backend endpoint pattern: /organization/{organizationId}
   */
  getByOrganizationId(organizationId: number) {
    const url = `${this.endpointUrl}/organization/${organizationId}`;
    console.log(`[API] Requesting admins from: ${url} (organizationId=${organizationId})`);
    return this.http.get<AdminResource[]>(url)
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
   * Gets an admin by userId
   * Note: This searches through all admins to find one with matching userId
   * @deprecated Use getByUserIdAndOrganizationId instead to avoid conflicts when same userId exists in different organizations
   */
  getByUserId(userId: string | number) {
    const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    // Since backend doesn't have a direct endpoint for userId, we'll get all and filter
    // In a real scenario, you might want to add a backend endpoint for this
    return this.getAll().pipe(
      map(admins => admins.find(admin => admin.userId === userIdNum) || null)
    );
  }

  /**
   * Gets an admin by userId and organizationId
   * This ensures the admin belongs to the specified organization
   */
  getByUserIdAndOrganizationId(userId: number, organizationId: number) {
    const url = `${this.endpointUrl}/user/${userId}/organization/${organizationId}`;
    console.log(`[API] Requesting admin from: ${url} (userId=${userId}, organizationId=${organizationId})`);
    return this.http.get<AdminResource>(url)
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

