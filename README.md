# ♦ King of Diamonds ♦

Juego multijugador online inspirado en "Rey de Diamantes" de Alice in Borderland.

## 📋 Descripción

Un juego de estrategia y predicción para 2-5 jugadores donde cada participante debe elegir un número entre 0 y 100. El número ganador será el promedio de todos los números elegidos multiplicado por 0.8. El jugador cuyo número esté más cercano al objetivo gana.

## 🎮 Características

- **Multijugador en tiempo real**: 2-5 jugadores pueden jugar simultáneamente
- **Sincronización en tiempo real**: Usa Firebase Realtime Database para sincronizar el estado del juego
- **Interfaz web moderna**: HTML, CSS y JavaScript vanilla
- **Diseño oscuro y minimalista**: Estilo misterioso inspirado en Alice in Borderland
- **Temporizador de 30 segundos**: Los jugadores deben elegir rápidamente
- **Resultados detallados**: Muestra el ranking completo con distancias al objetivo

## 🚀 Cómo Jugar

1. Abre `index.html` en tu navegador
2. Ingresa tu nombre y únete al juego
3. Espera a que se unan más jugadores (mínimo 2, máximo 5)
4. Lee las instrucciones y haz clic en "COMENZAR JUEGO"
5. Elige un número entre 0 y 100
6. El jugador más cercano al objetivo (promedio × 0.8) gana

## 🛠️ Instalación

### Opción 1: Modo Local (Sin Firebase)

1. Clona o descarga este repositorio
2. Abre `index.html` en tu navegador web

**Nota:** En modo local, el juego funciona pero sin sincronización real entre múltiples jugadores.

### Opción 2: Con Firebase (Recomendado para multijugador real)

1. Clona o descarga este repositorio
2. Sigue las instrucciones en `firebase-config.md` para configurar Firebase
3. Actualiza las credenciales de Firebase en `game.js`
4. Abre `index.html` en tu navegador o despliega en un servidor web

## 📁 Estructura del Proyecto

```
King-of-Diamonds/
├── index.html          # Estructura HTML del juego
├── style.css           # Estilos CSS (diseño oscuro y minimalista)
├── game.js             # Lógica del juego y conexión con Firebase
├── firebase-config.md  # Instrucciones de configuración de Firebase
└── README.md          # Este archivo
```

## 🎯 Tecnologías Utilizadas

- **HTML5**: Estructura semántica
- **CSS3**: Diseño responsive con gradientes y animaciones
- **JavaScript (ES6+)**: Lógica del juego
- **Firebase Realtime Database**: Sincronización en tiempo real

## 🎨 Diseño

- Paleta de colores oscura (#0a0a0a, #1a1a2e)
- Acentos en rojo (#ff6b6b) y dorado (#ffd700)
- Animaciones suaves y transiciones
- Diseño responsive para móviles y tablets
- Tipografía clara y legible

## 🔒 Seguridad

- Validación de entrada en cliente
- Escape de HTML para prevenir XSS
- Límite de caracteres en nombres de jugador
- Validación de números entre 0-100

## 🚢 Despliegue

Puedes desplegar este juego en:
- **Firebase Hosting**
- **GitHub Pages**
- **Netlify**
- **Vercel**
- Cualquier servidor web estático

Ver `firebase-config.md` para instrucciones de despliegue en Firebase.

## 📝 Reglas del Juego

1. Cada jugador debe elegir un número entre 0 y 100
2. Se calcula el promedio de todos los números elegidos
3. El número objetivo es el promedio multiplicado por 0.8
4. El jugador cuyo número esté más cercano al objetivo gana
5. Tiempo límite: 30 segundos para elegir

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue o pull request para sugerencias o mejoras.

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## 🎬 Inspiración

Basado en el juego "King of Diamonds" de la serie Alice in Borderland, donde la estrategia psicológica y la predicción del comportamiento humano son clave para ganar.
