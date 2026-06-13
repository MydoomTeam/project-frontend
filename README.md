# ArenaSync Frontend

Frontend React + TypeScript para la app ArenaSync.

## Resumen

- Framework: React 19
- Bundler: Vite 8
- Lenguaje: TypeScript 6
- Ruteo: React Router v7
- HTTP: Axios
- Estado local: `localStorage` para token y perfil de usuario

## Estructura del frontend

```
project-frontend/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
└── src/
    ├── main.tsx                    # entrada de Vite
    ├── App.tsx                     # enrutamiento y rutas privadas
    ├── assets/                     # estilos y recursos estáticos
    ├── components/                 # componentes reutilizables (Navbar)
    ├── pages/                      # pantallas de la app
    ├── services/                   # cliente HTTP y llamadas a API
    └── types/                      # tipos TypeScript compartidos
```

## Configuración de backend

El frontend usa un proxy de Vite para redirigir `/api` a `http://localhost:8000`.

- `vite.config.ts`
- `apiClient.baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api'`

Si el backend no corre en `localhost:8000`, ajusta `VITE_API_BASE_URL` en un `.env` o modifica `vite.config.ts`.

## Rutas soportadas

- `/login` — login de jugador
- `/register` — registro de jugador
- `/dashboard` — dashboard privado de torneos
- `/tournaments/:id` — detalle privado de torneo
- `/alerts` — alertas privadas

## Flujo de autenticación

1. Login con `POST /sessions`
2. Guarda en `localStorage`:
   - `access_token`
   - `user_profile`
3. Las rutas `/dashboard`, `/tournaments/:id`, `/alerts` están protegidas
4. Axios añade `Authorization: Bearer <token>` automáticamente

## Registro

El frontend envía:

```json
{
  "username": "carlos99",
  "email": "carlos@gmail.com",
  "password": "MiClave2026!"
}
```

Validaciones de contraseña en cliente:

- mínimo 8 caracteres
- al menos una letra
- al menos un número
- al menos un carácter especial

## Torneos

### Endpoints usados

- `GET /tournaments/available` — obtiene torneos pendientes
- `POST /tournaments` — crea torneo
- `GET /tournaments/:id` — obtiene detalle de torneo
- `POST /tournaments/:id/registrations` — inscribirse
- `DELETE /tournaments/:id/registrations` — darse de baja
- `DELETE /tournaments/:id` — cancelar torneo (creador)
- `POST /tournaments/:id/bracket` — generar bracket
- `POST /tournaments/:id/start` — iniciar torneo
- `GET /tournaments/:id/bracket` — obtener bracket
- `POST /tournaments/:id/matches/:match_id/result` — registrar resultado
- `GET /tournaments/:id/ranking` — obtener ranking final

## Comportamientos de UI importantes

- El botón de crear torneo muestra mensajes de error del backend cuando falla.
- El botón de inscripción cambia a `Inscrito` y se desactiva si ya estás registrado.
- El botón `Darme de Baja` aparece solo cuando estás inscrito.
- Las alertas nuevas se muestran con fondo destacado y pueden marcarse como leídas.
- Si `401` viene del backend, se limpia sesión y se redirige a `/login`.

## Instalación

Requisitos:

- Node.js 18+ (o compatible con Vite 8)
- npm o yarn

Instala dependencias y arranca el frontend:

```bash
npm install
npm run dev
```

## Build y ejecución

Compila la aplicación para producción:

```bash
npm run build
```

## Dependencias clave

- `react`
- `react-dom`
- `react-router-dom`
- `axios`
- `zustand`
- `typescript`
- `vite`

## Notas importantes

- El frontend asume que el backend mantiene el contrato en inglés para rutas y JSON.
- La UI presenta estados y mensajes en español.
- El backend debe exponer `/sessions`, `/users`, `/tournaments`, `/alerts`, etc.
- Si el backend cambia el esquema de `Tournament` o las claves de inscripción, el frontend necesitará actualizar `src/services/tournaments.ts` y `src/pages/TournamentDetail.tsx`.

## Posibles mejoras futuras

- convertir alertas `alert()` a mensajes inline
- normalizar el modelo de `TournamentDetail` para incluir si el usuario está registrado
- mover la persistencia de `registered_tournaments` a un endpoint backend propio

