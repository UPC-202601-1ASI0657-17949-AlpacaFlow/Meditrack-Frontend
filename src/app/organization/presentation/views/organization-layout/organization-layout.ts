import {Component, OnDestroy, OnInit, inject, ChangeDetectorRef, signal, computed, effect, Injector, runInInjectionContext} from '@angular/core';
import {MatSidenav, MatSidenavContainer, MatSidenavContent} from "@angular/material/sidenav";
import {TranslatePipe} from "@ngx-translate/core";
import {MatToolbar} from "@angular/material/toolbar";
import {MatIconButton, MatButtonModule} from "@angular/material/button";
import {MatListItem, MatNavList} from "@angular/material/list";
import {RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd, ActivatedRoute} from "@angular/router";
import {MatIconModule} from "@angular/material/icon";
import {interval, Subscription, filter} from "rxjs";
import {TimeApiService} from "../../../../shared/infrastructure/time-api.service";
import {TimeEntity} from "../../../../shared/domain/model/time.entity";
import {LanguageSwitcher} from "../../../../shared/presentation/components/language-switcher/language-switcher";
import {OrganizationStore} from "../../../application/organization.store";
import {Organization} from "../../../domain/model/organization.entity";
import {AuthStore} from "../../../../auth/application/auth.store";

@Component({
  selector: 'app-organization-layout',
  imports: [
    MatSidenavContent,
    TranslatePipe,
    MatToolbar,
    MatIconButton,
    MatIconModule,
    MatSidenavContainer,
    MatNavList,
    MatListItem,
    RouterLink,
    RouterLinkActive,
    MatSidenav,
    RouterOutlet,
    LanguageSwitcher,
    MatButtonModule
  ],
  templateUrl: './organization-layout.html',
  standalone: true,
  styleUrl: './organization-layout.css'
})
export class OrganizationLayout implements OnInit, OnDestroy {
  isSidenavOpen = true; // Abrir el sidenav por defecto
  currentTime: string = '';
  private currentRouteSignal = signal<string>('');
  private timeSubscription?: Subscription;
  private routerSubscription?: Subscription;
  private paramMapSubscription?: Subscription;

  private userRoleSignal = signal<string>('');
  private currentUserIdSignal = signal<number | null>(null);
  private currentOrganizationIdSignal = signal<number | null>(null);
  
  // Computed signals for better reactivity
  organizationType = computed(() => {
    const org = this.organizationStore.currentOrganization();
    return org?.type || null;
  });
  
  currentOrganizationId = computed(() => {
    // Prioritize organizationId from route, then from store
    return this.currentOrganizationIdSignal() || this.organizationStore.getCurrentOrganizationId();
  });
  
  isLoading = computed(() => {
    return this.organizationStore.loading();
  });
  
  error = computed(() => {
    return this.organizationStore.error();
  });
  
  userRole: string = '';
  currentUserId: number | null = null;

  private navigationItemsConfig: { 
    route: string; 
    icon: string; 
    label: string; 
    organizationTypes: ('clinic' | 'resident')[];
    roles?: string[]; // Roles que pueden ver esta opción (undefined = todos los roles)
  }[] = [
    { route: '/doctors', label: 'navigation.doctor-list', icon: 'person_add', organizationTypes: ['clinic'], roles: ['admin'] }, // Solo admins pueden ver doctor list
    { route: '/senior-citizens', label: 'navigation.senior-citizen-list', icon: 'people', organizationTypes: ['clinic', 'resident']},
    { route: '/caregivers', label: 'navigation.caregiver-list', icon: 'people', organizationTypes: ['resident'], roles: ['admin'] }, // Solo admins pueden ver caregiver list
    { route: '/support', label: 'navigation.support', icon: 'headset_mic', organizationTypes: ['clinic', 'resident'] }
  ];

  navigationItems = computed(() => {
    const organizationId = this.currentOrganizationId();
    const userId = this.currentUserIdSignal();
    const userRole = this.userRoleSignal();
    // Si hay userId y userRole, incluir en la ruta: /organization/2/admin/5/doctors
    // Si no hay userId, usar: /organization/2/doctors
    const basePath = organizationId 
      ? (userId && userRole ? `/organization/${organizationId}/${userRole}/${userId}` : `/organization/${organizationId}`)
      : '/organization';
    return this.navigationItemsConfig.map(item => ({
      ...item,
      link: `${basePath}${item.route}`
    }));
  });

