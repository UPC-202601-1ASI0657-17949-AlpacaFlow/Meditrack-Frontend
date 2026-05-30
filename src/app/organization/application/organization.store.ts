import { computed, Injectable, Signal, signal, inject } from '@angular/core';
import { Observable, retry, take, switchMap, of, tap } from 'rxjs';

import { Doctor } from '../domain/model/doctor.entity';
import { Caregiver } from '../domain/model/caregiver.entity';
import { SeniorCitizen } from '../domain/model/senior-citizen.entity';
import { Organization } from '../domain/model/organization.entity';
import { Admin } from '../domain/model/admin.entity';
import { OrganizationApi } from '../infrastructure/organization-api';
import { AuthApi } from '../../auth/infrastructure/auth-api';
import { User } from '../../auth/domain/model/user.entity';

/**
 * State management store for doctors, caregivers, and senior citizens using Angular signals.
 */
@Injectable({
  providedIn: 'root'
})
export class OrganizationStore {

  readonly doctorCount = computed(() => this.doctors().length);
  private readonly doctorsSignal = signal<Doctor[]>([]);
  readonly doctors = this.doctorsSignal.asReadonly();
  private readonly selectedSeniorCitizenSignal = signal<SeniorCitizen | null>(null);
  readonly selectedSeniorCitizen = this.selectedSeniorCitizenSignal.asReadonly();
  readonly caregiverCount = computed(() => this.caregivers().length);
  private readonly caregiversSignal = signal<Caregiver[]>([]);
  readonly caregivers = this.caregiversSignal.asReadonly();
  readonly seniorCitizenCount = computed(() => this.seniorCitizens().length);
  private readonly seniorCitizensSignal = signal<SeniorCitizen[]>([]);
  readonly seniorCitizens = this.seniorCitizensSignal.asReadonly();
  readonly filteredSeniorCitizens = computed(() => {
    const role = this.getCurrentUserRole();
    const organizationId = this.getCurrentOrganizationId();
    const allSeniorCitizens = this.seniorCitizens();
    
    // Primero filtrar por organización
    const seniorCitizensInOrganization = organizationId > 0
      ? allSeniorCitizens.filter(sc => sc.organizationId === organizationId)
      : [];
    
    // Admin: ve TODOS los senior citizens de la organización
    if (role === 'admin') {
      return seniorCitizensInOrganization;
    }
    
    // Doctor: solo ve los senior citizens que se le asignaron
    if (role === 'doctor') {
      const doctorId = this.getCurrentUserEntityId();
      if (doctorId) {
        return seniorCitizensInOrganization.filter(sc =>
          sc.assignedDoctorId === doctorId
        );
      }
      return [];
    }
    
    // Caregiver: solo ve los senior citizens que se le asignaron
    if (role === 'caregiver') {
      const caregiverId = this.getCurrentUserEntityId();
      if (caregiverId) {
        return seniorCitizensInOrganization.filter(sc =>
          sc.assignedCaregiverId === caregiverId
        );
      }
      return [];
    }
    
    // Para cualquier otro rol, retornar todos los de la organización
    return seniorCitizensInOrganization;
  });

  private readonly currentUserIdSignal = signal<number | null>(null);
  readonly currentUserId = this.currentUserIdSignal.asReadonly();
  
  private readonly currentUserRoleSignal = signal<string>('');
  readonly currentUserRole = this.currentUserRoleSignal.asReadonly();
  private readonly currentOrganizationIdSignal = signal<number | null>(null);
  readonly currentOrganizationId = this.currentOrganizationIdSignal.asReadonly();
  private readonly currentOrganizationSignal = signal<Organization | null>(null);
  readonly currentOrganization = this.currentOrganizationSignal.asReadonly();
  
  private readonly loadedSeniorCitizensForOrgId = signal<number | null>(null);
  private readonly loadedDoctorsForOrgId = signal<number | null>(null);
  private readonly loadedCaregiversForOrgId = signal<number | null>(null);

  private readonly loadingSignal = signal<boolean>(false);
  readonly loading = this.loadingSignal.asReadonly();
  
  private readonly errorSignal = signal<string | null>(null);
  readonly error = this.errorSignal.asReadonly();
  
  private readonly seniorCitizensErrorSignal = signal<string | null>(null);
  readonly seniorCitizensError = this.seniorCitizensErrorSignal.asReadonly();
  
  private readonly doctorsErrorSignal = signal<string | null>(null);
  readonly doctorsError = this.doctorsErrorSignal.asReadonly();
  
  private readonly caregiversErrorSignal = signal<string | null>(null);
  readonly caregiversError = this.caregiversErrorSignal.asReadonly();

  private authApi = inject(AuthApi);

  constructor(
    private organizationApi: OrganizationApi
  ) {
  }


  loadOrganizationData(userId?: number): void {
    if (!userId) {
      userId = 1; // Default
    }

    console.log(`Searching for user with userId ${userId} in backend...`);

    this.organizationApi.getAdminByUserId(userId.toString()).pipe(take(1)).subscribe({
      next: (admin) => {
        if (admin) {
          const organizationId = admin.organizationId;
          console.log(`Found admin in backend: userId=${userId}, organizationId=${organizationId}`);
          this.loadOrganizationDataWithId(userId, organizationId, 'admin');
        } else {
          console.warn(`Admin not found in backend for userId ${userId}`);
          console.warn(`Tip: Ensure the user is registered in the backend or use loadOrganizationDataByOrganizationId(organizationId, userId)`);
        }
      },
      error: (err) => {
        console.error(`Error searching admin in backend: ${err.message}`);
        console.warn(`Tip: Check backend connection or ensure the user is registered in the backend`);
      }
    });
  }


  private tryLoadByOtherRoles(userId: number): void {
    console.warn(`tryLoadByOtherRoles called but is deprecated. User with id ${userId} not found in backend.`);
    console.warn(`Tip: Ensure the user is registered in the backend or use loadOrganizationDataByOrganizationId(organizationId, userId)`);
  }

  loadOrganizationDataWithId(userId: number, organizationId: number, role: string): void {
    this.currentUserIdSignal.set(userId);
    this.currentOrganizationIdSignal.set(organizationId);
    this.currentUserRoleSignal.set(role);
    console.log(`Loading organization data (userId: ${userId}, organizationId: ${organizationId}, role: ${role})`);

    this.loadOrganizationById(organizationId);
    

    setTimeout(() => {
      const organization = this.currentOrganizationSignal();
      if (organization) {
        const orgType = organization.type;
        console.log(`Loading data for organization type: ${orgType}`);
        
        if (orgType === 'clinic') {
          this.loadDoctorsByOrganization(organizationId);
          this.loadSeniorCitizensByOrganization(organizationId);
        } else if (orgType === 'resident') {
          // Para residencias: cargar caregivers y senior citizens
          this.loadCaregiversByOrganization(organizationId);
          this.loadSeniorCitizensByOrganization(organizationId);
        } else {
          // Si no se conoce el tipo, cargar todo (fallback)
          console.warn(`Unknown organization type: ${orgType}, loading all data`);
          this.loadDoctorsByOrganization(organizationId);
          this.loadCaregiversByOrganization(organizationId);
          this.loadSeniorCitizensByOrganization(organizationId);
        }
      } else {
        // Si no se pudo cargar la organización, intentar cargar todo como fallback
        console.warn(`Organization not loaded yet, loading all data as fallback`);
        this.loadDoctorsByOrganization(organizationId);
        this.loadCaregiversByOrganization(organizationId);
        this.loadSeniorCitizensByOrganization(organizationId);
      }
    }, 100);
  }

