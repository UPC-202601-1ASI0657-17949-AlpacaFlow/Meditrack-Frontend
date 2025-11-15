import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../../application/auth.store';
import { OrganizationApi } from '../../../../organization/infrastructure/organization-api';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    TranslatePipe
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authStore = inject(AuthStore);
  private organizationApi = inject(OrganizationApi);

  loginForm: FormGroup;
  hidePassword = true;
  isLoading = false;
  errorMessage: string | null = null;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  onSubmit(): void {
    console.log('[LoginComponent] Form submitted');
    
    if (this.loginForm.invalid) {
      console.log('[LoginComponent] Form is invalid');
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const { email, password } = this.loginForm.value;
    console.log('[LoginComponent] Attempting login with:', { email, passwordLength: password?.length });

    this.authStore.login(email, password).subscribe({
      next: (response) => {
        console.log('[LoginComponent] Login successful:', response);
        this.authStore.setAuth(response.token, response.user);
        this.isLoading = false;
        
        // Redirigir según el rol del usuario
        const user = response.user;
        console.log('[LoginComponent] User role:', user.role);
        
        if (user.role === 'relative') {
          // Para usuarios relative, redirigir a sus rutas
          console.log('[LoginComponent] Redirecting to relative route');
          this.router.navigate(['/relative/relative', user.id]);
        } else if (user.role === 'admin') {
          // Para usuarios admin, buscar su organización y redirigir
          console.log('[LoginComponent] Admin user, fetching admin details');
          this.organizationApi.getAdminByUserId(user.id.toString()).subscribe({
            next: (admin) => {
              console.log('[LoginComponent] Admin details:', admin);
              if (admin) {
                console.log('[LoginComponent] Redirecting to organization route');
                this.router.navigate(['/organization', admin.organizationId, 'admin', user.id]);
              } else {
                // Si no se encuentra el admin, redirigir a login
                console.error('[LoginComponent] Admin not found for user:', user.id);
                this.errorMessage = 'login.errors.adminNotFound';
                this.authStore.clearAuth();
              }
            },
            error: (err) => {
              console.error('[LoginComponent] Error finding admin:', err);
              this.errorMessage = 'login.errors.adminNotFound';
              this.authStore.clearAuth();
            }
          });
        } else if (user.role === 'doctor') {
          // Para doctores, buscar su doctor entity y redirigir a la organización
          console.log('[LoginComponent] Doctor user, fetching doctor details');
          this.organizationApi.getDoctorByUserId(user.id).subscribe({
            next: (doctor) => {
              console.log('[LoginComponent] Doctor details:', doctor);
              if (doctor) {
                console.log('[LoginComponent] Redirecting to organization route for doctor');
                this.router.navigate(['/organization', doctor.organizationId, 'doctor', user.id, 'senior-citizens']);
              } else {
                // Si no se encuentra el doctor, mostrar error
                console.error('[LoginComponent] Doctor not found for user:', user.id);
                this.errorMessage = 'login.errors.doctorNotFound';
                this.authStore.clearAuth();
              }
            },
            error: (err) => {
              console.error('[LoginComponent] Error finding doctor:', err);
              this.errorMessage = 'login.errors.doctorNotFound';
              this.authStore.clearAuth();
            }
          });
        } else {
          // Para otros roles, redirigir a home
          console.log('[LoginComponent] Unknown role, redirecting to home');
        this.router.navigate(['/']);
        }
      },
      error: (error) => {
        console.error('[LoginComponent] Login error:', error);
        this.isLoading = false;
        // Extraer el mensaje de error del error lanzado
        const errorMessage = error.message || error.error?.message || 'login.errors.invalidCredentials';
        this.errorMessage = errorMessage === 'Invalid email or password' ? 'login.errors.invalidCredentials' : errorMessage;
        console.error('[LoginComponent] Error message set:', this.errorMessage);
      }
    });
  }

  navigateToSignUp(): void {
    // Navigate to user type selection first, then to signup
    this.router.navigate(['user-type-selection'], { relativeTo: this.route.parent });
  }
}

