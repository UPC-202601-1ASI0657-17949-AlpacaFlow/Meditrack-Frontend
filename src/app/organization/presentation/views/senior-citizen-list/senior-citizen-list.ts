import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { OrganizationStore } from '../../../application/organization.store';
import { SeniorCitizen } from '../../../domain/model/senior-citizen.entity';
import { DeleteSeniorCitizenDialog } from '../../components/delete-senior-citizen-dialog/delete-senior-citizen-dialog';
import { SeniorCitizenItem } from '../../components/senior-citizen-item/senior-citizen-item';
import { SeniorCitizenForm } from '../senior-citizen-form/senior-citizen-form';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, map, debounceTime, filter } from 'rxjs/operators';

@Component({
  selector: 'app-senior-citizen-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    TranslatePipe,
    SeniorCitizenForm,
    SeniorCitizenItem
  ],
  templateUrl: './senior-citizen-list.html',
  styleUrls: ['./senior-citizen-list.css']
})
export class SeniorCitizenListComponent implements OnInit, OnDestroy {
  showForm = false;
  editingSeniorCitizen: SeniorCitizen | null = null;
  private routeSubscription?: Subscription;
  private parentRouteSubscription?: Subscription;
  private lastLoadedOrganizationId: number | null = null; // Guardar el último organizationId cargado
  private hasInitialized = false; // Flag para evitar múltiples inicializaciones

  constructor(
      public organizationStore: OrganizationStore,
      private dialog: MatDialog,
      private route: ActivatedRoute
  ) {}

  /**
   * Obtiene el rol del usuario desde la ruta o del store
   */
  getUserRole(): string {
    // Primero intentar obtener el rol de la ruta (más confiable)
    const userRoleFromRoute = this.route.snapshot.parent?.paramMap.get('userRole');
    if (userRoleFromRoute) {
      return userRoleFromRoute;
    }
    // Si no está en la ruta, usar el store
    return this.organizationStore.getCurrentUserRole();
  }

  /** Misma regla que en senior-citizen-item: admins de clínica o casa de reposo. */
  canManageSeniorCitizensRoster(): boolean {
    const r = (this.getUserRole() || '').toLowerCase();
    return r === 'admin' || r === 'admin-casa-reposo';
  }

  ngOnInit(): void {
    // Evitar múltiples inicializaciones
    if (this.hasInitialized) {
      return;
    }
    this.hasInitialized = true;

    // Cargar datos al inicializar el componente solo si no están ya cargados
    const parentParams = this.route.parent?.snapshot.paramMap;
    if (parentParams) {
      const organizationIdStr = parentParams.get('organizationId');
      if (organizationIdStr) {
        const organizationId = parseInt(organizationIdStr, 10);
        if (organizationId) {
          const isAlreadyLoaded = this.organizationStore.isSeniorCitizensLoadedForOrganization(organizationId);
          if (!isAlreadyLoaded && !this.organizationStore.loading()) {
            console.log(`SeniorCitizenList: Initial load for organizationId: ${organizationId}`);
            this.lastLoadedOrganizationId = organizationId;
            this.organizationStore.loadSeniorCitizensByOrganization(organizationId);
          }
        }
      }
    }

    // NO suscribirse a eventos de navegación aquí
    // Esto estaba causando recargas infinitas
    // En su lugar, confiamos en:
    // 1. La carga inicial en ngOnInit
    // 2. El parentRouteSubscription para cambios de organización
    // 3. onSeniorCitizenSaved() para recargar después de crear/editar

    // Suscribirse a cambios en el parámetro de la ruta padre (:organizationId)
    // Solo recargar si el organizationId realmente cambió
    this.parentRouteSubscription = this.route.parent?.paramMap.pipe(
      map(params => {
        const organizationIdStr = params.get('organizationId');
        return organizationIdStr ? parseInt(organizationIdStr, 10) : null;
      }),
      filter(organizationId => organizationId !== null),
      distinctUntilChanged(), // Solo emitir si el organizationId cambió
      debounceTime(500) // Esperar 500ms para evitar múltiples emisiones rápidas
    ).subscribe(organizationId => {
      // Solo recargar si:
      // 1. El organizationId cambió
      // 2. No está ya cargado
      // 3. No está cargando actualmente
      const isAlreadyLoaded = this.organizationStore.isSeniorCitizensLoadedForOrganization(organizationId!);
      if (organizationId && organizationId !== this.lastLoadedOrganizationId && !isAlreadyLoaded && !this.organizationStore.loading()) {
        console.log(`SeniorCitizenList: Detected organization change, reloading senior citizens for organizationId: ${organizationId}`);
        this.lastLoadedOrganizationId = organizationId;
        this.organizationStore.loadSeniorCitizensByOrganization(organizationId);
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
    this.lastLoadedOrganizationId = null;
  }

  openAddSeniorCitizenForm(): void {
    this.editingSeniorCitizen = null;
    this.showForm = true;
  }

  openEditSeniorCitizenForm(seniorCitizen: SeniorCitizen): void {
    this.editingSeniorCitizen = seniorCitizen;
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
  }

  onSeniorCitizenSaved(seniorCitizen: SeniorCitizen): void {
    // El store ya fue actualizado en el formulario
    // Recargar la lista de senior citizens para asegurar que solo se muestren los de la organización actual
    // Usar el mismo patrón que doctor-list: leer organizationId de la ruta
    const organizationIdStr = this.route.parent?.snapshot.paramMap.get('organizationId');
    if (organizationIdStr) {
      const organizationId = parseInt(organizationIdStr, 10);
      if (organizationId > 0) {
        this.organizationStore.loadSeniorCitizensByOrganization(organizationId);
      }
    }
    // Cerrar el formulario
    this.showForm = false;
  }

  onSeniorCitizenRemoved(seniorCitizen: SeniorCitizen): void {
    const dialogRef = this.dialog.open(DeleteSeniorCitizenDialog, {
      width: '400px',
      data: {
        seniorCitizen: seniorCitizen
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.organizationStore.deleteSeniorCitizen(seniorCitizen.id);
      }
    });
  }

  trackById(index: number, seniorCitizen: SeniorCitizen): number {
    return seniorCitizen.id;
  }
}
