import { Component,Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { Caregiver } from '../../../domain/model/caregiver.entity';
import {MatIconModule} from "@angular/material/icon";
import {ReactiveFormsModule} from "@angular/forms";
import { Router, ActivatedRoute } from '@angular/router';
import {TranslatePipe} from "@ngx-translate/core";


@Component({
  selector: 'app-caregiver-item',
  standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './caregiver-item.html',
  styleUrls: ['./caregiver-item.css']
})
export class CaregiverItem {
  @Input() caregiver!: Caregiver;
  @Output() edit = new EventEmitter<Caregiver>();
  @Output() remove = new EventEmitter<Caregiver>();

  constructor(
    private router: Router,
    private route: ActivatedRoute
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
    this.edit.emit(this.caregiver);
  }

  onRemove(event: Event) {
    event.stopPropagation();
    this.remove.emit(this.caregiver);
  }

  onCardClick() {
    const { organizationId, userRole, userId } = this.getRouteParams();
    if (organizationId) {
      if (userRole && userId) {
        this.router.navigate(['/organization', organizationId, userRole, userId, 'caregivers', this.caregiver.id]);
      } else {
        this.router.navigate(['/organization', organizationId, 'caregivers', this.caregiver.id]);
      }
    } else {
      console.error('CaregiverItem: Could not find organizationId in route');
    }
  }

  onCardDoubleClick() {
    const { organizationId, userRole, userId } = this.getRouteParams();
    if (organizationId) {
      if (userRole && userId) {
        this.router.navigate(['/organization', organizationId, userRole, userId, 'caregivers', this.caregiver.id]);
      } else {
        this.router.navigate(['/organization', organizationId, 'caregivers', this.caregiver.id]);
      }
    } else {
      console.error('CaregiverItem: Could not find organizationId in route');
    }
  }
}

