# Firebase Setup Instructions

## 🔥 Crear Proyecto Firebase

Sigue estos pasos para crear el proyecto Firebase:

### 1. Ir a Firebase Console
👉 **https://console.firebase.google.com**

### 2. Crear Nuevo Proyecto
- Click en "Crear proyecto" o "Add project"
- **Nombre del proyecto**: `pajarito-ecommerce` (o el nombre que prefieras)
- **Continuar**

### 3. Google Analytics (Opcional)
- Puedes activarlo o desactivarlo
- **Continuar**

### 4. Configurar Firestore Database
1. En el menú lateral, ve a **"Firestore Database"**
2. Click en **"Crear base de datos"**
3. Selecciona **"modo de producción"** (activaremos reglas después)
4. Ubicación: **us-east1** (o la más cercana a Colombia: us-east1)
5. **Habilitar**

### 5. Configurar Authentication
1. En el menú lateral, ve a **"Authentication"**
2. Click en **"Comenzar"**
3. En la pestaña **"Sign-in method"**:
   - Habilita **"Email/Password"**
   - **Guardar**

### 6. Obtener Configuración Web
1. En **Project Overview** (⚙️ en la parte superior)
2. Click en **"Project settings"**
3. Scroll hasta **"Your apps"**
4. Click en el ícono **web** (`</>`)
5. **Nickname**: "pajarito-web"
6. **NO** marcar "Firebase Hosting"
7. Click **"Register app"**

Verás un objeto de configuración como este:

\`\`\`javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "pajarito-ecommerce.firebaseapp.com",
  projectId: "pajarito-ecommerce",
  storageBucket: "pajarito-ecommerce.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
\`\`\`

### 7. Copiar Configuración
**✅ COPIA TODO EL OBJETO `firebaseConfig`** y pégalo aquí cuando lo tengas.

---

## 📋 Información que Necesito

Una vez tengas el proyecto creado, envíame:

1. ✅ El objeto completo `firebaseConfig` (con todas las keys)
2. ✅ El **Project ID** de Firebase

Con eso podré:
- Configurar la conexión
- Crear el primer usuario admin (thinktic.thinktic@gmail.com)
- Configurar las reglas de seguridad
- Migrar órdenes existentes a Firestore
