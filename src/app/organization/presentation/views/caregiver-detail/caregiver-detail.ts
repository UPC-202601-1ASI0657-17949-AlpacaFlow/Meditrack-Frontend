import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { OrganizationStore } from '../../../application/organization.store';
import { Caregiver } from '../../../domain/model/caregiver.entity';
import { SeniorCitizen } from '../../../domain/model/senior-citizen.entity';
import { MatIconModule } from '@angular/material/icon';
import { UnassignSeniorCitizenDialog } from '../../components/unassign-senior-citizen-dialog/unassign-senior-citizen-dialog';

@Component({
  selector: 'app-caregiver-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatSelectModule,
    MatDialogModule,
    TranslatePipe,
    MatIconModule
  ],
  templateUrl: './caregiver-detail.html',
  styleUrls: ['./caregiver-detail.css']
})
export class CaregiverDetail implements OnInit {
  caregiver = signal<Caregiver | null>(null);
  selectedSeniorCitizenId: number | null = null;
  doctorTitle: string = 'Sr.'; // Default, will be updated from translation

  // Computed signals that reactively update when store changes
  assignedSeniorCitizens = computed(() => {
    const currentCaregiver = this.caregiver();
    if (!currentCaregiver) return [];
    
    const allSeniorCitizens = this.organizationStore.seniorCitizens();
    return allSeniorCitizens.filter(sc => 
      sc.assignedCaregiverId === currentCaregiver.id
    );
  });

