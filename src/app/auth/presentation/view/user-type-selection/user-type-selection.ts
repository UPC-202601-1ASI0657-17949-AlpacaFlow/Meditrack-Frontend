import { Component, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-type-selection',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe
  ],
  templateUrl: './user-type-selection.html',
  styleUrl: './user-type-selection.css'
})
export class UserTypeSelectionComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  /**
   * Navigate back to login
   */
  navigateBack(): void {
    this.router.navigate(['login'], { relativeTo: this.route.parent });
  }

  /**
   * Select user type and navigate to signup with role
   * @param userType - The selected user type: 'relative', 'nursing-home', or 'clinic'
   */
  selectUserType(userType: 'relative' | 'nursing-home' | 'clinic'): void {
    // Map user type to role:
    // - relative -> 'relative'
    // - nursing-home or clinic -> 'admin'
    const role = userType === 'relative' ? 'relative' : 'admin';
    
    console.log('[UserTypeSelection] Selected user type:', userType);
    console.log('[UserTypeSelection] Mapped to role:', role);
    
    // Navigate to signup with role as query parameter
    this.router.navigate(['signup'], { 
      relativeTo: this.route.parent,
      queryParams: { role: role }
    });
  }
}

