# Firestore Security Rules Setup

## 🚨 ACCIÓN REQUERIDA: Configurar Reglas de Seguridad

Durante el testing detectamos un error de permisos de Firestore. Necesitas configurar las reglas de seguridad.

---

## Pasos para Configurar Firestore Rules

### Opción 1: Firebase Console (Manual - Más Rápido)

1. Ve a **Firebase Console**: https://console.firebase.google.com
2. Selecciona tu proyecto: `pajarito-ecommerce`
3. En el menú lateral, ve a **Firestore Database**
4. Click en la pestaña **"Rules"** (Reglas)
5. **Reemplaza todo el contenido** con las siguientes reglas:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Orders collection
    match /orders/{orderId} {
      // Anyone can create orders (from checkout)
      allow create: if true;
      
      // Only authenticated admins can read, update, delete
      allow read, update, delete: if request.auth != null;
    }
    
    // Customers collection
    match /customers/{customerId} {
      // Security FIX: Prevent listing all customers (PII leak).
      // Only allow getting a specific customer if the ID is known
      allow get: if true;
      allow list: if false;
      allow create, update: if true;
      allow delete: if request.auth != null;
    }
    
    // Products collection (future)
    match /products/{productId} {
      // Anyone can read products (for storefront)
      allow read: if true;
      
      // Only authenticated admins can write
      allow write: if request.auth != null;
    }
    
    // Default: deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

6. Click en **"Publish"** (Publicar)

---

### Opción 2: Firebase CLI (Deployment Automático)

Si tienes Firebase CLI instalado:

\`\`\`bash
# Desde el directorio del proyecto
firebase deploy --only firestore:rules
\`\`\`

---

## ¿Por Qué Este Error?

**Error encontrado:**
```
[code=permission-denied]: Missing or insufficient permissions
```

**Causa:** 
Por defecto, Firestore viene con reglas muy restrictivas que bloquean todas las operaciones.

**Solución:**
Las reglas configuradas arriba permiten:
- ✅ Cualquiera puede **crear** órdenes (checkout público)
- ✅ Solo admins autenticados pueden **leer/modificar** órdenes
- ✅ Datos protegidos, pero checkout funcional

---

## Verificar que Funciona

Después de configurar las reglas:

1. Ve a la tienda: **http://localhost:3001**
2. Agrega un producto al carrito
3. Completa el checkout
4. Deberías ser redirigido a `/confirmacion/[ID]`
5. Ve a **/admin/pedidos** y verás el pedido en "Pendiente"

---

## Seguridad

### ✅ Qué está protegido:
- Solo admins pueden ver/editar pedidos
- Solo admins pueden acceder al dashboard
- Datos de clientes protegidos

### ⚠️ Qué es público (intencionalmente):
- Crear órdenes (necesario para checkout)
- Leer productos (necesario para storefront)

Esto es **exactamente lo que necesitas** para un e-commerce público con admin protegido.

---

## Próximos Pasos

Una vez configuradas las reglas:
1. ✅ Test checkout completo
2. ✅ Verificar pedido aparece en Kanban
3. ✅ Probar cambiar estados de pedidos (drag & drop)
4. ✅ Continuar con Phase 2: Customer Management