  /**
   * Loads all data for an organization by organizationId directly.
   * This method is useful for testing when you have an organizationId from the database
   * (e.g., from Swagger) and don't need to go through the user lookup process.
   * 
   * Works with:
   * - Organizations registered in Swagger
   * - Admins registered in Swagger (use their organizationId)
   * - Any organizationId from the database
   * 
   * @param organizationId - The organization ID to load data for (from Swagger/DB).
   * @param userId - Optional user ID. If provided, will search for admin/doctor/caregiver with this userId and set the role accordingly.
   */
  loadOrganizationDataByOrganizationId(organizationId: number, userId?: number | null): void {
    if (organizationId <= 0) {
      console.error(`Invalid organizationId: ${organizationId}`);
      return;
    }

    console.log(`Loading organization data directly for organizationId: ${organizationId}${userId ? `, userId: ${userId}` : ''}`);
    console.log(`📝 This works with organizations and admins registered in Swagger`);

    // Set the organizationId in the store
    this.currentOrganizationIdSignal.set(organizationId);

    // Si se proporciona userId, buscar el admin/doctor/caregiver correspondiente para establecer el rol
    if (userId) {
      this.currentUserIdSignal.set(userId);

      // Buscar admin por userId Y organizationId
      this.organizationApi.getAdminByUserIdAndOrganizationId(userId, organizationId).pipe(take(1)).subscribe({
        next: (admin) => {
          if (admin) {
            console.log(`Found admin in backend: userId=${userId}, organizationId=${organizationId}`);
            this.currentUserRoleSignal.set('admin');
            this.loadOrganizationDataWithId(userId, organizationId, 'admin');
          } else {
            console.log(`Admin not found for userId ${userId} in organization ${organizationId}, trying to find doctor...`);

            // Intentar buscar doctor
            this.organizationApi.getDoctorByUserIdAndOrganizationId(userId, organizationId).pipe(take(1)).subscribe({
              next: (doctor) => {
                if (doctor) {
                  console.log(`Found doctor in backend: userId=${userId}, organizationId=${organizationId}`);
                  this.currentUserRoleSignal.set('doctor');
                  this.loadOrganizationDataWithId(userId, organizationId, 'doctor');
                } else {
                  console.log(`Doctor not found for userId ${userId} in organization ${organizationId}, trying to find caregiver...`);

                  // Intentar buscar caregiver
                  this.organizationApi.getCaregiverByUserIdAndOrganizationId(userId, organizationId).pipe(take(1)).subscribe({
                    next: (caregiver) => {
                      if (caregiver) {
                        console.log(`Found caregiver in backend: userId=${userId}, organizationId=${organizationId}`);
                        this.currentUserRoleSignal.set('caregiver');
                        this.loadOrganizationDataWithId(userId, organizationId, 'caregiver');
                      } else {
                        console.log(`Caregiver not found for userId ${userId} in organization ${organizationId}, trying to find admin in organization...`);
                        this.findAndSetAdminFromOrganization(organizationId, userId);
                      }
                    },
                    error: (err3) => {
                      console.warn(`Error searching caregiver by userId and organizationId: ${err3.message}, trying to find admin in organization...`);
                      this.findAndSetAdminFromOrganization(organizationId, userId);
                    }
                  });
                }
              },
              error: (err2) => {
                console.warn(`Error searching doctor by userId and organizationId: ${err2.message}, trying to find caregiver...`);

                // Si falla doctor, intentar caregiver
                this.organizationApi.getCaregiverByUserIdAndOrganizationId(userId, organizationId).pipe(take(1)).subscribe({
                  next: (caregiver) => {
                    if (caregiver) {
                      console.log(`Found caregiver in backend: userId=${userId}, organizationId=${organizationId}`);
                      this.currentUserRoleSignal.set('caregiver');
                      this.loadOrganizationDataWithId(userId, organizationId, 'caregiver');
                    } else {
                      console.log(`Caregiver not found for userId ${userId} in organization ${organizationId}, trying to find admin in organization...`);
                      this.findAndSetAdminFromOrganization(organizationId, userId);
                    }
                  },
                  error: (err3) => {
                    console.warn(`Error searching caregiver by userId and organizationId: ${err3.message}, trying to find admin in organization...`);
                    this.findAndSetAdminFromOrganization(organizationId, userId);
                  }
                });
              }
            });
          }
        },
        error: (err) => {
          console.warn(`Error searching admin by userId and organizationId: ${err.message}, trying to find doctor...`);

          // Si falla admin, intentar doctor
          this.organizationApi.getDoctorByUserIdAndOrganizationId(userId, organizationId).pipe(take(1)).subscribe({
            next: (doctor) => {
              if (doctor) {
                console.log(`Found doctor in backend: userId=${userId}, organizationId=${organizationId}`);
                this.currentUserRoleSignal.set('doctor');
                this.loadOrganizationDataWithId(userId, organizationId, 'doctor');
              } else {
                console.log(`Doctor not found for userId ${userId} in organization ${organizationId}, trying to find caregiver...`);

                // Intentar caregiver
                this.organizationApi.getCaregiverByUserIdAndOrganizationId(userId, organizationId).pipe(take(1)).subscribe({
                  next: (caregiver) => {
                    if (caregiver) {
                      console.log(`Found caregiver in backend: userId=${userId}, organizationId=${organizationId}`);
                      this.currentUserRoleSignal.set('caregiver');
                      this.loadOrganizationDataWithId(userId, organizationId, 'caregiver');
                    } else {
                      console.log(`Caregiver not found for userId ${userId} in organization ${organizationId}, trying to find admin in organization...`);
                      this.findAndSetAdminFromOrganization(organizationId, userId);
                    }
                  },
                  error: (err3) => {
                    console.warn(`Error searching caregiver by userId and organizationId: ${err3.message}, trying to find admin in organization...`);
                    this.findAndSetAdminFromOrganization(organizationId, userId);
                  }
                });
              }
            },
            error: (err2) => {
              console.warn(`Error searching doctor by userId and organizationId: ${err2.message}, trying to find caregiver...`);
              this.organizationApi.getCaregiverByUserIdAndOrganizationId(userId, organizationId).pipe(take(1)).subscribe({
                next: (caregiver) => {
                  if (caregiver) {
                    console.log(`Found caregiver in backend: userId=${userId}, organizationId=${organizationId}`);
                    this.currentUserRoleSignal.set('caregiver');
                    this.loadOrganizationDataWithId(userId, organizationId, 'caregiver');
                  } else {
                    console.log(`Caregiver not found for userId ${userId} in organization ${organizationId}, trying to find admin in organization...`);
                    this.findAndSetAdminFromOrganization(organizationId, userId);
                  }
                },
                error: (err3) => {
                  console.warn(`Error searching caregiver by userId and organizationId: ${err3.message}, trying to find admin in organization...`);
                  this.findAndSetAdminFromOrganization(organizationId, userId);
                }
              });
            }
          });
        }
      });
    } else {
      // Si no se proporciona userId, solo cargar los datos de la organización
      this.loadOrganizationById(organizationId);
      this.loadDoctorsByOrganization(organizationId);
      this.loadCaregiversByOrganization(organizationId);
      this.loadSeniorCitizensByOrganization(organizationId);
    }
  }


  /**
   * Helper method to find an admin from an organization and set the role.
   * If userId is provided, tries to find that specific admin. Otherwise, uses the first admin found.
   * @param organizationId - The organization ID
   * @param userId - Optional user ID to search for
   */
  private findAndSetAdminFromOrganization(organizationId: number, userId?: number | null): void {
    this.organizationApi.getAdminsByOrganization(organizationId).pipe(take(1)).subscribe({
      next: (admins) => {
        if (admins && admins.length > 0) {
          let adminToUse: Admin | null = null;
          
          // Si se proporciona userId, buscar ese admin específico
          if (userId) {
            adminToUse = admins.find(a => a.userId === userId) || null;
          }
          
          // Si no se encontró el admin específico o no se proporcionó userId, usar el primero
          if (!adminToUse) {
            adminToUse = admins[0];
          }
          
          if (adminToUse && adminToUse.userId) {
            const adminUserId = adminToUse.userId;
            console.log(`Found admin in organization: userId=${adminUserId}, organizationId=${organizationId}`);
            this.currentUserIdSignal.set(adminUserId);
            this.currentUserRoleSignal.set('admin');
            this.loadOrganizationDataWithId(adminUserId, organizationId, 'admin');
          } else {
            // No se encontró ningún admin, cargar datos sin establecer rol
            console.warn(`No admin found in organization ${organizationId}, loading data without role`);
            this.loadOrganizationById(organizationId);
            this.loadDoctorsByOrganization(organizationId);
            this.loadCaregiversByOrganization(organizationId);
            this.loadSeniorCitizensByOrganization(organizationId);
          }
        } else {
          // No hay admins en la organización, cargar datos sin establecer rol
          console.warn(`No admins found in organization ${organizationId}, loading data without role`);
          this.loadOrganizationById(organizationId);
          this.loadDoctorsByOrganization(organizationId);
          this.loadCaregiversByOrganization(organizationId);
          this.loadSeniorCitizensByOrganization(organizationId);
        }
      },
      error: (err) => {
        console.error(`Error loading admins for organization ${organizationId}:`, err);
        // Cargar datos de la organización de todas formas
        this.loadOrganizationById(organizationId);
        this.loadDoctorsByOrganization(organizationId);
        this.loadCaregiversByOrganization(organizationId);
        this.loadSeniorCitizensByOrganization(organizationId);
      }
    });
  }

  /**
   * Gets the organization ID for a given user ID.
   * @deprecated Este método ya no es confiable porque depende de datos hardcoded.
   * Usar loadOrganizationDataByOrganizationId(organizationId, userId) o los métodos del store
   * que obtienen datos del backend.
   * 
   * Este método solo funciona si el userId coincide con el usuario actual cargado desde el backend.
   * 
   * @param userId - The user ID
   * @returns The organization ID of that user. Returns 0 if user not found or not loaded from backend.
   */
  getOrganizationIdByUserId(userId: number): number {
    // Intentar obtener el organizationId del signal actual si el userId coincide
    const currentUserId = this.currentUserIdSignal();
    if (currentUserId === userId) {
      return this.getCurrentOrganizationId();
    }
    // Si no coincide, retornar 0 (no se puede determinar sin consultar el backend)
    console.warn(`getOrganizationIdByUserId: Cannot determine organizationId for userId ${userId} without backend query. Use loadOrganizationDataByOrganizationId() instead.`);
    return 0;
  }

  /**
   * Gets the current user's organization ID.
   * Usa el organizationId establecido cuando se llamó a loadOrganizationData(userId).
   * @returns The organization ID. Returns 0 if no organizationId is set.
   */
  getCurrentOrganizationId(): number {
    const currentOrganizationId = this.currentOrganizationIdSignal();
    if (currentOrganizationId === null) {
      // Si no hay organizationId establecido, retornar 0 (indica que no se ha cargado ningún usuario)
      return 0;
    }
    return currentOrganizationId;
  }