  filteredNavigationItems = computed(() => {
    const organizationType = this.organizationType();
    // Leer el rol del signal local, pero si está vacío, leer del store directamente
    let role = this.userRoleSignal();
    if (!role) {
      role = this.organizationStore.getCurrentUserRole();
    }
    const userId = this.currentUserIdSignal();
    const currentRoute = this.currentRouteSignal(); // Leer el signal para reactividad
    const items = this.navigationItems();
    
    if (!organizationType) {
      console.warn('No organization type set yet, returning empty navigation items');
      return [];
    }
    
    // Filter by organization type and role
    let filtered = items.filter(item => {
      // Primero verificar que coincida con el tipo de organización
      if (!item.organizationTypes.includes(organizationType)) {
        return false;
      }
      
      // Si el item tiene roles definidos, verificar que el rol del usuario esté incluido
      if (item.roles && item.roles.length > 0) {
        return item.roles.includes(role);
      }
      
      // Si no tiene roles definidos, está disponible para todos los roles
      return true;
    });
    
    // Si estamos en una ruta de senior citizen, agregar las opciones del senior citizen al sidenav
    const seniorCitizenId = this.getSeniorCitizenIdFromRoute();
    const organizationId = this.currentOrganizationId();
    const currentUserId = this.currentUserIdSignal();
    const userRole = this.userRoleSignal();
    if (seniorCitizenId && organizationId) {
      // Construir la ruta correctamente usando userRole y userId de la ruta
      // Formato: /organization/:organizationId/:userRole/:userId/senior-citizens/:id/profile
      const basePath = (userRole && currentUserId)
        ? `/organization/${organizationId}/${userRole}/${currentUserId}/senior-citizens/${seniorCitizenId}`
        : `/organization/${organizationId}/senior-citizens/${seniorCitizenId}`;
      const seniorCitizenNavItems: { link: string; icon: string; label: string; organizationTypes: ('clinic' | 'resident')[] }[] = [];
      
      // Todos los usuarios pueden ver el perfil del senior citizen
      seniorCitizenNavItems.push(
        { link: `${basePath}/profile`, icon: 'person', label: 'navigation.seniorCitizenProfile', organizationTypes: ['clinic', 'resident'] }
      );
      
      // Doctors and caregivers can see statistics and alerts when viewing a senior citizen
      if (role === 'caregiver' || role === 'doctor') {
        seniorCitizenNavItems.push(
          { link: `${basePath}/alerts`, icon: 'notifications', label: 'navigation.alerts', organizationTypes: ['clinic', 'resident'] },
          { link: `${basePath}/statistics`, icon: 'bar_chart', label: 'navigation.statistics', organizationTypes: ['clinic', 'resident'] }
        );
      }
      
      const seniorCitizenItems = seniorCitizenNavItems
        .filter(item => item.organizationTypes.includes(organizationType))
        .map(item => ({ ...item, route: '', organizationTypes: item.organizationTypes } as typeof filtered[0]));
      filtered = [...filtered, ...seniorCitizenItems];
    }
    
    console.log(`Filtering navigation for organization type "${organizationType}", role "${role}", seniorCitizenId: ${seniorCitizenId || 'none'}, route: ${currentRoute}:`, {
      totalItems: items.length,
      filteredCount: filtered.length,
      filteredItems: filtered.map(i => i.label)
    });
    return filtered;
  });
  
       /**
        * Obtiene el seniorCitizenId de la ruta actual si estamos en una ruta de senior citizen
        */
       private getSeniorCitizenIdFromRoute(): number | null {
         // Usar el signal de la ruta actual
         const url = this.currentRouteSignal() || this.router.url || '';
         const match = url.match(/\/senior-citizens\/(\d+)/);
         if (match && match[1]) {
           return parseInt(match[1], 10);
         }
         
         let currentRoute = this.route.firstChild;
         while (currentRoute) {
           const params = currentRoute.snapshot.paramMap;
           const seniorCitizenId = params.get('id');
           const routePath = currentRoute.snapshot.routeConfig?.path;
           if (seniorCitizenId && routePath?.includes('senior-citizens')) {
             return parseInt(seniorCitizenId, 10);
           }
           currentRoute = currentRoute.firstChild;
         }
         
         return null;
       }

  private organizationStore = inject(OrganizationStore);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private injector = inject(Injector);
  private authStore = inject(AuthStore);

