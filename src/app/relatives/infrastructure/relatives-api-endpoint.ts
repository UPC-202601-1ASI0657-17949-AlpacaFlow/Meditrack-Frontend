import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BaseApiEndpoint } from "../../shared/infrastructure/base-api-enpoint";
import { Relative } from "../domain/model/relative.entity";
import { RelativeResource, RelativeResponse } from "./relatives-response";
import { RelativesAssembler } from "./relatives-assembler";
import { environment } from "../../../environments/environment";
import { map, switchMap, of } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class RelativesApiEndpoint extends BaseApiEndpoint<
    Relative,
    RelativeResource,
    RelativeResponse,
    RelativesAssembler
> {
    constructor(http: HttpClient) {
        super(
            http,
            `${environment.platformProviderApiBaseUrl}/relatives`,
            new RelativesAssembler()
        );
    }

    /**
     * Gets a relative by userId
     * Uses query parameter for json-server: ?userId={userId}
     * Also loads the associated seniorCitizen if seniorCitizenId is present
     */
    getByUserId(userId: number) {
        const url = `${this.endpointUrl}?userId=${userId}`;
        console.log(`[API] Requesting relative from: ${url} (userId=${userId})`);
        return this.http.get<RelativeResource[]>(url)
            .pipe(
                switchMap(response => {
                    console.log(`[API] Raw response from server:`, response);
                    if (!response || response.length === 0) {
                        throw new Error(`No relative found for userId: ${userId}`);
                    }
                    // Backend returns array, get first element
                    const resource = response[0];
                    
                    // If seniorCitizenId is present, load the seniorCitizen
                    const seniorCitizenId = (resource as any).seniorCitizenId;
                    if (seniorCitizenId) {
                        console.log(`[API] Loading senior citizen with id: ${seniorCitizenId}`);
                        const seniorCitizenUrl = `${environment.platformProviderApiBaseUrl}${environment.platformProviderSeniorCitizensEndpointPath}/${seniorCitizenId}`;
                        return this.http.get<any>(seniorCitizenUrl).pipe(
                            map(seniorCitizenData => {
                                // Validate that the senior citizen belongs to a relative (organizationId = 0)
                                if (seniorCitizenData.organizationId !== 0) {
                                    console.error(`[API] Security violation: Senior citizen ${seniorCitizenId} belongs to organization ${seniorCitizenData.organizationId}, not to a relative. Access denied.`);
                                    throw new Error(`Senior citizen ${seniorCitizenId} does not belong to a relative user`);
                                }
                                
                                // Transform seniorCitizen data to match SeniorCitizen entity structure
                                const seniorCitizen = {
                                    firstName: seniorCitizenData.firstName || '',
                                    lastName: seniorCitizenData.lastName || '',
                                    age: seniorCitizenData.age || 0,
                                    dni: seniorCitizenData.dni || '',
                                    gender: seniorCitizenData.gender || '',
                                    height: seniorCitizenData.height || 0,
                                    weight: seniorCitizenData.weight || 0,
                                    image: seniorCitizenData.imageUrl || '',
                                    signalVitals: seniorCitizenData.signalVitals || {},
                                    alerts: seniorCitizenData.alerts || []
                                };
                                
                                // Add seniorCitizen to resource
                                const resourceWithSeniorCitizen: RelativeResource = {
                                    ...resource,
                                    seniorCitizen: seniorCitizen as any
                                };
                                
                                const entity = this.assembler.toEntityFromResource(resourceWithSeniorCitizen);
                                console.log(`[API] Transformed entity with seniorCitizen:`, entity);
                                return entity;
                            })
                        );
                    } else {
                        // No seniorCitizenId, return relative without seniorCitizen
                        const entity = this.assembler.toEntityFromResource(resource);
                        console.log(`[API] Transformed entity (no seniorCitizen):`, entity);
                        return of(entity);
                    }
                })
            );
    }
}
