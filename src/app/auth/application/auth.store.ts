import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../domain/model/user.entity';
import { AuthApi } from '../infrastructure/auth-api';

export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
}

/**
 * Store para manejar el estado de autenticación
 */
@Injectable({
    providedIn: 'root'
})
export class AuthStore {
    private _currentUser = signal<User | null>(null);
    private _token = signal<string | null>(null);
    private _isAuthenticated = signal<boolean>(false);

    constructor(
        private authApi: AuthApi
    ) {
        this.loadFromStorage();
    }

    /**
     * Carga el estado de autenticación desde localStorage
     */
    private loadFromStorage(): void {
        const token = localStorage.getItem('auth_token');
        const userStr = localStorage.getItem('auth_user');

        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                this._token.set(token);
                this._currentUser.set(new User(user));
                this._isAuthenticated.set(true);
            } catch (error) {
                console.error('Error loading auth state from storage:', error);
                this.clearAuth();
            }
        }
    }

    /**
     * Guarda el estado de autenticación en localStorage
     */
    private saveToStorage(token: string, user: User): void {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify({
            id: user.id,
            email: user.email,
            role: user.role
        }));
    }

    /**
     * Limpia el estado de autenticación
     */
    private clearStorage(): void {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
    }

    /**
     * Establece el usuario autenticado y el token
     */
    setAuth(token: string, user: User): void {
        this._token.set(token);
        this._currentUser.set(user);
        this._isAuthenticated.set(true);
        this.saveToStorage(token, user);
    }

    /**
     * Limpia la autenticación
     */
    clearAuth(): void {
        this._token.set(null);
        this._currentUser.set(null);
        this._isAuthenticated.set(false);
        this.clearStorage();
    }

    /**
     * Obtiene el usuario actual (readonly)
     */
    get currentUser() {
        return this._currentUser.asReadonly();
    }

    /**
     * Obtiene el token actual (readonly)
     */
    get token() {
        return this._token.asReadonly();
    }

    /**
     * Obtiene el estado de autenticación (readonly)
     */
    get isAuthenticated() {
        return this._isAuthenticated.asReadonly();
    }

    /**
     * Verifica si el usuario tiene un rol específico
     */
    hasRole(role: string): boolean {
        const user = this._currentUser();
        return user?.role === role;
    }

    /**
     * Verifica si el usuario tiene alguno de los roles especificados
     */
    hasAnyRole(roles: string[]): boolean {
        const user = this._currentUser();
        return user ? roles.includes(user.role) : false;
    }

    /**
     * Login - autentica un usuario con email y password usando AuthApi
     * @param email - El email del usuario
     * @param password - La contraseña del usuario
     * @returns Observable que emite un objeto con token y user
     */
    login(email: string, password: string): Observable<{ token: string; user: User }> {
        return this.authApi.login(email, password);
    }

    /**
     * Register - registra un nuevo usuario usando AuthApi
     * @param user - La entidad User a registrar
     * @param password - La contraseña del usuario
     * @param additionalData - Optional data for admin registration (firstName, lastName, organizationName, organizationType)
     * @returns Observable que emite un objeto con token y user
     */
    register(user: User, password: string, additionalData?: { 
        firstName?: string; 
        lastName?: string; 
        organizationName?: string; 
        organizationType?: string;
    }): Observable<{ token: string; user: User }> {
        return this.authApi.register(user, password, additionalData);
    }

    /**
     * Obtiene un usuario por email usando AuthApi
     * @param email - El email del usuario a buscar
     * @returns Observable que emite el User o null si no se encuentra
     */
    getUserByEmail(email: string): Observable<User | null> {
        return this.authApi.getUserByEmail(email);
    }

    /**
     * Obtiene un usuario por ID usando AuthApi
     * @param id - El ID del usuario a buscar
     * @returns Observable que emite el User o null si no se encuentra
     */
    getUserById(id: number): Observable<User | null> {
        return this.authApi.getUserById(id);
    }
}

