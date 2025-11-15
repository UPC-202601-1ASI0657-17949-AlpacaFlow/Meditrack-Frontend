import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { OrganizationStore } from '../../../application/organization.store';
import { Caregiver } from '../../../domain/model/caregiver.entity';
import { DeleteCaregiverDialog } from '../../components/delete-caregiver-dialog/delete-caregiver-dialog';
import { CaregiverItem } from '../../components/caregiver-item/caregiver-item';
import { CaregiverForm } from '../caregiver-form/caregiver-form';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, map, debounceTime, filter } from 'rxjs/operators';

@Component({
  selector: 'app-caregiver-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    TranslatePipe,
    CaregiverForm,
    CaregiverItem
  ],
  templateUrl: './caregiver-list.html',
  styleUrls: ['./caregiver-list.css']
})
export class CaregiverListComponent implements OnInit, OnDestroy {
  showForm = false;
  editingCaregiver: Caregiver | null = null;
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
          const alreadyLoaded = this.organizationStore.isCaregiversLoadedForOrganization(organizationId);
          
          // Solo cargar si no hay datos cargados o si el organizationId cambió
          if (!alreadyLoaded && this.lastLoadedOrganizationId !== organizationId) {
            console.log(`CaregiverList: Initial load for organizationId: ${organizationId}`);
            this.lastLoadedOrganizationId = organizationId;
            this.isLoading = true;
            this.organizationStore.loadCaregiversByOrganization(organizationId);
            
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
            console.log(`CaregiverList: Data already loaded for organizationId: ${organizationId}, skipping load`);
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
        console.log(`CaregiverList: Detected organization change, reloading caregivers for organizationId: ${organizationId}`);
        this.lastLoadedOrganizationId = organizationId;
        this.isLoading = true;
        this.organizationStore.loadCaregiversByOrganization(organizationId);
        
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

  openAddCaregiverForm(): void {
    this.editingCaregiver = null;
    this.showForm = true;
  }

  openEditCaregiverForm(caregiver: Caregiver): void {
    this.editingCaregiver = caregiver;
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
  }

  onCaregiverSaved(caregiver: Caregiver): void {
    // El store ya fue actualizado en el formulario
    // Recargar la lista de caregivers para asegurar que solo se muestren los de la organización actual
    const organizationIdStr = this.route.parent?.snapshot.paramMap.get('organizationId');
    if (organizationIdStr) {
      const organizationId = parseInt(organizationIdStr, 10);
      if (organizationId > 0) {
        this.organizationStore.loadCaregiversByOrganization(organizationId);
      }
    }
    // Cerrar el formulario
    this.showForm = false;
  }

  onCaregiverRemoved(caregiver: Caregiver): void {
    const dialogRef = this.dialog.open(DeleteCaregiverDialog, {
      width: '400px',
      data: {
        caregiver: caregiver
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.organizationStore.deleteCaregiver(caregiver.id);
      }
    });
  }

  trackById(index: number, caregiver: Caregiver): number {
    return caregiver.id;
  }
}

