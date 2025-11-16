import { Component, OnInit, OnDestroy, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, ActivatedRoute, Router } from '@angular/router';
import { MatSidenavModule, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { MatListModule, MatNavList, MatListItem } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import { MatToolbar } from '@angular/material/toolbar';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription, interval } from 'rxjs';
import { LanguageSwitcher } from '../../../../shared/presentation/components/language-switcher/language-switcher';
import { RelativesStore } from '../../../application/relatives.store';
import { AuthStore } from '../../../../auth/application/auth.store';

@Component({
    selector: 'app-relative-layout',
    standalone: true,
    imports: [
        CommonModule,
        RouterOutlet,
        RouterLink,
        RouterLinkActive,
        MatSidenavModule,
        MatSidenavContainer,
        MatSidenavContent,
        MatListModule,
        MatNavList,
        MatListItem,
        MatIconModule,
        MatButtonModule,
        MatIconButton,
        MatToolbar,
        LanguageSwitcher,
        TranslatePipe
    ],
    templateUrl: 'relative-layout.html',
    styleUrls: ['relative-layout.css']
})
export class RelativeLayoutComponent implements OnInit, OnDestroy {
    isSidenavOpen = true;
    relativeId!: string;
    currentTime: string = '';
    private routeSub!: Subscription;
    private timeSubscription?: Subscription;
    private relativesStore = inject(RelativesStore);
    private authStore = inject(AuthStore);
    private router = inject(Router);

    selectedRelative = computed(() => this.relativesStore.selectedRelative());
    navigationItems: { link: string; icon: string; label: string }[] = [];

    constructor(
        private route: ActivatedRoute
    ) {
        // Actualizar navigation items cuando cambie el relative
        effect(() => {
            const relative = this.selectedRelative();
            if (relative && this.relativeId) {
                this.updateNavigationItems();
            }
        });
    }

    ngOnInit() {
        this.routeSub = this.route.params.subscribe(params => {
            this.relativeId = params['id'];
            const userId = parseInt(this.relativeId, 10);
            if (userId) {
                this.relativesStore.loadRelativeById(userId);
            }
            // Actualizar items inicialmente (puede que el relative aún no esté cargado)
            this.updateNavigationItems();
        });
        
        // Actualizar el tiempo cada segundo
        this.timeSubscription = interval(1000).subscribe(() => {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            this.currentTime = `${hours}:${minutes}:${seconds}`;
        });
    }

    ngOnDestroy() {
        if (this.routeSub) {
            this.routeSub.unsubscribe();
        }
        if (this.timeSubscription) {
            this.timeSubscription.unsubscribe();
        }
    }

    private updateNavigationItems() {
        const relative = this.selectedRelative();
        const planType = relative?.planType?.toLowerCase();
        
        const allItems = [
            { link: `/relative/relative/${this.relativeId}/profile`, icon: 'person', label: 'Profile' },
            { link: `/relative/relative/${this.relativeId}/statistics`, icon: 'bar_chart', label: 'Statistics' },
            { link: `/relative/relative/${this.relativeId}/alerts`, icon: 'notifications', label: 'Alerts' },
            { link: `/relative/relative/${this.relativeId}/support`, icon: 'headset_mic', label: 'Support' },
        ];

        // Filtrar items basándose en el planType
        // Solo usuarios premium tienen acceso a Support
        if (planType === 'premium') {
            this.navigationItems = allItems;
        } else {
            // Freemium (o cualquier otro plan que no sea premium) no tiene acceso a Support
            this.navigationItems = allItems.filter(item => item.label !== 'Support');
        }
    }

    toggleSidenav() {
        this.isSidenavOpen = !this.isSidenavOpen;
    }

    closeSidenav() {
        this.isSidenavOpen = false;
    }

    logout(): void {
        // Cerrar sesión: limpiar autenticación y redirigir al login
        this.authStore.clearAuth();
        this.router.navigate(['/auth/login']).then();
    }
}