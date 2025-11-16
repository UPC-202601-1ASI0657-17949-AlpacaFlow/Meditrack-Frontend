import {Component, computed, inject, OnInit, OnDestroy} from '@angular/core';
import {OrganizationStore} from "../../../application/organization.store";
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from "@angular/material/card";
import {ActivatedRoute} from "@angular/router";
import {Subscription} from "rxjs";
import {TranslatePipe} from "@ngx-translate/core";

@Component({
  selector: 'app-senior-citizen-alert-list',
  standalone: true,
  imports: [
    MatCardContent,
    MatCardTitle,
    MatCardHeader,
    MatCard,
    TranslatePipe
  ],
  templateUrl: './senior-citizen-alert-list.html',
  styleUrl: './senior-citizen-alert-list.css'
})
export class SeniorCitizenAlertList implements OnInit, OnDestroy {

    private organizationStore = inject(OrganizationStore);
    private route = inject(ActivatedRoute);
    private routeSubscription?: Subscription;

    seniorCitizen = computed(() => this.organizationStore.selectedSeniorCitizen());

    ngOnInit() {
        // Load senior citizen on init
        this.loadSeniorCitizen();
        
        // Subscribe to route changes to reload senior citizen when navigating between different senior citizens
        this.routeSubscription = this.route.paramMap.subscribe(params => {
            const seniorCitizenId = params.get('id');
            if (seniorCitizenId) {
                this.loadSeniorCitizen();
            }
        });
    }

    private loadSeniorCitizen(): void {
        const seniorCitizenId = this.route.snapshot.paramMap.get('id');
        if (seniorCitizenId) {
            console.log(`🚨 SeniorCitizenAlertList: Loading senior citizen ${seniorCitizenId}`);
            this.organizationStore.loadSeniorCitizenById(Number(seniorCitizenId));
        }
    }

    formatDate(date: string) {
        return new Date(date).toLocaleDateString();
    }

    ngOnDestroy(): void {
        if (this.routeSubscription) {
            this.routeSubscription.unsubscribe();
        }
    }
}