  /**
   * Verifica si los senior citizens ya están cargados para un organizationId específico.
   * @param organizationId - El organizationId a verificar
   * @returns true si los datos ya están cargados (incluso si es array vacío), false en caso contrario
   */
  isSeniorCitizensLoadedForOrganization(organizationId: number): boolean {
    return this.loadedSeniorCitizensForOrgId() === organizationId;
  }

  /**
   * Verifica si los doctors ya están cargados para un organizationId específico.
   * @param organizationId - El organizationId a verificar
   * @returns true si los datos ya están cargados (incluso si es array vacío), false en caso contrario
   */
  isDoctorsLoadedForOrganization(organizationId: number): boolean {
    return this.loadedDoctorsForOrgId() === organizationId;
  }

  /**
   * Verifica si los caregivers ya están cargados para un organizationId específico.
   * @param organizationId - El organizationId a verificar
   * @returns true si los datos ya están cargados (incluso si es array vacío), false en caso contrario
   */
  isCaregiversLoadedForOrganization(organizationId: number): boolean {
    return this.loadedCaregiversForOrgId() === organizationId;
  }

  /**
   * Gets the current user's institution email domain.
   * Obtiene el dominio de la organización basándose en el organizationId.
   * Prioriza la organización cargada desde el backend, usa hardcoded como fallback.
   * @returns The institution email domain. Returns empty string if no userId is set or no domain found.
   */
  getInstitutionEmailDomain(): string {
    const organizationId = this.getCurrentOrganizationId();
    if (organizationId === 0) {
      return '';
    }
    
    // Usar la organización cargada desde el backend
    const loadedOrganization = this.currentOrganizationSignal();
    let organizationName = '';
    
    if (loadedOrganization && loadedOrganization.id === organizationId) {
      organizationName = loadedOrganization.name;
    } else {
      // Si no se ha cargado la organización, retornar string vacío
      console.warn(`Organization with id ${organizationId} not loaded from backend yet.`);
      return '';
    }
    
    if (!organizationName) {
      return '';
    }
    
    // Generar dominio basado en el nombre de la organización
    // Ej: "Clínica Ortega" -> "@clinicaortega.com"
    const domain = organizationName
      .toLowerCase()
      .replace(/\s+/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remover acentos
    
    return `@${domain}.com`;
  }

  /**
   * Gets the current user's institution name.
   * Prioriza la organización cargada desde el backend, usa hardcoded como fallback.
   * @returns The institution name. Returns empty string if no userId is set.
   */
  getInstitutionName(): string {
    const organizationId = this.getCurrentOrganizationId();
    if (organizationId === 0) {
      return '';
    }
    
    // Usar la organización cargada desde el backend
    const loadedOrganization = this.currentOrganizationSignal();
    if (loadedOrganization && loadedOrganization.id === organizationId) {
      return loadedOrganization.name;
    }
    
    // Si no se ha cargado la organización, retornar string vacío
    console.warn(`Organization with id ${organizationId} not loaded from backend yet.`);
    return '';
  }

  /**
   * Gets the current user's role.
   * El rol se determina desde el backend cuando se carga la organización.
   * 
   * @returns The role of the current user. Returns empty string if no userId is set or role not determined.
   */
  getCurrentUserRole(): string {
    // El rol se establece desde el backend cuando se encuentra un admin/doctor/caregiver
    return this.currentUserRoleSignal();
  }

  /**
   * Gets the current user's role for a specific userId (helper method para el layout).
   * @deprecated Este método ya no es confiable porque depende de datos hardcoded.
   * El rol se determina desde el backend. Usar getCurrentUserRole() si el userId coincide con el usuario actual.
   * 
   * @param userId - The user ID
   * @returns The role of the user. Returns empty string if userId doesn't match current user or role not determined.
   */
  getUserRoleByUserId(userId: number): string {
    const currentUserId = this.currentUserIdSignal();
    if (currentUserId === userId) {
      return this.getCurrentUserRole();
    }
    // Si no coincide, no se puede determinar sin consultar el backend
    console.warn(`getUserRoleByUserId: Cannot determine role for userId ${userId} without backend query.`);
    return '';
  }

  /**
   * Gets the entity ID of the current user (e.g., doctorId when role is 'doctor').
   * Para doctor: busca en Doctors por userId -> doctorId
   * Para caregiver: busca en Caregivers por userId -> caregiverId
   * Para admin: retorna null (no tiene entityId)
   * @returns The entity ID (doctorId, caregiverId, etc.) or null if not applicable.
   */
  getCurrentUserEntityId(): number | null {
    const currentUserId = this.currentUserIdSignal();
    if (currentUserId === null) {
      return null;
    }
    
    const role = this.getCurrentUserRole();
    if (!role) {
      return null;
    }

    if (role === 'doctor') {
      // Buscar doctor por userId en los doctores cargados
      const doctor = this.doctors().find(d => d.userId === currentUserId);
      return doctor ? doctor.id : null;
    } else if (role === 'caregiver') {
      // Buscar caregiver por userId en los caregivers cargados
      const caregiver = this.caregivers().find(c => c.userId === currentUserId);
      return caregiver ? caregiver.id : null;
    }

    // Admin no tiene entityId
    return null;
  }

  /**
   * Gets the current organization type.
   * @returns The organization type ('clinic' | 'resident') or null if not loaded.
   */
  getCurrentOrganizationType(): 'clinic' | 'resident' | null {
    const organization = this.currentOrganizationSignal();
    return organization ? organization.type : null;
  }

  /**
   * Loads an organization by its ID.
   * @param organizationId - The organization ID to load.
   */
  loadOrganizationById(organizationId: number): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    console.log('[OrganizationStore] Loading organization for organizationId:', organizationId);
    this.organizationApi.getOrganizationById(organizationId).pipe(take(1)).subscribe({
      next: organization => {
        console.log('[OrganizationStore] Loaded organization:', organization);
        this.currentOrganizationSignal.set(organization);
        this.loadingSignal.set(false);
      },
      error: err => {
        console.error(`[Store] Error loading organization for organizationId ${organizationId}:`, err);
        console.error(`[Store] Error details:`, {
          status: err?.status,
          statusText: err?.statusText,
          message: err?.message,
          url: err?.url,
          error: err?.error
        });
        this.errorSignal.set(this.formatError(err, 'Failed to load organization'));
        this.loadingSignal.set(false);
        // Don't set a default organization on error - let the error be displayed
        // The user should fix the backend connection issue
      }
    });
  }

  /**
   * Retrieves a doctor by its ID as a signal.
   * Optionally validates that the doctor belongs to the specified organization.
   * @param id - The ID of the doctor.
   * @param organizationId - Optional organization ID for validation.
   * @returns A Signal containing the Doctor object or undefined if not found or doesn't match organization.
   */
  getDoctorById(id: number | null | undefined, organizationId?: number): Signal<Doctor | undefined> {
    return computed(() => {
      if (!id) return undefined;
      const doctor = this.doctors().find(d => d.id === id);
      if (!doctor) return undefined;
      
      // Validate organizationId if provided
      if (organizationId !== undefined && doctor.organizationId !== organizationId) {
        return undefined;
      }
      
      return doctor;
    });
  }


  /**
   * Retrieves a caregiver by its ID as a signal.
   * Optionally validates that the caregiver belongs to the specified organization.
   * @param id - The ID of the caregiver.
   * @param organizationId - Optional organization ID for validation.
   * @returns A Signal containing the Caregiver object or undefined if not found or doesn't match organization.
   */
  getCaregiverById(id: number | null | undefined, organizationId?: number): Signal<Caregiver | undefined> {
    return computed(() => {
      if (!id) return undefined;
      const caregiver = this.caregivers().find(k => k.id === id);
      if (!caregiver) return undefined;
      
      // Validate organizationId if provided
      if (organizationId !== undefined && caregiver.organizationId !== organizationId) {
        return undefined;
      }
      
      return caregiver;
    });
  }

  /**
   * Retrieves a senior citizen by its ID as a signal.
   * Optionally validates that the senior citizen belongs to the specified organization.
   * @param id - The ID of the senior citizen.
   * @param organizationId - Optional organization ID for validation.
   * @returns A Signal containing the SeniorCitizen object or undefined if not found or doesn't match organization.
   */
  getSeniorCitizenById(id: number | null | undefined, organizationId?: number): Signal<SeniorCitizen | undefined> {
    return computed(() => {
      if (!id) return undefined;
      const seniorCitizen = this.seniorCitizens().find(sc => sc.id === id);
      if (!seniorCitizen) return undefined;
      
      // Validate organizationId if provided
      if (organizationId !== undefined && seniorCitizen.organizationId !== organizationId) {
        return undefined;
      }
      
      return seniorCitizen;
    });
  }

