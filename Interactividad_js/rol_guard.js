// Verificar sesión y rol en todas las páginas
(function() {
    const sesion = JSON.parse(localStorage.getItem('sesion_usuario') || 'null');
    const pagina = window.location.pathname.split('/').pop().replace('.html','').toLowerCase();
    if (!sesion && !pagina.includes('inicio_sesion')) {
        window.location.href = 'Inicio_Sesion.html';
        return;
    }
    if (sesion && sesion.rol === 'limpieza' && !pagina.includes('gestionar_habitaciones') && !pagina.includes('panel_control') && !pagina.includes('inicio_sesion')) {
        alert('⚠️ Tu rol (Limpieza) solo tiene acceso al módulo de habitaciones.');
        window.location.href = 'gestionar_habitaciones.html';
    }
})();
