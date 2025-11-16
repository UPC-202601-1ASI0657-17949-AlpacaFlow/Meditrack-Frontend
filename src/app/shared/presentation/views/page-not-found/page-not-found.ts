import {Component, inject, OnInit} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {ActivatedRoute, Router} from '@angular/router';
import {AuthStore} from '../../../../auth/application/auth.store';
import {OrganizationApi} from '../../../../organization/infrastructure/organization-api';
import {Admin} from '../../../../organization/domain/model/admin.entity';
import {Doctor} from '../../../../organization/domain/model/doctor.entity';
import {Caregiver} from '../../../../organization/domain/model/caregiver.entity';
import {take} from 'rxjs/operators';

@Component({
  selector: 'app-page-not-found',
  imports: [
    TranslatePipe,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './page-not-found.html',
  standalone: true,
  styleUrl: './page-not-found.css'
})
export class PageNotFound implements OnInit {
  protected invalidPath: string = '';
  private route: ActivatedRoute = inject(ActivatedRoute);
  private router: Router = inject(Router);
  private authStore = inject(AuthStore);
  private organizationApi = inject(OrganizationApi);

  ngOnInit(): void {
    this.invalidPath = this.route.snapshot.url.map(url => url.path).join('/');
  };

  protected navigateToHome() {
    const currentUser = this.authStore.currentUser();
    
    // Si no hay usuario autenticado, redirigir al login
    if (!currentUser || !this.authStore.isAuthenticated()) {
      this.router.navigate(['/auth/login']).then();
      return;
    }

    const userRole = currentUser.role?.toLowerCase();
    const userId = currentUser.id;

    // Redirigir según el rol del usuario a su bounded context principal
    if (userRole === 'relative') {
      // Bounded context: Relatives
      this.router.navigate(['/relative/relative', userId]).then();
    } else if (userRole === 'admin') {
      // Bounded context: Organization (Admin)
      this.organizationApi.getAdminByUserId(userId.toString()).pipe(take(1)).subscribe({
        next: (admin: Admin | null) => {
          if (admin && admin.organizationId) {
            this.router.navigate(['/organization', admin.organizationId, 'admin', userId]).then();
          } else {
            // Si no se encuentra el admin, redirigir al login
            this.router.navigate(['/auth/login']).then();
          }
        },
        error: () => {
          // Si hay error, redirigir al login
          this.router.navigate(['/auth/login']).then();
        }
      });
    } else if (userRole === 'doctor') {
      // Bounded context: Organization (Doctor)
      this.organizationApi.getDoctorByUserId(userId).pipe(take(1)).subscribe({
        next: (doctor: Doctor | null) => {
          if (doctor && doctor.organizationId) {
            this.router.navigate(['/organization', doctor.organizationId, 'doctor', userId, 'senior-citizens']).then();
          } else {
            // Si no se encuentra el doctor, redirigir al login
            this.router.navigate(['/auth/login']).then();
          }
        },
        error: () => {
          // Si hay error, redirigir al login
          this.router.navigate(['/auth/login']).then();
        }
      });
    } else if (userRole === 'caregiver') {
      // Bounded context: Organization (Caregiver)
      this.organizationApi.getCaregiverByUserId(userId).pipe(take(1)).subscribe({
        next: (caregiver: Caregiver | null) => {
          if (caregiver && caregiver.organizationId) {
            this.router.navigate(['/organization', caregiver.organizationId, 'caregiver', userId, 'senior-citizens']).then();
          } else {
            // Si no se encuentra el caregiver, redirigir al login
            this.router.navigate(['/auth/login']).then();
          }
        },
        error: () => {
          // Si hay error, redirigir al login
          this.router.navigate(['/auth/login']).then();
        }
      });
    } else {
      // Rol desconocido, redirigir al login
      this.router.navigate(['/auth/login']).then();
    }
  }
}
