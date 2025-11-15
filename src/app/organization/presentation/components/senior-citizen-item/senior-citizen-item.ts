import { Component,Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { SeniorCitizen } from '../../../domain/model/senior-citizen.entity';
import {MatIconModule} from "@angular/material/icon";
import {ReactiveFormsModule} from "@angular/forms";
import { Router, ActivatedRoute } from '@angular/router';
import {TranslatePipe} from "@ngx-translate/core";
import { OrganizationStore } from '../../../application/organization.store';


@Component({
  selector: 'app-senior-citizen-item',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './senior-citizen-item.html',
  styleUrls: ['./senior-citizen-item.css']
})
export class SeniorCitizenItem {
  @Input() seniorCitizen!: SeniorCitizen;
  @Output() edit = new EventEmitter<SeniorCitizen>();
  @Output() remove = new EventEmitter<SeniorCitizen>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public organizationStore: OrganizationStore
  ) {}

  /**
   * Obtiene organizationId, userRole y userId de la ruta padre
   */
  private getRouteParams(): { organizationId: number | null; userRole: string | null; userId: number | null } {
    let currentRoute: ActivatedRoute | null = this.route;
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

  onEdit(event: Event) {
    event.stopPropagation();
    this.edit.emit(this.seniorCitizen);
  }

  onRemove(event: Event) {
    event.stopPropagation();
    this.remove.emit(this.seniorCitizen);
  }

  onCardClick() {
    const { organizationId, userRole, userId } = this.getRouteParams();
    if (organizationId) {
      if (userRole && userId) {
        this.router.navigate(['/organization', organizationId, userRole, userId, 'senior-citizens', this.seniorCitizen.id, 'profile']);
      } else {
        this.router.navigate(['/organization', organizationId, 'senior-citizens', this.seniorCitizen.id, 'profile']);
      }
    } else {
      console.error('SeniorCitizenItem: Could not find organizationId in route');
    }
  }

  onCardDoubleClick() {
    const { organizationId, userRole, userId } = this.getRouteParams();
    if (organizationId) {
      if (userRole && userId) {
        this.router.navigate(['/organization', organizationId, userRole, userId, 'senior-citizens', this.seniorCitizen.id, 'profile']);
      } else {
        this.router.navigate(['/organization', organizationId, 'senior-citizens', this.seniorCitizen.id, 'profile']);
      }
    } else {
      console.error('SeniorCitizenItem: Could not find organizationId in route');
    }
  }
}
