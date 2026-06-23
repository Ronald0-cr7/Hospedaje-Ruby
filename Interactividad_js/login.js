// ============================================================
// login.js — Autenticación contra la tabla `usuarios` de Supabase
// ============================================================

// Si ya hay sesión guardada y estamos en la pantalla de login, redirigir
const sesionExistente = JSON.parse(localStorage.getItem('sesion_usuario') || 'null');
if (sesionExistente && window.location.pathname.toLowerCase().includes('inicio_sesion')) {
    window.location.href = './Index_pagina/panel_control.html';
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    if (!form) return; // este script también se incluye en otras páginas

    const inputUsuario = document.getElementById('login-usuario');
    const inputPassword = document.getElementById('login-password');
    const err = document.getElementById('error-msg');
    const btnSubmit = form.querySelector('button[type="submit"]');

    // Mapa de accesos por rol (igual que el original)
    const ACCESOS_POR_ROL = {
        admin:      ['panel_control', 'reservas', 'habitaciones', 'clientes', 'ventas', 'inventario', 'reportes', 'proveedores'],
        supervisor: ['panel_control', 'reservas', 'habitaciones', 'clientes', 'ventas', 'reportes'],
        recepcion:  ['panel_control', 'reservas', 'habitaciones', 'clientes', 'ventas', 'inventario'],
        limpieza:   ['habitaciones']
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (err) err.style.display = 'none';

        const usuario = inputUsuario.value.trim();
        const password = inputPassword.value.trim();

        if (!usuario || !password) {
            if (err) { err.textContent = 'Ingresa usuario y contraseña.'; err.style.display = 'block'; }
            return;
        }

        if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.textContent = 'Verificando...'; }

        try {
            // NOTA: en producción NO se debe comparar contraseñas en texto
            // plano desde el frontend. Lo ideal es usar Supabase Auth o una
            // función RPC/Edge Function que valide el hash en el servidor.
            const { data, error } = await supabaseClient
                .from('usuarios')
                .select('id, username, password, nombre, rol, activo')
                .eq('username', usuario)
                .eq('activo', true)
                .maybeSingle();

            if (error) throw error;

            if (!data || data.password !== password) {
                if (err) { err.textContent = 'Usuario o contraseña incorrectos.'; err.style.display = 'block'; }
                return;
            }

            const sesion = {
                usuario: data.username,
                rol: data.rol,
                nombre: data.nombre,
                acceso: ACCESOS_POR_ROL[data.rol] || []
            };

            localStorage.setItem('sesion_usuario', JSON.stringify(sesion));
            window.location.href = '/Hospedaje-Ruby/Index_pagina/panel_control.html';
        } catch (error) {
            console.error(error);
            if (err) { err.textContent = 'No se pudo conectar con la base de datos.'; err.style.display = 'block'; }
        } finally {
            if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.textContent = 'Ingresar al sistema'; }
        }
    });
});
