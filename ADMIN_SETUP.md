# Create Admin User

Este script te ayudará a crear el primer usuario administrador en Firebase.

## Opción 1: Usar Firebase Console (Recomendado)

1. Ve a **Firebase Console** → Tu proyecto → **Authentication**
2. Click en la pestaña **"Users"**
3. Click en **"Add user"**
4. Ingresa:
   - **Email**: `thinktic.thinktic@gmail.com`
   - **Password**: `[TU_CONTRASEÑA_SEGURA]` (mínimo 6 caracteres)
5. Click **"Add user"**

## Opción 2: Registrarse desde la App

Temporalmente puedes crear una página de registro:

1. Ve a `http://localhost:3001/admin/login`
2. Modifica temporalmente el código para agregar un botón de registro
3. Regístrate con `thinktic.thinktic@gmail.com`
4. Luego remueve el botón de registro del código

## Prueba el Login

Una vez creado el usuario:

1. Ve a **http://localhost:3001/admin/login**
2. Ingresa:
   - Email: `thinktic.thinktic@gmail.com`
   - Password: `[la que configuraste]`
3. Deberías ser redirigido a `/admin`

---

## Contraseña Sugerida

Para desarrollo, puedes usar: `Pajarito2026!`

⚠️ **IMPORTANTE**: Cambia esto en producción por una contraseña segura.