  constructor(
    private timeApiService: TimeApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Watch for organization type changes using effect
    // Must use runInInjectionContext because effect() requires an injection context
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const org = this.organizationStore.currentOrganization();
        if (org) {
          console.log(`Organization loaded: organizationId=${org.id}, organizationType="${org.type}", name="${org.name}"`);
          console.log(`Navigation items for organization type "${org.type}":`, this.filteredNavigationItems().map(item => item.label));
          console.log(`Current organizationType computed signal: "${this.organizationType()}"`);
        } else {
          console.warn(`Organization not loaded yet or is null`);
        }
      });
      
      // Watch for role changes from the store
      effect(() => {
        const role = this.organizationStore.getCurrentUserRole();
        const organizationId = this.currentOrganizationId();
        const userId = this.currentUserIdSignal();
        const currentUserRole = this.userRoleSignal();
        
        if (role && role !== currentUserRole) {
          this.userRole = role;
          this.userRoleSignal.set(role);
          console.log(`Role updated in layout: "${role}"`);
          
          // Si tenemos organizationId y userId pero no hay userRole en la URL, actualizar la URL
          if (organizationId && userId && !this.route.snapshot.paramMap.get('userRole')) {
            const currentUrl = this.router.url;
            // Construir la nueva URL con el formato correcto: /organization/{organizationId}/{userRole}/{userId}
            const urlParts = currentUrl.split('/');
            const orgIndex = urlParts.indexOf('organization');
            if (orgIndex >= 0 && urlParts.length > orgIndex + 2) {
              // Reemplazar la parte de la URL que contiene organizationId/userId con organizationId/userRole/userId
              const newUrlParts = [...urlParts];
              newUrlParts.splice(orgIndex + 2, 0, role);
              const newUrl = newUrlParts.join('/');
              // Solo actualizar si la URL cambió
              if (newUrl !== currentUrl) {
                console.log(`Updating URL to include userRole: ${newUrl}`);
                this.router.navigateByUrl(newUrl, { replaceUrl: true });
              }
            }
          }
        }
      });
    });

    // Leer organizationId, userRole y userId de los parámetros de la ruta (ej: /organization/2/admin/5)
    this.paramMapSubscription = this.route.paramMap.subscribe(params => {
      const organizationIdStr = params.get('organizationId');
      
      if (organizationIdStr) {
        const organizationId = parseInt(organizationIdStr, 10);
        this.currentOrganizationIdSignal.set(organizationId);
        
        // Leer userRole y userId de los parámetros de la ruta (ej: /organization/2/admin/5)
        const userRoleStr = params.get('userRole');
        const userIdStr = params.get('userId');
        const userId = userIdStr ? parseInt(userIdStr, 10) : null;
        
        // Establecer el userId y userRole en los signals locales
        this.currentUserIdSignal.set(userId);
        if (userRoleStr) {
          this.userRoleSignal.set(userRoleStr);
          this.userRole = userRoleStr;
        }
        
        console.log(`Loading organization data by organizationId: ${organizationId}${userRoleStr ? `, userRole: ${userRoleStr}` : ''}${userId ? `, userId: ${userId}` : ''}`);
        
        // Load organization data with optional userId and userRole
        // Si userRole está en la URL, usarlo directamente para evitar búsquedas innecesarias
        if (userRoleStr && userId) {
          // Si tenemos el rol de la URL, establecerlo directamente y cargar datos
          this.organizationStore.loadOrganizationDataWithId(userId, organizationId, userRoleStr);
        } else {
          // Si no tenemos el rol, buscar en el backend
          this.organizationStore.loadOrganizationDataByOrganizationId(organizationId, userId);
        }
        
        // Si no se proporcionó userRole en la URL pero sí userId, esperar a que el store determine el rol
        // y luego actualizar la URL para incluir el userRole
        if (!userRoleStr && userId) {
          // El rol se establecerá cuando el store lo determine (ver effect más abajo)
          // La URL se actualizará automáticamente cuando se detecte el cambio de rol
        } else if (!userRoleStr) {
          // Si no hay userId, obtener el rol del store directamente
          const role = this.organizationStore.getCurrentUserRole();
          this.userRole = role;
          this.userRoleSignal.set(role);
        }
        
        // Wait for organization to load before redirecting
        let attempts = 0;
        const maxAttempts = 25; // 5 seconds max (25 * 200ms)
        const checkOrgAndRedirect = () => {
          attempts++;
          const orgType = this.organizationType();
          const org = this.organizationStore.currentOrganization();
          const error = this.error();
          const isLoading = this.isLoading();
          
          console.log(`[CheckRedirect] Attempt ${attempts}/${maxAttempts} - organizationType="${orgType}", organization=${org ? `id=${org.id}, type="${org.type}"` : 'null'}, isLoading=${isLoading}, error=${error || 'none'}`);
          
          // Stop if there's a critical error (solo errores críticos como fallo al cargar la organización)
          // Los errores de listas (senior citizens, doctors, caregivers) no bloquean el layout
          // porque ahora se manejan con signals específicos que los componentes muestran localmente
          if (error && !isLoading) {
            // Solo bloquear si es un error crítico (fallo al cargar la organización)
            // Los errores de listas ya no se establecen en errorSignal, así que esto solo
            // debería capturar errores críticos
            const isCriticalError = error.includes('Failed to load organization');
            
            if (isCriticalError) {
              console.error(`[CheckRedirect] Critical error detected: ${error}. Stopping redirect attempts.`);
              return;
            } else {
              // Si hay un error pero no es crítico, continuar (puede ser un error de lista que se maneja localmente)
              console.log(`[CheckRedirect] Non-critical error detected: ${error}. Continuing redirect.`);
            }
          }
          
          // Stop if we've exceeded max attempts
          if (attempts >= maxAttempts) {
            console.error(`[CheckRedirect] Max attempts (${maxAttempts}) reached. Stopping redirect attempts.`);
            return;
          }
          
          if (orgType) {
            const childRoute = this.route.firstChild;
            if (!childRoute || childRoute.snapshot.url.length === 0) {
              console.log(`[CheckRedirect] No child route, redirecting...`);
              this.redirectBasedOnOrganizationType(organizationId);
            } else {
              console.log(`[CheckRedirect] Child route exists: ${childRoute.snapshot.url.map(s => s.path).join('/')}`);
            }
          } else if (!isLoading) {
            // If not loading and no organization type, wait a bit more
            console.warn(`[CheckRedirect] No organization type yet, waiting... (attempt ${attempts}/${maxAttempts})`);
            setTimeout(checkOrgAndRedirect, 200);
          } else {
            console.log(`⏳ [CheckRedirect] Still loading, waiting... (attempt ${attempts}/${maxAttempts})`);
            setTimeout(checkOrgAndRedirect, 200);
          }
        };
        
        // Initial check after a short delay to allow data to load
        setTimeout(checkOrgAndRedirect, 100);
      }
    });
    this.timeSubscription = interval(1000).subscribe(() => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      this.currentTime = `${hours}:${minutes}:${seconds}`;
    });

         this.routerSubscription = this.router.events
           .pipe(filter(event => event instanceof NavigationEnd))
           .subscribe((event: NavigationEnd) => {
             this.currentRouteSignal.set(event.url);
             
             const organizationType = this.organizationType();
             const organizationId = this.currentOrganizationId();
             if (organizationId && organizationType) {
               const currentUrl = event.url;
               const isValidRoute = this.isValidRouteForOrganizationType(currentUrl, organizationType);
               
               if (!isValidRoute) {
                 this.redirectBasedOnOrganizationType(organizationId);
                 return;
               }
             }
             
            const seniorCitizenId = this.getSeniorCitizenIdFromRoute();
             if (seniorCitizenId && seniorCitizenId > 0) {
               this.organizationStore.loadSeniorCitizenById(seniorCitizenId);
             }
             this.updateNavigationState();
           });

    this.currentRouteSignal.set(this.router.url);
    this.updateNavigationState();
  }

  ngOnDestroy(): void {
    if (this.timeSubscription) {
      this.timeSubscription.unsubscribe();
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.paramMapSubscription) {
      this.paramMapSubscription.unsubscribe();
    }
  }


  trackByLabel(index: number, item: { link: string; icon: string; label: string }): string {
    return item.label;
  }

  toggleSidenav(): void {
    this.isSidenavOpen = !this.isSidenavOpen;
  }

  closeSidenav(): void {
    this.isSidenavOpen = false;
  }

  logout(): void {
    // Cerrar sesión: limpiar autenticación y redirigir al login
    this.authStore.clearAuth();
    this.router.navigate(['/auth/login']).then();
  }

  /**
   * Actualiza el estado de navegación basado en la ruta actual
   */
  private updateNavigationState(): void {
  }


  navigateTo(route: string): void {
    this.router.navigate([route]);
    this.closeSidenav();
  }

  isRouteActive(route: string): boolean {
    const currentRoute = this.currentRouteSignal();
    const routeWithoutParams = currentRoute.split('?')[0]; // Remover query params
    
    // Si la ruta es exactamente igual, está activa
    if (routeWithoutParams === route) {
      return true;
    }
    
    // Para "Senior Citizen List" (/senior-citizens), solo activar si estamos exactamente en esa ruta
    // No activar si estamos en /senior-citizens/:id/profile o /senior-citizens/:id/alerts, etc.
    if (route.endsWith('/senior-citizens')) {
      // Verificar que la ruta actual termine exactamente con /senior-citizens (con o sin barra final)
      // y que no tenga más segmentos después
      const normalizedRoute = route.endsWith('/') ? route.slice(0, -1) : route;
      const normalizedCurrent = routeWithoutParams.endsWith('/') ? routeWithoutParams.slice(0, -1) : routeWithoutParams;
      
      // Debe coincidir exactamente o terminar con /senior-citizens sin más segmentos
      if (normalizedCurrent === normalizedRoute) {
        return true;
      }
      
      // Si la ruta actual empieza con la ruta base pero tiene más segmentos, no está activa
      if (normalizedCurrent.startsWith(normalizedRoute + '/')) {
        return false;
      }
      
      return false;
    }
    
    // Para otras rutas (como /senior-citizens/:id/profile), usar startsWith
    // Esto permite que las subrutas se activen correctamente
    if (routeWithoutParams.startsWith(route)) {
      // Si la ruta termina con /, verificar que la ruta actual también termine ahí o tenga más segmentos
      if (route.endsWith('/')) {
        return true;
      }
      
      // Si la ruta no termina con /, verificar que el siguiente carácter sea / o que sea el final
      const remainingPath = routeWithoutParams.substring(route.length);
      if (remainingPath === '' || remainingPath.startsWith('/')) {
        return true;
      }
      
      return false;
    }
    
    return false;
  }

  /**
   * Obtiene el título de la página actual
   */
  getCurrentPageTitle(): string {
    const currentRoute = this.currentRouteSignal();
    const currentItem = this.navigationItems().find(item => 
      currentRoute.startsWith(item.link)
    );
    return currentItem ? currentItem.label : 'navigation.default';
  }

  /**
   * Cambia el rol del usuario
   */
  setUserRole(role: string): void {
    this.userRole = role;
  }

  /**
   * Verifica si la ruta actual es válida para el tipo de organización
   */
  private isValidRouteForOrganizationType(url: string, organizationType: 'clinic' | 'resident'): boolean {
    // Rutas permitidas por tipo de organización
    const organizationTypeRoutes: Record<'clinic' | 'resident', string[]> = {
      'clinic': ['doctors', 'senior-citizens', 'support'],
      'resident': ['caregivers', 'senior-citizens', 'support']
    };
    
    const allowedRoutes = organizationTypeRoutes[organizationType] || [];
    
    // Match: /organization/{organizationId} or /organization/{organizationId}/
    const baseRouteMatch = url.match(/^\/organization\/(\d+)\/?$/);
    if (baseRouteMatch) {
      return false;
    }
    
    return allowedRoutes.some(route => url.includes(`/${route}`));
  }

  /**
   * Redirige según el tipo de organización al llegar a la ruta base.
   * clinic → /doctors
   * resident → /caregivers
   * También considera el rol del usuario para doctors y caregivers
   */
  private redirectBasedOnOrganizationType(organizationId: number): void {
    const organizationType = this.organizationType();
    const role = this.organizationStore.getCurrentUserRole();
    
    console.log(`[Redirect] organizationId=${organizationId}, organizationType="${organizationType}", role="${role}"`);
    
    let redirectPath = '/doctors'; // Default
    
    if (organizationType === 'resident') {
      // Para residencias, redirigir a caregivers
      redirectPath = '/caregivers';
      console.log(`[Redirect] Organization type is 'resident', redirecting to /caregivers`);
    } else if (organizationType === 'clinic') {
      // Para clínicas, redirigir a doctors
      redirectPath = '/doctors';
      console.log(`[Redirect] Organization type is 'clinic', redirecting to /doctors`);
    } else {
      // Si no hay tipo de organización, usar el rol como fallback
      console.warn(`[Redirect] No organization type found, using role fallback: "${role}"`);
      if (role === 'admin-casa-reposo' || role === 'caregiver') {
        redirectPath = '/caregivers';
      } else if (role === 'admin-clinic' || role === 'doctor') {
        redirectPath = '/doctors';
      }
    }
    
    // Para doctors y caregivers, siempre redirigir a senior-citizens
    if (role === 'doctor' || role === 'caregiver') {
      redirectPath = '/senior-citizens';
      console.log(`[Redirect] User role is '${role}', redirecting to /senior-citizens`);
    }
    
    // Incluir userRole y userId en la ruta si están presentes
    const userId = this.currentUserIdSignal();
    const userRole = this.userRoleSignal();
    const fullPath = (userId && userRole)
      ? `/organization/${organizationId}/${userRole}/${userId}${redirectPath}`
      : `/organization/${organizationId}${redirectPath}`;
    console.log(`🚀 [Redirect] Navigating to: ${fullPath}`);
    this.router.navigate([fullPath], { replaceUrl: true });
  }
}