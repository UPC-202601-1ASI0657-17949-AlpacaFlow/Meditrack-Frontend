# Guía de Despliegue en Firebase Hosting

Esta guía te ayudará a desplegar la aplicación Meditrack Frontend en Firebase Hosting.

## Prerrequisitos

1. **Cuenta de Google**: Necesitas una cuenta de Google para usar Firebase
2. **Node.js y npm**: Ya instalados (verificado en el proyecto)
3. **Firebase CLI**: Ya instalado como dependencia de desarrollo

## Pasos para el Despliegue

### 1. Iniciar sesión en Firebase

```bash
npm run firebase:login
```

Esto abrirá tu navegador para autenticarte con tu cuenta de Google.

### 2. Crear un proyecto en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Agregar proyecto" o "Add project"
3. Ingresa un nombre para tu proyecto (ej: `meditrack-frontend`)
4. Sigue las instrucciones para completar la creación del proyecto
5. **No habilites Google Analytics** a menos que lo necesites

### 3. Configurar el proyecto Firebase localmente

Edita el archivo `.firebaserc` y reemplaza `meditrack-frontend` con el ID de tu proyecto de Firebase:

```json
{
  "projects": {
    "default": "TU_PROJECT_ID_AQUI"
  }
}
```

Para encontrar el ID de tu proyecto:
- Ve a Firebase Console
- Selecciona tu proyecto
- El ID del proyecto aparece en la configuración del proyecto o en la URL

### 4. Inicializar Firebase Hosting (Opcional)

Si necesitas reconfigurar Firebase Hosting, puedes ejecutar:

```bash
npm run firebase:init
```

**Nota**: Los archivos `firebase.json` y `.firebaserc` ya están configurados, así que puedes omitir este paso.

### 5. Construir la aplicación para producción

```bash
npm run build:prod
```

Esto generará los archivos optimizados en `dist/meditrack-frontend/browser/`.

### 6. Desplegar a Firebase Hosting

```bash
npm run deploy
```

O si solo quieres desplegar el hosting:

```bash
npm run deploy:hosting
```

### 7. Verificar el despliegue

Una vez completado el despliegue, Firebase te proporcionará una URL como:
```
https://TU_PROJECT_ID.web.app
```
o
```
https://TU_PROJECT_ID.firebaseapp.com
```

## Scripts Disponibles

- `npm run build:prod` - Construye la aplicación para producción
- `npm run deploy` - Construye y despliega todo a Firebase
- `npm run deploy:hosting` - Construye y despliega solo el hosting
- `npm run firebase:login` - Inicia sesión en Firebase
- `npm run firebase:init` - Inicializa Firebase (solo si necesitas reconfigurar)

## Configuración Actual

- **Directorio público**: `dist/meditrack-frontend/browser`
- **Rewrites**: Todas las rutas se redirigen a `index.html` para soportar Angular Router
- **Cache**: Archivos JS, CSS e imágenes tienen cache de 1 año
- **SPA Routing**: Configurado con `_redirects` para soportar rutas de Angular

## Solución de Problemas

### Error: "Firebase project not found"
- Verifica que el ID del proyecto en `.firebaserc` sea correcto
- Asegúrate de estar autenticado: `npm run firebase:login`

### Error: "Build failed"
- Verifica que todas las dependencias estén instaladas: `npm install`
- Revisa los errores de compilación en la consola

### La aplicación no carga correctamente
- Verifica que el archivo `_redirects` esté en `public/` (ya está configurado)
- Asegúrate de que el build se complete sin errores críticos

### Cambiar el dominio personalizado
1. Ve a Firebase Console > Hosting
2. Haz clic en "Agregar dominio personalizado"
3. Sigue las instrucciones para verificar tu dominio

## Notas Importantes

- El archivo `_redirects` en `public/` se copia automáticamente al build
- Los archivos en `dist/` se generan en cada build y no deben versionarse
- El archivo `.firebaserc` contiene la configuración del proyecto (puede versionarse)
- El archivo `firebase.json` contiene la configuración de hosting (puede versionarse)

## Actualizaciones Futuras

Para actualizar la aplicación después del primer despliegue:

```bash
npm run deploy
```

Esto construirá y desplegará automáticamente los cambios más recientes.

