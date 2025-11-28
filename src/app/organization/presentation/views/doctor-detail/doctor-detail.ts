import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { OrganizationStore } from '../../../application/organization.store';
import { Doctor } from '../../../domain/model/doctor.entity';
import { SeniorCitizen } from '../../../domain/model/senior-citizen.entity';
import { UnassignSeniorCitizenDialog } from '../../components/unassign-senior-citizen-dialog/unassign-senior-citizen-dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-doctor-detail',
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
  templateUrl: './doctor-detail.html',
  styleUrls: ['./doctor-detail.css']
})
export class DoctorDetail implements OnInit {
  doctor = signal<Doctor | null>(null);
  selectedSeniorCitizenId: number | null = null;
  doctorTitle: string = 'Dr.'; // Default, will be updated from translation

  // Computed signals that reactively update when store changes
  assignedSeniorCitizens = computed(() => {
    const currentDoctor = this.doctor();
    if (!currentDoctor) return [];
    
    const allSeniorCitizens = this.organizationStore.seniorCitizens();
    return allSeniorCitizens.filter(sc => 
      sc.assignedDoctorId === currentDoctor.id
    );
  });

  availableSeniorCitizens = computed(() => {
    const currentDoctor = this.doctor();
    if (!currentDoctor) return [];
    
    const allSeniorCitizens = this.organizationStore.seniorCitizens();
    // Filter: same organization, exclude only those already assigned to THIS doctor (they appear in assigned list)
    return allSeniorCitizens.filter(sc => 
      sc.organizationId === currentDoctor.organizationId && 
      sc.assignedDoctorId !== currentDoctor.id // Not assigned to this doctor (they're in the assigned list)
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
    const doctorId = this.route.snapshot.paramMap.get('id');
    if (doctorId) {
      // Validate that the ID is numeric
      const numericId = parseInt(doctorId, 10);
      if (isNaN(numericId) || doctorId !== numericId.toString()) {
        // Invalid ID (not a number), navigate to a non-existent route to trigger page-not-found
        // Using a route that will definitely not match any existing route
        this.router.navigate(['/invalid-route-404'], { skipLocationChange: false });
        return;
      }
      this.loadDoctor(numericId);
    }
  }

  loadDoctor(id: number): void {
    this.organizationStore.loadDoctorById(id).then(doctor => {
      if (doctor) {
        this.doctor.set(doctor);
      } else {
        this.doctor.set(null);
      }
    }).catch(() => this.doctor.set(null));
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
    const currentDoctor = this.doctor();
    if (!currentDoctor) return false;
    return (seniorCitizen.assignedDoctorId !== null && seniorCitizen.assignedDoctorId !== currentDoctor.id) ||
           seniorCitizen.assignedCaregiverId !== null;
  }

  /**
   * Checks if the currently selected senior citizen can be assigned
   * @returns true if assignment is blocked (assigned to caregiver - exclusión mutua)
   */
  canAssignSelectedSeniorCitizen(): boolean {
    if (!this.selectedSeniorCitizenId) return false;
    const selectedSenior = this.availableSeniorCitizens().find(sc => sc.id === this.selectedSeniorCitizenId);
    if (!selectedSenior) return false;
    // Block if assigned to caregiver (exclusión mutua)
    return selectedSenior.assignedCaregiverId === null;
  }

  onSeniorCitizenSelect(seniorCitizenId: string): void {
    this.selectedSeniorCitizenId = seniorCitizenId ? parseInt(seniorCitizenId) : null;
  }

  onAssignSeniorCitizen(): void {
    const currentDoctor = this.doctor();
    if (this.selectedSeniorCitizenId && currentDoctor) {
      // Check if the selected senior citizen is already assigned to another
      const selectedSenior = this.organizationStore.seniorCitizens().find(sc => sc.id === this.selectedSeniorCitizenId);
      if (selectedSenior && this.isAssignedToAnother(selectedSenior)) {
        // If assigned to another doctor, allow reassignment (store will handle it)
        // If assigned to a caregiver, show error (exclusión mutua)
        if (selectedSenior.assignedCaregiverId !== null) {
          this.translateService.get('doctor.errors.cannotAssignToCaregiver').subscribe(message => {
            alert(message);
          });
          return;
        }
      }
      
      try {
        // Use the organization store to assign senior citizen to doctor
        // This will automatically unassign from previous doctor if needed
        this.organizationStore.assignSeniorCitizenToDoctor(currentDoctor.id, this.selectedSeniorCitizenId);
        
        // No need to manually refresh - computed signals will update automatically when store changes
        this.selectedSeniorCitizenId = null;
      } catch (error) {
        console.error('Error assigning senior citizen:', error);
        this.translateService.get('doctor.errors.assignError').subscribe(message => {
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
        this.router.navigate(['/organization', organizationId, userRole, userId, 'doctors']);
      } else {
        this.router.navigate(['/organization', organizationId, 'doctors']);
      }
    } else {
      console.error('DoctorDetail: Could not find organizationId in route, navigating to default');
      this.router.navigate(['/organization/1/doctors']);
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
      const currentDoctor = this.doctor();
      if (result && currentDoctor) {
        try {
          // Use the organization store to unassign senior citizen from doctor
          this.organizationStore.unassignSeniorCitizenFromDoctor(currentDoctor.id, seniorCitizen.id);
          
          // No need to manually refresh - computed signals will update automatically when store changes
        } catch (error) {
          console.error('Error unassigning senior citizen:', error);
        }
      }
    });
  }

}