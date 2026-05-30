import { Injectable } from '@angular/core';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-enpoint';
import { Organization } from '../domain/model/organization.entity';
import { OrganizationResource, OrganizationsResponse } from './organization-response';
import { OrganizationsAssembler } from './organization-assembler';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs';

interface OrganizationListItem {
  id: number;
  name: string;
  type: string;
  email?: string;
}

/**
 * API endpoint for managing organizations.
 */
@Injectable({
  providedIn: 'root'
})
export class OrganizationsApiEndpoint extends
    BaseApiEndpoint<Organization, OrganizationResource, OrganizationsResponse, OrganizationsAssembler> {
  constructor(http: HttpClient) {
    super(
        http,
        `${environment.platformProviderApiBaseUrl}${environment.platformProviderOrganizationsEndpointPath}`,
        new OrganizationsAssembler()
    );
  }

  /**
   * Gets an organization by ID
   */
  override getById(id: number) {
    const url = `${this.endpointUrl}/${id}`;
    console.log(`[API] Requesting organization from: ${url}`);
    return this.http.get<OrganizationResource>(url)
      .pipe(
        map(resource => {
          console.log(`[API] Raw response from server:`, resource);
          const entity = this.assembler.toEntityFromResource(resource);
          console.log(`[API] Transformed entity:`, entity);
          return entity;
        })
      );
  }

  /**
   * Finds an organization by contact email or institution name.
   */
  findByEmailOrName(email: string, name: string) {
    return this.http.get<OrganizationListItem[]>(this.endpointUrl).pipe(
      map(organizations =>
        organizations.find(organization =>
          organization.email?.toLowerCase() === email.toLowerCase() ||
          organization.name?.toLowerCase() === name.toLowerCase()
        ) ?? null
      )
    );
  }
}

