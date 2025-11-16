import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { DoctorFormComponent } from '../doctor-form/doctor-form';
import { DoctorItem } from '../../components/doctor-item/doctor-item';
import { OrganizationStore } from '../../../application/organization.store';
import { Doctor } from '../../../domain/model/doctor.entity';
import {DeleteDoctorDialog} from "../../components/delete-doctor-dialog/delete-doctor-dialog";
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, map, debounceTime, filter } from 'rxjs/operators';

@Component({
  selector: 'app-doctor-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    TranslatePipe,
    DoctorFormComponent,
    DoctorItem
  ],
  templateUrl: './doctor-list.html',
  styleUrls: ['./doctor-list.css']
})
export class DoctorList implements OnInit, OnDestroy {
  showForm = false;
  editingDoctor: Doctor | null = null;
  private routeSubscription?: Subscription;
  private parentRouteSubscription?: Subscription;
  private lastLoadedOrganizationId: number | null = null; // Guardar el último organizationId cargado
  private isLoading = false; // Flag local para evitar recargas simultáneas
  private hasInitialized = false; // Flag para evitar múltiples inicializaciones

  constructor(
      public organizationStore: OrganizationStore,
      private dialog: MatDialog,
      private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Evitar múltiples inicializaciones
    if (this.hasInitialized) {
      return;
    }
    this.hasInitialized = true;

    // Primero, verificar la ruta actual al inicializar (solo una vez)
    const parentParams = this.route.parent?.snapshot.paramMap;
    if (parentParams) {
      const organizationIdStr = parentParams.get('organizationId');
      if (organizationIdStr) {
        const organizationId = parseInt(organizationIdStr, 10);
        if (organizationId && !this.isLoading) {
          // Verificar si los datos ya están cargados para este organizationId
          // Usar el método del store para verificar si ya se cargaron los datos
          const alreadyLoaded = this.organizationStore.isDoctorsLoadedForOrganization(organizationId);
          
          // Solo cargar si no hay datos cargados o si el organizationId cambió
          if (!alreadyLoaded && this.lastLoadedOrganizationId !== organizationId) {
            console.log(`DoctorList: Initial load for organizationId: ${organizationId}`);
            this.lastLoadedOrganizationId = organizationId;
            this.isLoading = true;
            this.organizationStore.loadDoctorsByOrganization(organizationId);
            
            // Resetear el flag cuando el loading termine
            const checkLoading = setInterval(() => {
              if (!this.organizationStore.loading() && this.isLoading) {
                clearInterval(checkLoading);
                setTimeout(() => {
                  this.isLoading = false;
                }, 100);
              }
            }, 100);
            
            // Limpiar el intervalo después de 5 segundos como fallback
            setTimeout(() => {
              clearInterval(checkLoading);
              this.isLoading = false;
            }, 5000);
          } else {
            console.log(`DoctorList: Data already loaded for organizationId: ${organizationId}, skipping load`);
            this.lastLoadedOrganizationId = organizationId;
          }
        }
      }
    }

    // Suscribirse a cambios en el parámetro de la ruta padre (:organizationId en /organization/:organizationId)
    // Usar distinctUntilChanged y debounceTime para evitar recargas innecesarias
    this.parentRouteSubscription = this.route.parent?.paramMap.pipe(
      map(params => {
        const organizationIdStr = params.get('organizationId');
        return organizationIdStr ? parseInt(organizationIdStr, 10) : null;
      }),
      filter(organizationId => organizationId !== null), // Filtrar valores null
      distinctUntilChanged(), // Solo emitir si el organizationId cambió
      debounceTime(500) // Esperar 500ms antes de procesar para evitar múltiples emisiones rápidas
    ).subscribe(organizationId => {
      if (organizationId && organizationId !== this.lastLoadedOrganizationId && !this.isLoading) {
        console.log(`DoctorList: Detected organization change, reloading doctors for organizationId: ${organizationId}`);
        this.lastLoadedOrganizationId = organizationId;
        this.isLoading = true;
        this.organizationStore.loadDoctorsByOrganization(organizationId);
        
        // Resetear el flag cuando el loading termine
        const checkLoading = setInterval(() => {
          if (!this.organizationStore.loading() && this.isLoading) {
            clearInterval(checkLoading);
            setTimeout(() => {
              this.isLoading = false;
            }, 100);
          }
        }, 100);
        
        // Limpiar el intervalo después de 5 segundos como fallback
        setTimeout(() => {
          clearInterval(checkLoading);
          this.isLoading = false;
        }, 5000);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    if (this.parentRouteSubscription) {
      this.parentRouteSubscription.unsubscribe();
    }
    // Resetear flags al destruir el componente
    this.hasInitialized = false;
    this.isLoading = false;
    this.lastLoadedOrganizationId = null;
  }

  openAddDoctorForm(): void {
    this.editingDoctor = null;
    this.showForm = true;
  }

  openEditDoctorForm(doctor: Doctor): void {
    this.editingDoctor = doctor;
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
  }

  onDoctorSaved(doctor: Doctor): void {
    // El store ya fue actualizado en el formulario
    // Recargar la lista de doctors para asegurar que solo se muestren los de la organización actual
    const organizationIdStr = this.route.parent?.snapshot.paramMap.get('organizationId');
    if (organizationIdStr) {
      const organizationId = parseInt(organizationIdStr, 10);
      if (organizationId > 0) {
        this.organizationStore.loadDoctorsByOrganization(organizationId);
      }
    }
    // Cerrar el formulario
    this.showForm = false;
  }

  onDoctorRemoved(doctor: Doctor): void {
    const dialogRef = this.dialog.open(DeleteDoctorDialog, {
      width: '400px',
      data: {
        doctor: doctor
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.organizationStore.deleteDoctor(doctor.id);
      }
    });
  }

  trackById(index: number, doctor: Doctor): number {
    return doctor.id;
  }
}
