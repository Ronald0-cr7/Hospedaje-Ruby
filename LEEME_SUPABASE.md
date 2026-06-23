# Hospedaje Ruby — Conexión a Supabase

## 1. Ejecuta el script SQL
Entra a tu proyecto en supabase.com → **SQL Editor** → pega y ejecuta el
script que ya tenías (el de las tablas `usuarios`, `clientes`,
`habitaciones`, `reserva_habitacion`, `productos`, `ventas`, etc.). Eso
crea las tablas, los datos iniciales, los triggers de stock y las vistas
del panel estadístico.

## 1.1 Importante: nombre de la variable del cliente
Para evitar el error `Identifier 'supabase' has already been declared`
(que ocurre si el script `supabaseClient.js` queda incluido dos veces en
una página), el cliente ya NO se llama `supabase` sino `supabaseClient`.
Si ves ese error o `supabase.from is not a function`, revisa que en el
HTML el `<script src="...supabaseClient.js">` aparezca **una sola vez**
por página.

## 2. Configura las credenciales
Abre `Interactividad_js/supabaseClient.js` y reemplaza:

```js
const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
const SUPABASE_ANON_KEY = "TU-ANON-KEY-PUBLICA";
```

con los valores reales de **Project Settings → API** en tu proyecto de
Supabase (la URL del proyecto y la "anon public" key).

## 3. Sube los archivos a tu hosting (o ábrelos localmente)
No se necesita backend propio: todo el sistema habla directo con
Supabase desde el navegador usando la `anon key` y las políticas RLS
permisivas que ya vienen en el script SQL.

> ⚠️ Esas políticas (`USING (true)`) dan acceso total de lectura/escritura
> a cualquiera que tenga la anon key. Está bien para una tarea
> universitaria o demo, pero en un sistema real deberías reemplazarlas
> por políticas que exijan autenticación (Supabase Auth) antes de
> permitir escribir.

## 4. ¿Qué se modificó en cada archivo?

| Archivo | Cambio |
|---|---|
| `Interactividad_js/supabaseClient.js` | **Nuevo.** Crea el cliente único de Supabase usado por todos los módulos. |
| `Interactividad_js/login.js` | Ahora valida usuario/contraseña contra la tabla `usuarios` (antes era una lista fija en el HTML). |
| `Index_pagina/Inicio_Sesion.html` | Se quitó el `<script>` inline con usuarios hardcodeados; ahora carga el SDK de Supabase + `supabaseClient.js` + `login.js`. |
| `Interactividad_js/clientes.js` | CRUD completo contra la tabla `clientes`; los totales de ventas/reservas por cliente se calculan leyendo `ventas` y `reserva_habitacion`. |
| `Interactividad_js/gestionar_habitaciones.js` | El estado de cada habitación (Disponible/Ocupada/Limpieza/Mantenimiento) y el contador de tiempo ahora viven en la tabla `habitaciones`, sincronizados con `reserva_habitacion`. |
| `Interactividad_js/reserva.js` | CRUD de reservas contra `reserva_habitacion`, con FKs reales a `clientes`, `habitaciones` y `metodo_pago`. Los selects de habitación y método de pago ahora se llenan dinámicamente desde la BD. |
| `Interactividad_js/inventario.js` | CRUD de productos contra `productos`, con categorías reales tomadas de la tabla `categorias` (el select del HTML ahora se llena dinámicamente). |
| `Interactividad_js/ventas.js` | Registra ventas en `ventas` + `detalle_venta`. El stock se descuenta/repone solo, mediante los triggers `trg_stock_venta` que ya vienen en tu script SQL. |
| `Interactividad_js/proveedores_suministros.js` | CRUD de `proveedores` y `suministros`; el stock de `productos` se actualiza automáticamente vía el trigger `trg_stock_suministro`. |
| `Interactividad_js/panel_estadistico.js` | Los KPIs ahora se calculan leyendo `reserva_habitacion`, `ventas`, `clientes` y la vista `v_ocupacion_habitaciones`. |
| `Interactividad_js/rol_guard.js`, `tema.js`, `panel_control.js` | **Sin cambios.** Solo manejan sesión/tema/sidebar en el navegador, no datos de negocio. |
| Cada `Index_pagina/*.html` (excepto `panel_control.html`) | Se agregó `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2">` y `<script src="../Interactividad_js/supabaseClient.js">` justo antes de los scripts propios de cada página. |

## 5. Usuarios de prueba (ya insertados por el script SQL)

| Usuario | Contraseña | Rol |
|---|---|---|
| admin | admin123 | admin |
| recepcion | recepcion123 | recepcion |
| limpieza | limpieza123 | limpieza |

> Nota de seguridad: las contraseñas se guardan y comparan en texto
> plano, igual que en el sistema original basado en localStorage. Es
> aceptable para esta práctica, pero si el sistema fuera a producción
> real, lo correcto sería usar **Supabase Auth** o, como mínimo, una
> Edge Function que compare un hash (bcrypt) en el servidor, nunca en
> el navegador.

## 6. Cosas a probar primero
1. Abre `Inicio_Sesion.html` e inicia sesión con `admin` / `admin123`.
2. Ve a **Clientes** y registra uno nuevo (usa un DNI de 8 dígitos).
3. Ve a **Inventario** y crea un producto en alguna categoría.
4. Ve a **Reservas**, elige el cliente y una habitación, guarda la
   reserva → deberías ver la habitación marcarse "Ocupada" en
   **Gestión de Habitaciones**.
5. Ve a **Ventas**, vende ese producto → el stock debería bajar en
   **Inventario**.
6. Revisa **Panel Estadístico** para ver los KPIs actualizados.

Si algo falla, abre la consola del navegador (F12): los errores de
Supabase se imprimen ahí con detalle (tabla, columna, mensaje de
Postgres).
