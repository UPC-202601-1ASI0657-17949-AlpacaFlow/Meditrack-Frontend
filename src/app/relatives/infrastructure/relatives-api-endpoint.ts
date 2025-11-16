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
            `${environment.platformProviderApiBaseUrl}${environment.platformProviderRelativesEndpointPath}`,
            new RelativesAssembler()
        );
    }

    /**
     * Gets a relative by userId
     * Uses path variable following backend endpoint pattern: /user/{userId}
     * The backend returns the relative with its seniorCitizen included
     */
    getByUserId(userId: number) {
        const url = `${this.endpointUrl}/user/${userId}`;
        console.log(`[API] Requesting relative from: ${url} (userId=${userId})`);
        return this.http.get<RelativeResource>(url)
            .pipe(
                map(response => {
                    console.log(`[API] Raw response from server:`, response);
                    if (!response) {
                        throw new Error(`No relative found for userId: ${userId}`);
                    }
                    
                    // The assembler will handle the transformation of seniorCitizen
                    const entity = this.assembler.toEntityFromResource(response);
                    console.log(`[API] Transformed entity:`, entity);
                    return entity;
                })
            );
    }
}
