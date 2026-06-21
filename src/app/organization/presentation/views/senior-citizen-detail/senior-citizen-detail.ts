import { Component, OnInit, OnDestroy, computed, signal, effect } from '@angular/core';
import { ClinicalStore } from '../../../../clinical/application/clinical.store';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SeniorCitizenMedicalRecord } from '../../../../clinical/presentation/components/senior-citizen-medical-record/senior-citizen-medical-record';
import { SeniorCitizenThresholdConfig } from '../../../../clinical/presentation/components/senior-citizen-threshold-config/senior-citizen-threshold-config';
import { OrganizationStore } from '../../../application/organization.store';
import { DeviceStore } from '../../../application/device.store';
import { SeniorCitizen } from '../../../domain/model/senior-citizen.entity';
import { Caregiver } from '../../../domain/model/caregiver.entity';
import { Doctor } from '../../../domain/model/doctor.entity';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-senior-citizen-detail',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatTabsModule, TranslatePipe, SeniorCitizenMedicalRecord, SeniorCitizenThresholdConfig],
  templateUrl: './senior-citizen-detail.html',
  styleUrls: ['./senior-citizen-detail.css']
})
export class SeniorCitizenDetail implements OnInit, OnDestroy {
  seniorCitizen = computed(() => this.organizationStore.selectedSeniorCitizen());
  
  doctor = computed(() => {
    const sc = this.seniorCitizen();
    if (sc && sc.assignedDoctorId) {
      // Get the assigned doctor (senior citizens can only have one doctor)
      const doctorId = sc.assignedDoctorId;
      return this.organizationStore.doctors().find(d => d.id === doctorId) || null;
    }
    return null;
  });

  caregiver = computed(() => {
    const sc = this.seniorCitizen();
    if (sc && sc.assignedCaregiverId) {
      // Get the assigned caregiver (senior citizens can only have one caregiver)
      const caregiverId = sc.assignedCaregiverId;
      return this.organizationStore.caregivers().find(k => k.id === caregiverId) || null;
    }
    return null;
  });

  doctorTitle = signal<string>('Dr.');
  userRole = signal<string | null>(null);

  /** Clinical tabs are only for doctor/caregiver views, not admin. */
  canViewClinicalData = computed(() => {
    const role = this.userRole()?.toLowerCase();
    return role === 'doctor' || role === 'caregiver';
  });

  deviceInfo = computed(() => {
    const sc = this.seniorCitizen();
    if (!sc || !sc.deviceId) return null;
    return this.deviceStore.selectedDevice();
  });
  deviceLoading = computed(() => this.deviceStore.loadingDevices());

  /**
   * Determines if the senior citizen is assigned to a doctor or caregiver
   */
  assignedPerson = computed(() => {
    const sc = this.seniorCitizen();
    if (!sc) return null;
    
    if (sc.assignedDoctorId) {
      const doctor = this.doctor();
      const title = this.doctorTitle();
      return doctor ? { type: 'doctor' as const, person: doctor, name: `${title} ${doctor.fullName}` } : null;
    } else if (sc.assignedCaregiverId) {
      const caregiver = this.caregiver();
      return caregiver ? { type: 'caregiver' as const, person: caregiver, name: caregiver.fullName } : null;
    }
    
    return null;
  });

  private routeSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private organizationStore: OrganizationStore,
    private deviceStore: DeviceStore,
    private translateService: TranslateService,
    private clinicalStore: ClinicalStore
  ) {
    // Load doctor title translation
    this.translateService.get('doctor.title').subscribe(title => {
      this.doctorTitle.set(title);
    });

    effect(() => {
      const sc = this.seniorCitizen();
      if (sc?.deviceId) {
        this.deviceStore.loadDeviceById(sc.deviceId);
      }
    });
  }

  ngOnInit(): void {
    this.updateUserRole();
    this.loadSeniorCitizen();

    this.routeSubscription = this.route.paramMap.subscribe(params => {
      if (params.get('id')) {
        this.loadSeniorCitizen();
      }
      this.updateUserRole();
    });
  }

  private updateUserRole(): void {
    this.userRole.set(this.getRouteParams().userRole);
  }

  private loadSeniorCitizen(): void {
    // Get seniorCitizenId from current route (senior-citizens/:id/profile)
    const seniorCitizenId = this.route.snapshot.paramMap.get('id');
    if (seniorCitizenId) {
      const id = Number(seniorCitizenId);
      console.log(`👤 SeniorCitizenDetail: Loading senior citizen ${id}`);
      // Load senior citizen by ID (this will set selectedSeniorCitizen in store)
      this.organizationStore.loadSeniorCitizenById(id);
    }
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    this.clinicalStore.clear();
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
        this.router.navigate(['/organization', organizationId, userRole, userId, 'senior-citizens']);
      } else {
        this.router.navigate(['/organization', organizationId, 'senior-citizens']);
      }
    } else {
      console.error('SeniorCitizenDetail: Could not find organizationId in route');
      // No hardcoded fallback - let the router handle it or show an error
    }
  }
}