  /**
   * Gets senior citizens assigned to a specific doctor using doctor's assignedSeniorIds.
   * Only returns senior citizens from the same organization as the doctor.
   * @param doctorId - The ID of the doctor.
   * @param organizationId - Optional organization ID for validation.
   * @returns A Signal containing an array of senior citizens assigned to the doctor.
   */
  getSeniorCitizensByDoctorId(doctorId: number | null | undefined, organizationId?: number): Signal<SeniorCitizen[]> {
    return computed(() => {
      if (!doctorId) return [];
      const doctor = this.doctors().find(d => d.id === doctorId);
      if (!doctor) return [];
      
      // Validate doctor belongs to organization if provided
      if (organizationId && doctor.organizationId !== organizationId) {
        return [];
      }
      
      // Filter senior citizens by doctor's assignedSeniorIds and same organizationId
      return this.seniorCitizens().filter(seniorCitizen => 
        doctor.assignedSeniorIds.includes(seniorCitizen.id) && 
        seniorCitizen.organizationId === doctor.organizationId
      );
    });
  }

  /**
   * Loads a doctor by ID.
   * First checks the local list, then fetches from API if not found.
   * Updates the doctorsSignal when fetched from API.
   * @param doctorId - The doctor ID to load
   * @returns A Promise that resolves with the Doctor or null if not found
   */
  loadDoctorById(doctorId: number): Promise<Doctor | null> {
    const doctor = this.doctors().find(d => d.id === doctorId);
    if (doctor) return Promise.resolve(doctor);
    return new Promise((resolve, reject) => {
      this.organizationApi.getDoctorById(doctorId).pipe(take(1)).subscribe({
        next: fetched => {
          if (fetched) {
            const list = this.doctors();
            const idx = list.findIndex(d => d.id === fetched.id);
            idx >= 0 ? this.doctorsSignal.set(list.map((d, i) => i === idx ? fetched : d))
                     : this.doctorsSignal.set([...list, fetched]);
          }
          resolve(fetched);
        },
        error: err => reject(err)
      });
    });
  }

  /**
   * Loads a caregiver by ID.
   * First checks the local list, then fetches from API if not found.
   * Updates the caregiversSignal when fetched from API.
   * @param caregiverId - The caregiver ID to load
   * @returns A Promise that resolves with the Caregiver or null if not found
   */
  loadCaregiverById(caregiverId: number): Promise<Caregiver | null> {
    const caregiver = this.caregivers().find(k => k.id === caregiverId);
    if (caregiver) return Promise.resolve(caregiver);
    return new Promise((resolve, reject) => {
      this.organizationApi.getCaregiverById(caregiverId).pipe(take(1)).subscribe({
        next: fetched => {
          if (fetched) {
            const list = this.caregivers();
            const idx = list.findIndex(k => k.id === fetched.id);
            idx >= 0 ? this.caregiversSignal.set(list.map((k, i) => i === idx ? fetched : k))
                     : this.caregiversSignal.set([...list, fetched]);
          }
          resolve(fetched);
        },
        error: err => reject(err)
      });
    });
  }


  /**
   * Loads and selects a senior citizen by ID.
   * First checks the local list, then fetches from API if not found.
   * @param seniorCitizenId - The senior citizen ID to load
   */
  loadSeniorCitizenById(seniorCitizenId: number): void {
    const seniorCitizen = this.seniorCitizens().find(sc => sc.id === seniorCitizenId);
    if (seniorCitizen) {
      this.selectedSeniorCitizenSignal.set(seniorCitizen);
      return;
    }
    this.organizationApi.getSeniorCitizenById(seniorCitizenId).pipe(take(1)).subscribe({
      next: fetched => {
        if (fetched) {
          const current = this.seniorCitizens();
          const idx = current.findIndex(sc => sc.id === fetched.id);
          idx >= 0 ? this.seniorCitizensSignal.set(current.map((sc, i) => i === idx ? fetched : sc))
                   : this.seniorCitizensSignal.set([...current, fetched]);
          this.selectedSeniorCitizenSignal.set(fetched);
        } else {
          this.selectedSeniorCitizenSignal.set(null);
        }
      },
      error: () => this.selectedSeniorCitizenSignal.set(null)
    });
  }

  /**
   * Gets senior citizens assigned to a specific caregiver using caregiver's assignedSeniorIds.
   * Only returns senior citizens from the same organization as the caregiver.
   * @param caregiverId - The ID of the caregiver.
   * @param organizationId - Optional organization ID for validation.
   * @returns A Signal containing an array of senior citizens assigned to the caregiver.
   */
  getSeniorCitizensByCaregiverId(caregiverId: number | null | undefined, organizationId?: number): Signal<SeniorCitizen[]> {
    return computed(() => {
      if (!caregiverId) return [];
      const caregiver = this.caregivers().find(k => k.id === caregiverId);
      if (!caregiver) return [];
      
      // Validate caregiver belongs to organization if provided
      if (organizationId && caregiver.organizationId !== organizationId) {
        return [];
      }
      
      // Filter senior citizens by caregiver's assignedSeniorIds and same organizationId
      return this.seniorCitizens().filter(sc => 
        caregiver.assignedSeniorIds.includes(sc.id) && 
        sc.organizationId === caregiver.organizationId
      );
    });
  }

  /**
   * Adds a new doctor.
   * The backend automatically creates a user account when a doctor is created (if userId is not provided).
   * @param doctor - The doctor to add.
   * @returns Observable of the created doctor (HTTP success). Caller should handle errors (e.g. duplicate email/name).
   */
  addDoctor(doctor: Doctor): Observable<Doctor> {
    // No usar loadingSignal aquí: organization-layout oculta todo el router-outlet mientras loading()
    // es true, lo que destruye el formulario de médico y parece un fallo del sistema en errores 409.
    this.errorSignal.set(null);

    const doctorToCreate = new Doctor({
      id: 0,
      organizationId: doctor.organizationId,
      userId: null,
      firstName: doctor.firstName,
      lastName: doctor.lastName,
      age: doctor.age,
      email: doctor.email,
      specialty: doctor.specialty,
      phoneNumber: doctor.phoneNumber,
      imageUrl: doctor.imageUrl,
      assignedSeniorIds: doctor.assignedSeniorIds || []
    });

    return this.organizationApi.createDoctor(doctorToCreate).pipe(
      retry(2),
      tap(createdDoctor => {
        this.doctorsSignal.update(doctors => [...doctors, createdDoctor]);
        console.log(
          `[Store] Doctor created successfully. Email: ${createdDoctor.email}, UserId: ${createdDoctor.userId ?? 'n/a'}`
        );
      })
    );
  }

  /**
   * Updates an existing doctor.
   * @param updatedDoctor - The doctor to update.
   * @returns Observable of the updated doctor. Caller should handle errors (e.g. duplicate email/name).
   */
  updateDoctor(updatedDoctor: Doctor): Observable<Doctor> {
    this.errorSignal.set(null);
    return this.organizationApi.updateDoctor(updatedDoctor).pipe(
      retry(2),
      tap(doctor => {
        this.doctorsSignal.update(doctors => doctors.map(d => (d.id === doctor.id ? doctor : d)));
      })
    );
  }