  availableSeniorCitizens = computed(() => {
    const currentCaregiver = this.caregiver();
    if (!currentCaregiver) return [];
    
    const allSeniorCitizens = this.organizationStore.seniorCitizens();
    // Filter: same organization, exclude only those already assigned to THIS caregiver (they appear in assigned list)
    return allSeniorCitizens.filter(sc => 
      sc.organizationId === currentCaregiver.organizationId && 
      sc.assignedCaregiverId !== currentCaregiver.id // Not assigned to this caregiver (they're in the assigned list)
    );
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private organizationStore: OrganizationStore,
    private dialog: MatDialog,
    private translateService: TranslateService
  ) {
    // Load doctor title translation
    this.translateService.get('doctor.title').subscribe(title => {
      this.doctorTitle = title;
    });
  }

  ngOnInit(): void {
    const caregiverId = this.route.snapshot.paramMap.get('id');
    if (caregiverId) {
      this.loadCaregiver(parseInt(caregiverId));
    }
  }

  loadCaregiver(id: number): void {
    // Get caregiver from store
    const caregiver = this.organizationStore.caregivers().find(k => k.id === id);
    if (caregiver) {
      this.caregiver.set(caregiver);
      // No need to manually load lists - computed signals handle automatic updates
    }
  }

  /**
   * Gets the name of the doctor or caregiver assigned to a senior citizen
   * @param seniorCitizen - The senior citizen to check
   * @returns The name of the assigned doctor or caregiver, or null if not assigned
   */
  getAssignedPersonName(seniorCitizen: SeniorCitizen): string | null {
    if (seniorCitizen.assignedDoctorId) {
      const assignedDoctor = this.organizationStore.doctors().find(d => d.id === seniorCitizen.assignedDoctorId);
      if (assignedDoctor) {
        return `${this.doctorTitle} ${assignedDoctor.fullName}`;
      }
    }
    if (seniorCitizen.assignedCaregiverId) {
      const assignedCaregiver = this.organizationStore.caregivers().find(c => c.id === seniorCitizen.assignedCaregiverId);
      if (assignedCaregiver) {
        return assignedCaregiver.fullName;
      }
    }
    return null;
  }

  /**
   * Checks if a senior citizen is already assigned to another doctor or caregiver
   * @param seniorCitizen - The senior citizen to check
   * @returns true if assigned to another doctor or caregiver
   */
  isAssignedToAnother(seniorCitizen: SeniorCitizen): boolean {
    const currentCaregiver = this.caregiver();
    if (!currentCaregiver) return false;
    return (seniorCitizen.assignedCaregiverId !== null && seniorCitizen.assignedCaregiverId !== currentCaregiver.id) ||
           seniorCitizen.assignedDoctorId !== null;
  }

  /**
   * Checks if the currently selected senior citizen can be assigned
   * @returns true if assignment is blocked (assigned to doctor - exclusión mutua)
   */
  canAssignSelectedSeniorCitizen(): boolean {
    if (!this.selectedSeniorCitizenId) return false;
    const selectedSenior = this.availableSeniorCitizens().find((sc: SeniorCitizen) => sc.id === this.selectedSeniorCitizenId);
    if (!selectedSenior) return false;
    // Block if assigned to doctor (exclusión mutua)
    return selectedSenior.assignedDoctorId === null;
  }

  onSeniorCitizenSelect(seniorCitizenId: string): void {
    this.selectedSeniorCitizenId = seniorCitizenId ? parseInt(seniorCitizenId) : null;
  }

  onAssignSeniorCitizen(): void {
    const currentCaregiver = this.caregiver();
    if (this.selectedSeniorCitizenId && currentCaregiver) {
      // Check if the selected senior citizen is already assigned to another
      const selectedSenior = this.organizationStore.seniorCitizens().find(sc => sc.id === this.selectedSeniorCitizenId);
      if (selectedSenior && this.isAssignedToAnother(selectedSenior)) {
        // If assigned to another caregiver, allow reassignment (store will handle it)
        // If assigned to a doctor, show error (exclusión mutua)
        if (selectedSenior.assignedDoctorId !== null) {
          this.translateService.get('caregiver.errors.cannotAssignToDoctor').subscribe(message => {
            alert(message);
          });
          return;
        }
      }
      
      try {
        // Use the organization store to assign senior citizen to caregiver
        // This will automatically unassign from previous caregiver if needed
        this.organizationStore.assignSeniorCitizenToCaregiver(currentCaregiver.id, this.selectedSeniorCitizenId);
        
        // No need to manually refresh - computed signals will update automatically when store changes
        this.selectedSeniorCitizenId = null;
      } catch (error) {
        console.error('Error assigning senior citizen:', error);
        this.translateService.get('caregiver.errors.assignError').subscribe(message => {
          alert(error instanceof Error ? error.message : message);
        });
      }
    }
  }

  /**
   * Obtiene organizationId, userRole y userId de la ruta padre
   */
  private getRouteParams(): { organizationId: number | null; userRole: string | null; userId: number | null } {
    let currentRoute: ActivatedRoute | null = this.route.parent;
    while (currentRoute) {
      const params = currentRoute.snapshot.paramMap;
      const organizationId = params.get('organizationId');
      const userRole = params.get('userRole');
      const userId = params.get('userId');
      
      if (organizationId) {
        return {
          organizationId: parseInt(organizationId, 10),
          userRole: userRole,
          userId: userId ? parseInt(userId, 10) : null
        };
      }
      currentRoute = currentRoute.parent;
    }
    return { organizationId: null, userRole: null, userId: null };
  }

  onBackToList(): void {
    const { organizationId, userRole, userId } = this.getRouteParams();
    if (organizationId) {
      if (userRole && userId) {
        this.router.navigate(['/organization', organizationId, userRole, userId, 'caregivers']);
      } else {
        this.router.navigate(['/organization', organizationId, 'caregivers']);
      }
    } else {
      console.error('CaregiverDetail: Could not find organizationId in route, navigating to default');
      this.router.navigate(['/organization/2/caregivers']); // Fallback
    }
  }

  getSeniorCitizenFullName(seniorCitizen: SeniorCitizen): string {
    return seniorCitizen.fullName;
  }

  onUnassignSeniorCitizen(seniorCitizen: SeniorCitizen, event: Event): void {
    event.stopPropagation();
    
    const dialogRef = this.dialog.open(UnassignSeniorCitizenDialog, {
      width: '400px',
      data: {
        seniorCitizen: seniorCitizen
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      const currentCaregiver = this.caregiver();
      if (result && currentCaregiver) {
        try {
          // Use the organization store to unassign senior citizen from caregiver
          this.organizationStore.unassignSeniorCitizenFromCaregiver(currentCaregiver.id, seniorCitizen.id);
          
          // No need to manually refresh - computed signals will update automatically when store changes
        } catch (error) {
          console.error('Error unassigning senior citizen:', error);
          // You could show an error message to the user here
        }
      }
    });
  }
}

