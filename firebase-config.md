# Configuración de Firebase para King of Diamonds

## Paso 1: Crear un proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Agregar proyecto"
3. Nombra tu proyecto (ej: "king-of-diamonds")
4. Sigue los pasos de configuración

## Paso 2: Configurar Realtime Database

1. En el menú lateral, ve a "Build" > "Realtime Database"
2. Haz clic en "Crear base de datos"
3. Selecciona una ubicación (ej: United States)
4. Inicia en modo de prueba (puedes configurar reglas después)

## Paso 3: Obtener la configuración

1. Ve a "Project Settings" (ícono de engranaje)
2. En la sección "Your apps", haz clic en el ícono web (</>)
3. Registra tu aplicación web
4. Copia el objeto `firebaseConfig`

## Paso 4: Actualizar game.js

Reemplaza el objeto `firebaseConfig` en `game.js` con tu configuración:

```javascript
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "tu-proyecto.firebaseapp.com",
    databaseURL: "https://tu-proyecto-default-rtdb.firebaseio.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123def456"
};
```

## Paso 5: Configurar reglas de seguridad (Opcional)

En Realtime Database > Reglas, puedes usar estas reglas básicas:

```json
{
  "rules": {
    "games": {
      "$gameId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

**Nota:** Estas reglas son para desarrollo. Para producción, implementa reglas más seguras.

## Modo Demo (Sin Firebase)

El juego puede funcionar en modo local sin Firebase para propósitos de demostración, pero no tendrá sincronización en tiempo real entre múltiples jugadores. Solo funcionará para un jugador a la vez en el mismo navegador.

## Despliegue

Puedes desplegar el juego en:
- Firebase Hosting
- GitHub Pages
- Netlify
- Vercel
- Cualquier servidor web estático

Para Firebase Hosting:
1. Instala Firebase CLI: `npm install -g firebase-tools`
2. Inicia sesión: `firebase login`
3. Inicializa: `firebase init hosting`
4. Despliega: `firebase deploy`