  /**
   * Deletes a doctor by ID.
   * @param id - The ID of the doctor to delete.
   */
  deleteDoctor(id: number): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.organizationApi.deleteDoctor(id).pipe(retry(2)).subscribe({
      next: () => {
        this.doctorsSignal.update(doctors => doctors.filter(d => d.id !== id));
        // Remove this doctor's ID from all senior citizens' assignedDoctorId
        this.seniorCitizensSignal.update(seniorCitizens =>
          seniorCitizens.map(sc => {
            if (sc.assignedDoctorId === id) {
              sc.assignedDoctorId = null;
            }
            return sc;
          })
        );
        this.loadingSignal.set(false);
      },
      error: err => {
        this.errorSignal.set(this.formatError(err, 'Failed to delete doctor'));
        this.loadingSignal.set(false);
      }
    });
  }


  /**
   * Assigns a senior citizen to a doctor using domain logic.
   * Validates that both belong to the same organization.
   * Validates that the senior citizen is not already assigned to any caregiver (exclusión mutua).
   * If the senior citizen is already assigned to another doctor, it will be reassigned to the new doctor.
   * @param doctorId - The ID of the doctor.
   * @param seniorCitizenId - The ID of the senior citizen.
   * @throws Error if doctor or senior citizen don't belong to the same organization.
   * @throws Error if senior citizen is already assigned to a caregiver.
   */
  assignSeniorCitizenToDoctor(doctorId: number, seniorCitizenId: number): void {
    const doctor = this.doctors().find(d => d.id === doctorId);
    const seniorCitizen = this.seniorCitizens().find(sc => sc.id === seniorCitizenId);
    
    if (!doctor) {
      throw new Error(`Doctor with ID ${doctorId} not found`);
    }
    
    if (!seniorCitizen) {
      throw new Error(`Senior citizen with ID ${seniorCitizenId} not found`);
    }
    
    // Validate same organization
    if (doctor.organizationId !== seniorCitizen.organizationId) {
      throw new Error(
        `Cannot assign senior citizen to doctor: They belong to different organizations ` +
        `(Doctor: org ${doctor.organizationId}, Senior Citizen: org ${seniorCitizen.organizationId})`
      );
    }

    // Validate exclusión mutua: cannot be assigned to doctor if already assigned to caregiver
    if (!seniorCitizen.canBeAssignedToDoctor()) {
      throw new Error(
        `Cannot assign senior citizen to doctor: Senior citizen is already assigned to a caregiver. ` +
        `A senior citizen can only be assigned to doctors OR caregivers, not both.`
      );
    }

    // If senior citizen is already assigned to another doctor, unassign from the previous doctor
    const previousDoctorId = seniorCitizen.assignedDoctorId;
    if (previousDoctorId && previousDoctorId !== doctorId) {
      const previousDoctor = this.doctors().find(d => d.id === previousDoctorId);
      if (previousDoctor) {
        previousDoctor.unassignFromSenior(seniorCitizenId);
        this.doctorsSignal.update(doctors =>
          doctors.map(d => d.id === previousDoctorId ? previousDoctor : d)
        );
        // Persist unassignment of previous doctor
        this.organizationApi.updateDoctor(previousDoctor).pipe(retry(2)).subscribe({
          next: (updatedPreviousDoctor) => {
            this.doctorsSignal.update(doctors =>
              doctors.map(d => d.id === previousDoctorId ? updatedPreviousDoctor : d)
            );
          },
          error: err => console.error('Failed to persist previous doctor unassignment:', err)
        });
      }
    }

    // Use domain logic to assign
    doctor.assignToSenior(seniorCitizenId);
    seniorCitizen.assignedDoctorId = doctorId;

    // Update local state optimistically
    this.doctorsSignal.update(doctors =>
      doctors.map(d => d.id === doctorId ? doctor : d)
    );
    this.seniorCitizensSignal.update(seniorCitizens =>
      seniorCitizens.map(sc => sc.id === seniorCitizenId ? seniorCitizen : sc)
    );

    // Validate IDs before sending to API
    if (!doctorId || doctorId <= 0) {
      throw new Error(`Invalid doctorId: ${doctorId}`);
    }
    if (!seniorCitizenId || seniorCitizenId <= 0) {
      throw new Error(`Invalid seniorCitizenId: ${seniorCitizenId}`);
    }
    
    console.log(`[Store] Calling API to assign seniorCitizenId=${seniorCitizenId} to doctorId=${doctorId}`);
    
    // Persist assignment via organization microservice
    this.organizationApi.assignSeniorCitizenToDoctor(doctorId, seniorCitizenId).pipe(retry(2)).subscribe({
      next: (updatedSeniorCitizen) => {
        console.log(`[Store] Assignment successful. Updated senior citizen:`, {
          id: updatedSeniorCitizen.id,
          assignedDoctorId: updatedSeniorCitizen.assignedDoctorId,
          expectedDoctorId: doctorId
        });

        this.seniorCitizensSignal.update(seniorCitizens =>
          seniorCitizens.map(sc => sc.id === seniorCitizenId ? updatedSeniorCitizen : sc)
        );
        this.loadDoctorsByOrganization(doctor.organizationId);
        this.loadSeniorCitizensByOrganization(doctor.organizationId);
      },
      error: err => {
        console.error('[Store] Failed to persist doctor assignment:', err);
        console.error('[Store] Error details:', {
          status: err?.status,
          statusText: err?.statusText,
          message: err?.message,
          error: err?.error,
          url: err?.url
        });
        // Revert optimistic update
        doctor.unassignFromSenior(seniorCitizenId);
        seniorCitizen.assignedDoctorId = previousDoctorId;
        this.doctorsSignal.update(doctors =>
          doctors.map(d => d.id === doctorId ? doctor : d)
        );
        this.seniorCitizensSignal.update(seniorCitizens =>
          seniorCitizens.map(sc => sc.id === seniorCitizenId ? seniorCitizen : sc)
        );
      }
    });
  }

  /**
   * Unassigns a senior citizen from a doctor using domain logic.
   * Validates that both belong to the same organization.
   * @param doctorId - The ID of the doctor.
   * @param seniorCitizenId - The ID of the senior citizen.
   * @throws Error if doctor or senior citizen don't belong to the same organization.
   */
  unassignSeniorCitizenFromDoctor(doctorId: number, seniorCitizenId: number): void {
    const doctor = this.doctors().find(d => d.id === doctorId);
    const seniorCitizen = this.seniorCitizens().find(sc => sc.id === seniorCitizenId);
    
    if (!doctor) {
      throw new Error(`Doctor with ID ${doctorId} not found`);
    }
    
    if (!seniorCitizen) {
      throw new Error(`Senior citizen with ID ${seniorCitizenId} not found`);
    }
    
    if (doctor.organizationId !== seniorCitizen.organizationId) {
      throw new Error(
        `Cannot unassign senior citizen from doctor: They belong to different organizations ` +
        `(Doctor: org ${doctor.organizationId}, Senior Citizen: org ${seniorCitizen.organizationId})`
      );
    }

    // Use domain logic to unassign
    doctor.unassignFromSenior(seniorCitizenId);
    seniorCitizen.assignedDoctorId = null;

    // Update local state optimistically
    this.doctorsSignal.update(doctors =>
      doctors.map(d => d.id === doctorId ? doctor : d)
    );
    this.seniorCitizensSignal.update(seniorCitizens =>
      seniorCitizens.map(sc => sc.id === seniorCitizenId ? seniorCitizen : sc)
    );

    // Persist unassignment via organization microservice
    this.organizationApi.unassignSeniorCitizenFromDoctor(doctorId, seniorCitizenId).pipe(retry(2)).subscribe({
      next: () => {
        // Reload doctors and senior citizens to get updated state from backend
        this.loadDoctorsByOrganization(doctor.organizationId);
        this.loadSeniorCitizensByOrganization(doctor.organizationId);
      },
      error: err => {
        console.error('Failed to persist doctor unassignment:', err);
        // Revert optimistic update
        doctor.assignToSenior(seniorCitizenId);
        seniorCitizen.assignedDoctorId = doctorId;
        this.doctorsSignal.update(doctors =>
          doctors.map(d => d.id === doctorId ? doctor : d)
        );
        this.seniorCitizensSignal.update(seniorCitizens =>
          seniorCitizens.map(sc => sc.id === seniorCitizenId ? seniorCitizen : sc)
        );
      }
    });
  }

  /**
   * Assigns a senior citizen to a caregiver using domain logic.
   * Validates that both belong to the same organization.
   * Validates that the senior citizen is not already assigned to any doctor (exclusión mutua).
   * If the senior citizen is already assigned to another caregiver, it will be reassigned to the new caregiver.
   * @param caregiverId - The ID of the caregiver.
   * @param seniorCitizenId - The ID of the senior citizen.
   * @throws Error if caregiver or senior citizen don't belong to the same organization.
   * @throws Error if senior citizen is already assigned to a doctor.
   */
  assignSeniorCitizenToCaregiver(caregiverId: number, seniorCitizenId: number): void {
    const caregiver = this.caregivers().find(k => k.id === caregiverId);
    const seniorCitizen = this.seniorCitizens().find(sc => sc.id === seniorCitizenId);
    
    if (!caregiver) {
      throw new Error(`Caregiver with ID ${caregiverId} not found`);
    }
    
    if (!seniorCitizen) {
      throw new Error(`Senior citizen with ID ${seniorCitizenId} not found`);
    }
    
    // Validate same organization
    if (caregiver.organizationId !== seniorCitizen.organizationId) {
      throw new Error(
        `Cannot assign senior citizen to caregiver: They belong to different organizations ` +
        `(Caregiver: org ${caregiver.organizationId}, Senior Citizen: org ${seniorCitizen.organizationId})`
      );
    }

    // Validate exclusión mutua: cannot be assigned to caregiver if already assigned to doctor
    if (!seniorCitizen.canBeAssignedToCaregiver()) {
      throw new Error(
        `Cannot assign senior citizen to caregiver: Senior citizen is already assigned to a doctor. ` +
        `A senior citizen can only be assigned to doctors OR caregivers, not both.`
      );
    }

    // If senior citizen is already assigned to another caregiver, unassign from the previous caregiver
    const previousCaregiverId = seniorCitizen.assignedCaregiverId;
    if (previousCaregiverId && previousCaregiverId !== caregiverId) {
      const previousCaregiver = this.caregivers().find(c => c.id === previousCaregiverId);
      if (previousCaregiver) {
        previousCaregiver.unassignFromSenior(seniorCitizenId);
        this.caregiversSignal.update(caregivers =>
          caregivers.map(c => c.id === previousCaregiverId ? previousCaregiver : c)
        );
        // Persist unassignment of previous caregiver using the assignment endpoint
        this.organizationApi.unassignSeniorCitizenFromCaregiver(previousCaregiverId, seniorCitizenId).pipe(retry(2)).subscribe({
          next: () => {
            console.log(`[Store] Successfully unassigned senior citizen ${seniorCitizenId} from previous caregiver ${previousCaregiverId}`);
          },
          error: err => console.error('Failed to persist previous caregiver unassignment:', err)
        });
      }
    }

    // Use domain logic to assign
    caregiver.assignToSenior(seniorCitizenId);
    seniorCitizen.assignedCaregiverId = caregiverId;

    // Update local state optimistically
    this.caregiversSignal.update(caregivers =>
      caregivers.map(c => c.id === caregiverId ? caregiver : c)
    );
    this.seniorCitizensSignal.update(seniorCitizens =>
      seniorCitizens.map(sc => sc.id === seniorCitizenId ? seniorCitizen : sc)
    );

    console.log(`[Store] Calling API to assign seniorCitizenId=${seniorCitizenId} to caregiverId=${caregiverId}`);
    
    // Persist assignment via organization microservice
    this.organizationApi.assignSeniorCitizenToCaregiver(caregiverId, seniorCitizenId).pipe(retry(2)).subscribe({
      next: (updatedSeniorCitizen) => {
        console.log(`[Store] Assignment successful. Updated senior citizen:`, {
          id: updatedSeniorCitizen.id,
          name: updatedSeniorCitizen.fullName,
          assignedCaregiverId: updatedSeniorCitizen.assignedCaregiverId,
          expectedCaregiverId: caregiverId
        });
        
        // Update senior citizen with server response (backend is source of truth)
        this.seniorCitizensSignal.update(seniorCitizens =>
          seniorCitizens.map(sc => sc.id === seniorCitizenId ? updatedSeniorCitizen : sc)
        );
        
        // Reload caregivers to get updated assignedSeniorIds from backend
        this.loadCaregiversByOrganization(caregiver.organizationId);
        // Reload senior citizens to ensure we have the latest data from backend
        // This ensures consistency, and since we no longer recalculate assignments,
        // the backend's assignedCaregiverId will be preserved
        this.loadSeniorCitizensByOrganization(caregiver.organizationId);
      },
      error: err => {
        console.error('[Store] Failed to persist caregiver assignment:', err);
        console.error('[Store] Error details:', {
          status: err?.status,
          statusText: err?.statusText,
          message: err?.message,
          error: err?.error,
          url: err?.url
        });
        // Revert optimistic update
        caregiver.unassignFromSenior(seniorCitizenId);
        seniorCitizen.assignedCaregiverId = previousCaregiverId;
        this.caregiversSignal.update(caregivers =>
          caregivers.map(c => c.id === caregiverId ? caregiver : c)
        );
        this.seniorCitizensSignal.update(seniorCitizens =>
          seniorCitizens.map(sc => sc.id === seniorCitizenId ? seniorCitizen : sc)
        );
      }
    });
  }

  /**
   * Unassigns a senior citizen from a caregiver using domain logic.
   * Validates that both belong to the same organization.
   * Similar implementation to unassignSeniorCitizenFromDoctor for consistency.
   * @param caregiverId - The ID of the caregiver.
   * @param seniorCitizenId - The ID of the senior citizen.
   * @throws Error if caregiver or senior citizen don't belong to the same organization.
   */
  unassignSeniorCitizenFromCaregiver(caregiverId: number, seniorCitizenId: number): void {
    const caregiver = this.caregivers().find(k => k.id === caregiverId);
    const seniorCitizen = this.seniorCitizens().find(sc => sc.id === seniorCitizenId);
    
    if (!caregiver) {
      throw new Error(`Caregiver with ID ${caregiverId} not found`);
    }
    
    if (!seniorCitizen) {
      throw new Error(`Senior citizen with ID ${seniorCitizenId} not found`);
    }
    
    if (caregiver.organizationId !== seniorCitizen.organizationId) {
      throw new Error(
        `Cannot unassign senior citizen from caregiver: They belong to different organizations ` +
        `(Caregiver: org ${caregiver.organizationId}, Senior Citizen: org ${seniorCitizen.organizationId})`
      );
    }

    // Use domain logic to unassign
    caregiver.unassignFromSenior(seniorCitizenId);
    seniorCitizen.assignedCaregiverId = null;

    // Update local state optimistically
    this.caregiversSignal.update(caregivers =>
      caregivers.map(c => c.id === caregiverId ? caregiver : c)
    );
    this.seniorCitizensSignal.update(seniorCitizens =>
      seniorCitizens.map(sc => sc.id === seniorCitizenId ? seniorCitizen : sc)
    );

    console.log(`[Store] Calling API to unassign seniorCitizenId=${seniorCitizenId} from caregiverId=${caregiverId}`);
    
    // Persist unassignment via organization microservice
    this.organizationApi.unassignSeniorCitizenFromCaregiver(caregiverId, seniorCitizenId).pipe(retry(2)).subscribe({
      next: () => {
        console.log(`[Store] Unassignment successful: seniorCitizenId=${seniorCitizenId} from caregiverId=${caregiverId}`);
        
        // Reload caregivers to get updated assignedSeniorIds from backend
        this.loadCaregiversByOrganization(caregiver.organizationId);
        // Reload senior citizens to ensure we have the latest data from backend
        this.loadSeniorCitizensByOrganization(caregiver.organizationId);
      },
      error: err => {
        console.error('[Store] Failed to persist caregiver unassignment:', err);
        console.error('[Store] Error details:', {
          status: err?.status,
          statusText: err?.statusText,
          message: err?.message,
          error: err?.error,
          url: err?.url
        });
        // Revert optimistic update
        caregiver.assignToSenior(seniorCitizenId);
        seniorCitizen.assignedCaregiverId = caregiverId;
        this.caregiversSignal.update(caregivers =>
          caregivers.map(c => c.id === caregiverId ? caregiver : c)
        );
        this.seniorCitizensSignal.update(seniorCitizens =>
          seniorCitizens.map(sc => sc.id === seniorCitizenId ? seniorCitizen : sc)
        );
      }
    });
  }


  /**
   * Adds a new caregiver.
   * The backend automatically creates a user account when a caregiver is created (if userId is not provided).
   * @param caregiver - The caregiver to add.
   * @returns Observable of the created caregiver (HTTP success). Caller should handle errors (e.g. duplicate email/name).
   */
  addCaregiver(caregiver: Caregiver): Observable<Caregiver> {
    this.errorSignal.set(null);

    const caregiverToCreate = new Caregiver({
      id: 0,
      organizationId: caregiver.organizationId,
      userId: null,
      firstName: caregiver.firstName,
      lastName: caregiver.lastName,
      age: caregiver.age,
      email: caregiver.email,
      phoneNumber: caregiver.phoneNumber,
      imageUrl: caregiver.imageUrl,
      assignedSeniorIds: caregiver.assignedSeniorIds || []
    });

    return this.organizationApi.createCaregiver(caregiverToCreate).pipe(
      retry(2),
      tap(createdCaregiver => {
        this.caregiversSignal.update(caregivers => [...caregivers, createdCaregiver]);
        console.log(
          `[Store] Caregiver created successfully. Email: ${createdCaregiver.email}, UserId: ${createdCaregiver.userId ?? 'n/a'}`
        );
      })
    );
  }

  /**
   * Updates an existing caregiver.
   * @param updatedCaregiver - The caregiver to update.
   * @returns Observable of the updated caregiver. Caller should handle errors (e.g. duplicate email/name).
   */
  updateCaregiver(updatedCaregiver: Caregiver): Observable<Caregiver> {
    this.errorSignal.set(null);
    return this.organizationApi.updateCaregiver(updatedCaregiver).pipe(
      retry(2),
      tap(caregiver => {
        this.caregiversSignal.update(caregivers => caregivers.map(k => (k.id === caregiver.id ? caregiver : k)));
      })
    );
  }

  /**
   * Deletes a caregiver by ID.
   * @param id - The ID of the caregiver to delete.
   */
  deleteCaregiver(id: number): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.organizationApi.deleteCaregiver(id).pipe(retry(2)).subscribe({
      next: () => {
        this.caregiversSignal.update(caregivers => caregivers.filter(k => k.id !== id));
        // Remove this caregiver's ID from all senior citizens' assignedCaregiverId
        this.seniorCitizensSignal.update(seniorCitizens =>
          seniorCitizens.map(sc => {
            if (sc.assignedCaregiverId === id) {
              sc.assignedCaregiverId = null;
            }
            return sc;
          })
        );
        this.loadingSignal.set(false);
      },
      error: err => {
        this.errorSignal.set(this.formatError(err, 'Failed to delete caregiver'));
        this.loadingSignal.set(false);
      }
    });
  }


  /**
   * Adds a new senior citizen.
   * Validates that the senior citizen belongs to the current organization.
   * @param seniorCitizen - The senior citizen to add.
   * @throws Error if senior citizen doesn't belong to the current organization.
   */
  addSeniorCitizen(seniorCitizen: SeniorCitizen): Observable<SeniorCitizen> {
    const currentOrganizationId = this.getCurrentOrganizationId();

    if (currentOrganizationId === 0) {
      throw new Error('Cannot create senior citizen: No organization context available');
    }

    if (seniorCitizen.organizationId !== currentOrganizationId) {
      throw new Error(
        `Cannot create senior citizen: organizationId mismatch. ` +
        `Expected ${currentOrganizationId}, got ${seniorCitizen.organizationId}. ` +
        `A senior citizen can only be created for the current organization.`
      );
    }

    // No loadingSignal: el layout oculta el router-outlet y el formulario desaparece (igual que doctores).
    this.seniorCitizensErrorSignal.set(null);
    return this.organizationApi.createSeniorCitizen(seniorCitizen).pipe(
      retry(2),
      tap(createdSeniorCitizen => {
        if (createdSeniorCitizen.organizationId === currentOrganizationId) {
          this.seniorCitizensSignal.update(seniorCitizens => [...seniorCitizens, createdSeniorCitizen]);
        } else {
          console.warn(
            `Created senior citizen has different organizationId (${createdSeniorCitizen.organizationId}) ` +
            `than current (${currentOrganizationId}). Not adding to list.`
          );
        }
        this.seniorCitizensErrorSignal.set(null);
      })
    );
  }

  /**
   * Updates an existing senior citizen.
   * Validates that the senior citizen belongs to the current organization and prevents organizationId changes.
   * @param updatedSeniorCitizen - The senior citizen to update.
   * @throws Error if senior citizen doesn't belong to the current organization or organizationId is changed.
   */
  updateSeniorCitizen(updatedSeniorCitizen: SeniorCitizen): Observable<SeniorCitizen> {
    const currentOrganizationId = this.getCurrentOrganizationId();

    if (currentOrganizationId === 0) {
      throw new Error('Cannot update senior citizen: No organization context available');
    }

    if (updatedSeniorCitizen.organizationId !== currentOrganizationId) {
      throw new Error(
        `Cannot update senior citizen: organizationId mismatch. ` +
        `Expected ${currentOrganizationId}, got ${updatedSeniorCitizen.organizationId}. ` +
        `A senior citizen can only be updated within its organization.`
      );
    }

    const existingSeniorCitizen = this.seniorCitizens().find(sc => sc.id === updatedSeniorCitizen.id);
    if (existingSeniorCitizen && existingSeniorCitizen.organizationId !== updatedSeniorCitizen.organizationId) {
      throw new Error(
        `Cannot update senior citizen: Cannot change organizationId. ` +
        `Original: ${existingSeniorCitizen.organizationId}, Attempted: ${updatedSeniorCitizen.organizationId}. ` +
        `A senior citizen cannot be moved to a different organization.`
      );
    }

    return this.organizationApi.updateSeniorCitizen(updatedSeniorCitizen).pipe(
      retry(2),
      tap(seniorCitizen => {
        if (seniorCitizen.organizationId === currentOrganizationId) {
          this.seniorCitizensSignal.update(seniorCitizens =>
            seniorCitizens.map(sc => (sc.id === seniorCitizen.id ? seniorCitizen : sc))
          );
        } else {
          console.warn(
            `Updated senior citizen has different organizationId (${seniorCitizen.organizationId}) ` +
            `than current (${currentOrganizationId}). Removing from list.`
          );
          this.seniorCitizensSignal.update(seniorCitizens => seniorCitizens.filter(sc => sc.id !== seniorCitizen.id));
        }
      })
    );
  }

  /**
   * Deletes a senior citizen by ID.
   * @param id - The ID of the senior citizen to delete.
   */
  deleteSeniorCitizen(id: number): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.organizationApi.deleteSeniorCitizen(id).pipe(retry(2)).subscribe({
      next: () => {
        this.seniorCitizensSignal.update(seniorCitizens => seniorCitizens.filter(sc => sc.id !== id));
        this.loadingSignal.set(false);
      },
      error: err => {
        this.errorSignal.set(this.formatError(err, 'Failed to delete senior citizen'));
        this.loadingSignal.set(false);
      }
    });
  }

  /**
   * Loads doctors by organization ID.
   * @param organizationId - The organization ID to filter doctors.
   */
  loadDoctorsByOrganization(organizationId: number): void {
    console.log(`[Store] Loading doctors for organizationId: ${organizationId}`);
    this.loadingSignal.set(true);
    // No limpiar el errorSignal aquí para no sobrescribir errores importantes
    
    this.organizationApi.getDoctorsByOrganization(organizationId).pipe(take(1)).subscribe({
      next: doctors => {
        // Validate that all loaded doctors belong to the requested organization
        const invalidDoctors = doctors.filter(d => d.organizationId !== organizationId);
        if (invalidDoctors.length > 0) {
          console.warn(
            `[Store] Found ${invalidDoctors.length} doctor(s) with different organizationId. ` +
            `Expected: ${organizationId}, Filtering them out.`
          );
        }
        
        // Filter to ensure only doctors from the requested organization are stored
        const validDoctors = doctors.filter(d => d.organizationId === organizationId);
        console.log(`[Store] Loaded ${validDoctors.length} doctor(s) for organizationId: ${organizationId}`);
        
        this.doctorsSignal.set(validDoctors);
        this.loadedDoctorsForOrgId.set(organizationId); // Marcar como cargado
        
        // NOTE: We don't recalculate senior citizen assignments here because the backend
        // is the source of truth and already includes assignedDoctorId and assignedCaregiverId
        // in the SeniorCitizenResource. Recalculating would overwrite backend data with
        // potentially stale local data.
        
        this.loadingSignal.set(false);
      },
      error: err => {
        // Verificar si es un error 404 y si la organización es tipo "resident"
        // En ese caso, es esperado que no haya doctors, así que no es un error fatal
        const organization = this.currentOrganizationSignal();
        const isResident = organization?.type === 'resident';
        const is404 = err?.status === 404;
        
        if (is404 && isResident) {
          // Para organizaciones tipo "resident", un 404 de doctors es esperado
          console.log(`[Store] No doctors found for resident organization ${organizationId} (expected)`);
          this.doctorsSignal.set([]); // Establecer array vacío
          this.doctorsErrorSignal.set(null); // Limpiar error
          this.loadedDoctorsForOrgId.set(organizationId); // Marcar como cargado (aunque esté vacío)
          this.loadingSignal.set(false);
        } else if (is404) {
          // Para otros casos, un 404 también puede ser válido (lista vacía)
          console.log(`[Store] No doctors found for organizationId ${organizationId} (empty list, not an error)`);
          this.doctorsSignal.set([]);
          this.doctorsErrorSignal.set(null); // Limpiar error
          this.loadedDoctorsForOrgId.set(organizationId); // Marcar como cargado (aunque esté vacío)
          this.loadingSignal.set(false);
        } else {
          // Error real al cargar - establecer error específico de doctors (no bloquea el layout)
          console.error(`[Store] Error loading doctors for organizationId ${organizationId}:`, err);
          console.error(`[Store] Error details:`, {
            status: err?.status,
            statusText: err?.statusText,
            message: err?.message,
            url: err?.url,
            error: err?.error
          });
          // Establecer error específico de doctors (el componente puede mostrarlo)
          this.doctorsErrorSignal.set(this.formatError(err, 'Failed to load doctors'));
          this.loadingSignal.set(false);
        }
      }
    });
  }

  /**
   * Loads senior citizens by organization ID.
   * After loading, calculates assignedDoctorId and assignedCaregiverId from doctors and caregivers.
   * @param organizationId - The organization ID to filter senior citizens.
   */
  loadSeniorCitizensByOrganization(organizationId: number): void {
    console.log(`[Store] Loading senior citizens for organizationId: ${organizationId}`);
    this.loadingSignal.set(true);
    // No limpiar el errorSignal aquí para no sobrescribir errores importantes
    
    this.organizationApi.getSeniorCitizensByOrganization(organizationId).pipe(take(1)).subscribe({
      next: seniorCitizens => {
        // Validate that all loaded senior citizens belong to the requested organization
        const invalidSeniorCitizens = seniorCitizens.filter(sc => sc.organizationId !== organizationId);
        if (invalidSeniorCitizens.length > 0) {
          console.warn(
            `[Store] Found ${invalidSeniorCitizens.length} senior citizen(s) with different organizationId. ` +
            `Expected: ${organizationId}, Filtering them out.`
          );
        }
        
        // Filter to ensure only senior citizens from the requested organization are stored
        const validSeniorCitizens = seniorCitizens.filter(sc => sc.organizationId === organizationId);
        
        // NOTE: We trust the backend's assignedDoctorId and assignedCaregiverId values.
        // The backend already includes these fields in SeniorCitizenResource, so we don't need to calculate them.
        // The calculateAssignments method was overwriting backend data with potentially stale local data.
        
        console.log(`[Store] Loaded ${validSeniorCitizens.length} senior citizen(s) for organizationId: ${organizationId}`);
        console.log(`[Store] Senior citizens with assignments:`, validSeniorCitizens.map(sc => ({
          id: sc.id,
          name: sc.fullName,
          assignedDoctorId: sc.assignedDoctorId,
          assignedCaregiverId: sc.assignedCaregiverId
        })));
        
        this.seniorCitizensSignal.set(validSeniorCitizens);
        this.seniorCitizensErrorSignal.set(null); // Limpiar error al cargar exitosamente
        this.loadedSeniorCitizensForOrgId.set(organizationId); // Marcar como cargado
        this.loadingSignal.set(false);
      },
      error: err => {
        // Un 404 o lista vacía NO es un error - es un estado válido
        // Para admins, esto permite mostrar los botones de registro
        // Para doctors/caregivers, esto muestra que no tienen asignados
        const is404 = err?.status === 404;
        
        if (is404) {
          // Un 404 significa que no hay senior citizens - esto es válido, no es un error
          console.log(`[Store] No senior citizens found for organizationId ${organizationId} (empty list, not an error)`);
          this.seniorCitizensSignal.set([]); // Establecer array vacío
          this.seniorCitizensErrorSignal.set(null); // Limpiar error
          this.loadedSeniorCitizensForOrgId.set(organizationId); // Marcar como cargado (aunque esté vacío)
          this.loadingSignal.set(false);
          // No establecer errorSignal - esto permite mostrar los botones de registro para admins
        } else {
          // Error real al cargar - establecer error específico de senior citizens (no bloquea el layout)
          console.error(`[Store] Error loading senior citizens for organizationId ${organizationId}:`, err);
          console.error(`[Store] Error details:`, {
            status: err?.status,
            statusText: err?.statusText,
            message: err?.message,
            url: err?.url,
            error: err?.error
          });
          // Establecer error específico de senior citizens (el componente puede mostrarlo)
          this.seniorCitizensErrorSignal.set(this.formatError(err, 'Failed to load senior citizens'));
          this.loadingSignal.set(false);
        }
      }
    });
  }

  private calculateAssignments(seniorCitizens: SeniorCitizen[]): SeniorCitizen[] {
    const doctors = this.doctors();
    const caregivers = this.caregivers();
    
    return seniorCitizens.map(sc => {
      // Find which doctor has this senior citizen in their assignedSeniorIds
      const assignedDoctor = doctors.find(d => d.assignedSeniorIds.includes(sc.id));
      const assignedDoctorId = assignedDoctor ? assignedDoctor.id : null;
      
      // Find which caregiver has this senior citizen in their assignedSeniorIds
      const assignedCaregiver = caregivers.find(c => c.assignedSeniorIds.includes(sc.id));
      const assignedCaregiverId = assignedCaregiver ? assignedCaregiver.id : null;
      
      // Update the senior citizen if assignments have changed
      if (sc.assignedDoctorId !== assignedDoctorId || sc.assignedCaregiverId !== assignedCaregiverId) {
        sc.assignedDoctorId = assignedDoctorId;
        sc.assignedCaregiverId = assignedCaregiverId;
      }
      
      return sc;
    });
  }

  /**
   * Recalculates assignments for all currently loaded senior citizens.
   * This should be called after loading doctors or caregivers to update senior citizen assignments.
   */
  private recalculateSeniorCitizenAssignments(): void {
    const currentSeniorCitizens = this.seniorCitizens();
    if (currentSeniorCitizens.length === 0) {
      return; // No senior citizens loaded yet
    }
    
    const updatedSeniorCitizens = this.calculateAssignments(currentSeniorCitizens);
    this.seniorCitizensSignal.set(updatedSeniorCitizens);
  }

  /**
   * Loads caregivers by organization ID.
   * This ensures multi-tenant isolation - only caregivers from the specified organization are loaded.
   * @param organizationId - The organization ID to filter caregivers.
   */
  loadCaregiversByOrganization(organizationId: number): void {
    console.log(`[Store] Loading caregivers for organizationId: ${organizationId}`);
    this.loadingSignal.set(true);
    // No limpiar el errorSignal aquí para no sobrescribir errores importantes
    
    this.organizationApi.getCaregiversByOrganization(organizationId).pipe(take(1)).subscribe({
      next: caregivers => {
        // Validate that all loaded caregivers belong to the requested organization
        const invalidCaregivers = caregivers.filter(c => c.organizationId !== organizationId);
        if (invalidCaregivers.length > 0) {
          console.warn(
            `[Store] Found ${invalidCaregivers.length} caregiver(s) with different organizationId. ` +
            `Expected: ${organizationId}, Filtering them out.`
          );
        }
        
        // Filter to ensure only caregivers from the requested organization are stored
        const validCaregivers = caregivers.filter(c => c.organizationId === organizationId);
        console.log(`[Store] Loaded ${validCaregivers.length} caregiver(s) for organizationId: ${organizationId}`);
        
        this.caregiversSignal.set(validCaregivers);
        this.loadedCaregiversForOrgId.set(organizationId);
        this.loadingSignal.set(false);
      },
      error: err => {

        const organization = this.currentOrganizationSignal();
        const isClinic = organization?.type === 'clinic';
        const is404 = err?.status === 404;
        
        if (is404 && isClinic) {
          console.log(`[Store] No caregivers found for clinic organization ${organizationId} (expected)`);
          this.caregiversSignal.set([]);
          this.caregiversErrorSignal.set(null);
          this.loadedCaregiversForOrgId.set(organizationId);
          this.loadingSignal.set(false);
        } else if (is404) {
          console.log(`[Store] No caregivers found for organizationId ${organizationId} (empty list, not an error)`);
          this.caregiversSignal.set([]);
          this.caregiversErrorSignal.set(null);
          this.loadedCaregiversForOrgId.set(organizationId);
          this.loadingSignal.set(false);
        } else {
          console.error(`[Store] Error loading caregivers for organizationId ${organizationId}:`, err);
          console.error(`[Store] Error details:`, {
            status: err?.status,
            statusText: err?.statusText,
            message: err?.message,
            url: err?.url,
            error: err?.error
          });
          this.caregiversErrorSignal.set(this.formatError(err, 'Failed to load caregivers'));
          this.loadingSignal.set(false);
        }
      }
    });
  }


  /**
   * Loads senior citizens by caregiver ID.
   * @param caregiverId - The caregiver ID to filter senior citizens.
   */
  loadSeniorCitizensByCaregiver(caregiverId: number): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.organizationApi.getSeniorCitizensByCaregiver(caregiverId).pipe(take(1)).subscribe({
      next: seniorCitizens => {
        this.seniorCitizensSignal.set(seniorCitizens);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.errorSignal.set(this.formatError(err, 'Failed to load senior citizens by caregiver'));
        this.loadingSignal.set(false);
      }
    });
  }

  /**
   * Loads all doctors from the API.
   */
  loadDoctors(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.organizationApi.getDoctors().pipe(take(1)).subscribe({
      next: doctors => {
        this.doctorsSignal.set(doctors);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.errorSignal.set(this.formatError(err, 'Failed to load doctors'));
        this.loadingSignal.set(false);
      }
    });
  }


  /**
   * Loads all caregivers from the API.
   */
  loadCaregivers(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.organizationApi.getCaregivers().pipe(take(1)).subscribe({
      next: caregivers => {
        this.caregiversSignal.set(caregivers);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.errorSignal.set(this.formatError(err, 'Failed to load caregivers'));
        this.loadingSignal.set(false);
      }
    });
  }

  /**
   * Loads all senior citizens from the API.
   */
  loadSeniorCitizens(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.organizationApi.getSeniorCitizens().pipe(take(1)).subscribe({
      next: seniorCitizens => {
        this.seniorCitizensSignal.set(seniorCitizens);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.errorSignal.set(this.formatError(err, 'Failed to load senior citizens'));
        this.loadingSignal.set(false);
      }
    });
  }

  /**
   * Formats error messages for user-friendly display.
   * @param error - The error object (can be Error, HttpErrorResponse, or any).
   * @param fallback - The fallback error message.
   * @returns A formatted error message.
   */
  private formatError(error: any, fallback: string): string {
    // Helper function to extract and clean error message
    const extractErrorMessage = (err: any): string => {
      // Try different sources for the error message
      let msg = err?.error?.message || err?.error || err?.message || '';
      
      // If error.error is a string (plain text response from backend)
      if (typeof err?.error === 'string') {
        msg = err.error;
      }
      
      // If error.message contains the backend message, extract it
      if (typeof err?.message === 'string' && err.message.includes(':')) {
        // Extract message after the last colon (removes prefixes like "Failed to create senior citizen: ")
        const parts = err.message.split(':');
        if (parts.length > 1) {
          msg = parts.slice(1).join(':').trim();
        }
      }
      
      // Clean common prefixes from backend error messages
      if (typeof msg === 'string') {
        // Remove "Invalid request: " prefix
        msg = msg.replace(/^Invalid request:\s*/i, '');
        // Remove "Failed to create senior citizen: " prefix if still present
        msg = msg.replace(/^Failed to create senior citizen:\s*/i, '');
        // Remove "Failed to update senior citizen: " prefix
        msg = msg.replace(/^Failed to update senior citizen:\s*/i, '');
        // Remove "Failed to delete senior citizen: " prefix
        msg = msg.replace(/^Failed to delete senior citizen:\s*/i, '');
        // Remove "Failed to load senior citizens: " prefix
        msg = msg.replace(/^Failed to load senior citizens:\s*/i, '');
        // Remove other common operation prefixes
        msg = msg.replace(/^Failed to [^:]+:\s*/i, '');
        // Trim whitespace
        msg = msg.trim();
      }
      
      return msg || '';
    };
    
    // Handle Error instances
    if (error instanceof Error) {
      const cleanedMsg = extractErrorMessage(error);
      if (cleanedMsg) {
        return cleanedMsg;
      }
      // If it's a "Resource not found" error, provide a more user-friendly message
      if (error.message.includes('Resource not found')) {
        return `${fallback}: Not found`;
      }
      return error.message || fallback;
    }
    
    // Handle HttpErrorResponse or similar objects
    if (error && typeof error === 'object') {
      const cleanedMsg = extractErrorMessage(error);
      if (cleanedMsg) {
        return cleanedMsg;
      }
      
      // Try to extract from status codes
      if (error.status === 400) {
        return cleanedMsg || `${fallback}: Invalid data provided`;
      } else if (error.status === 401 || error.status === 403) {
        return `${fallback}: Authentication required`;
      } else if (error.status === 404) {
        return `${fallback}: Not found`;
      } else if (error.status === 500) {
        return cleanedMsg || `${fallback}: Server error`;
      }
    }
    
    return fallback;
  }
}
