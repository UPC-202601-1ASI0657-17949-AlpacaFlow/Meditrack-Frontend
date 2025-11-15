import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Doctor } from "../../../domain/model/doctor.entity";
import {MatIconModule} from "@angular/material/icon";
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-doctor-item',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslatePipe],
  templateUrl: './doctor-item.html',
  styleUrls: ['./doctor-item.css']
})
export class DoctorItem {
  @Input() doctor!: Doctor;
  @Output() edit = new EventEmitter<Doctor>();
  @Output() remove = new EventEmitter<Doctor>();

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  onEdit(event: Event) {
    event.stopPropagation();
    this.edit.emit(this.doctor);
  }

  onRemove(event: Event) {
    event.stopPropagation();
    this.remove.emit(this.doctor);
  }

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

  onCardClick() {
    const { organizationId, userRole, userId } = this.getRouteParams();
    if (organizationId) {
      if (userRole && userId) {
        this.router.navigate(['/organization', organizationId, userRole, userId, 'doctors', this.doctor.id]);
      } else {
        this.router.navigate(['/organization', organizationId, 'doctors', this.doctor.id]);
      }
    } else {
      console.error('DoctorItem: Could not find organizationId in route');
    }
  }

  onCardDoubleClick() {
    const { organizationId, userRole, userId } = this.getRouteParams();
    if (organizationId) {
      if (userRole && userId) {
        this.router.navigate(['/organization', organizationId, userRole, userId, 'doctors', this.doctor.id]);
      } else {
        this.router.navigate(['/organization', organizationId, 'doctors', this.doctor.id]);
      }
    } else {
      console.error('DoctorItem: Could not find organizationId in route');
    }
  }
}
