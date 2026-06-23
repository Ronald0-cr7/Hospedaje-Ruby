// ============================================================
//  supabaseClient.js
//  Cliente único de Supabase para todo el sistema Hospedaje Ruby.
//
//  IMPORTANTE: este archivo está escrito para que NUNCA truene aunque
//  el <script src="supabaseClient.js"> se incluya por error más de una
//  vez en la misma página (cosa que causa el clásico error
//  "Identifier 'supabase' has already been declared"). Por eso NO usamos
//  `const`/`let` a nivel superior del archivo: todo vive dentro de un
//  bloque `if`, y el cliente se guarda como propiedad de `window`.
//
//  Debe cargarse así, en este orden, ANTES de cualquier otro script
//  de Interactividad_js:
//
//  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//  <script src="../Interactividad_js/supabaseClient.js"></script>
//  <script src="../Interactividad_js/clientes.js"></script>  <!-- u otro módulo -->
// ============================================================

if (!window.supabaseClient) {
    // 1. Reemplaza estos dos valores con los de tu proyecto Supabase
    //    (Project Settings -> API en supabase.com)
    const SUPABASE_URL = "https://wobdvzysbzgyrgmhsncm.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvYmR2enlzYnpneXJnbWhzbmNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NzY1NzAsImV4cCI6MjA5NzE1MjU3MH0.rMN1_Rs4pLcLJxm24ClGBH8q62KmK2E8SKAe-0z9l04";

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        console.error(
            '[Supabase] El SDK no se cargó. Verifica que el <script> de ' +
            'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2 esté ANTES ' +
            'de supabaseClient.js en el HTML.'
        );
    } else {
        // Guardamos el cliente en window.supabaseClient (NUNCA en una variable
        // global "supabase", para no chocar con el namespace del SDK ni con
        // una posible doble carga de este mismo archivo).
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
}

// Alias de conveniencia: todos los módulos del sistema llaman a
// supabaseClient.from(...), nunca a supabase.from(...) directamente.
var supabaseClient = window.supabaseClient;

// ------------------------------------------------------------
// Helper genérico para mostrar errores de Supabase de forma
// consistente en toda la app. Se declara con `function` (no const/let)
// para que tampoco truene si este archivo se carga dos veces.
// ------------------------------------------------------------
function manejarErrorSupabase(error, mensajeUsuario) {
    console.error("[Supabase]", error);
    alert(mensajeUsuario || `Ocurrió un error al comunicarse con la base de datos: ${error?.message || error}`);
}
