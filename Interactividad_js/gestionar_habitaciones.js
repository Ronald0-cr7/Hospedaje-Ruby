// GESTIÓN DE HABITACIONES — conectado a Supabase
// Tablas usadas: habitaciones, tipo_habitacion, reserva_habitacion, clientes

const iconosPorTipo = { "Matrimonial": "🛏️", "Doble": "🛏️🛏️" };
const estadosValidos = ["Disponible", "Ocupada", "Limpieza", "Mantenimiento"];
const coloresEstados = { "Disponible":"disponible","Ocupada":"ocupada","Limpieza":"limpieza","Mantenimiento":"mantenimiento" };

// Estado en memoria, recargado desde Supabase
let habitaciones = [];          // [{ id_habitacion, numero_habitacion, tipo, piso, estado, inicio_ocupacion }]
let reservasActivas = {};       // { numero_habitacion: { clienteNombre, fechaSalida, reservaId } }
const contadoresActivos = {};

document.addEventListener("DOMContentLoaded", () => {
    inicializarHabitaciones();
    setInterval(sincronizarEstadosDesdeReservas, 30000);
});

async function inicializarHabitaciones() {
    await cargarHabitaciones();
    await sincronizarEstadosDesdeReservas();
}

async function cargarHabitaciones() {
    const { data, error } = await supabaseClient
        .from('habitaciones')
        .select('id_habitacion, numero_habitacion, piso, estado, inicio_ocupacion, tipo_habitacion(nombre)')
        .order('numero_habitacion', { ascending: true });

    if (error) { manejarErrorSupabase(error, 'No se pudieron cargar las habitaciones.'); return; }

    habitaciones = (data || []).map(h => ({
        id: h.id_habitacion,
        numero: h.numero_habitacion,
        piso: h.piso,
        estado: h.estado,
        inicioOcupacion: h.inicio_ocupacion,
        tipo: h.tipo_habitacion?.nombre || 'Matrimonial'
    }));

    renderizarTodas();
    actualizarEstadisticas();
    iniciarContadores();
}

async function cargarReservasActivas() {
    const ahora = new Date().toISOString();
    const { data, error } = await supabaseClient
        .from('reserva_habitacion')
        .select('reserva_id, id_habitacion, fecha_salida, estado_habitacion, clientes(apellidos_nombres)')
        .eq('estado_habitacion', 'Ocupada')
        .gt('fecha_salida', ahora);

    if (error) { manejarErrorSupabase(error, 'No se pudieron cargar las reservas activas.'); return; }

    reservasActivas = {};
    (data || []).forEach(r => {
        const hab = habitaciones.find(h => h.id === r.id_habitacion);
        if (!hab) return;
        reservasActivas[hab.numero] = {
            reservaId: r.reserva_id,
            clienteNombre: r.clientes?.apellidos_nombres || 'Cliente',
            fechaSalida: r.fecha_salida
        };
    });
}

function obtenerHabitacionPorNumero(numero) {
    return habitaciones.find(h => String(h.numero) === String(numero));
}

// REQUISITO 8: Condicionar estado — si está Ocupada no se puede cambiar desde aquí
async function cambiarEstado(numero, nuevoEstado) {
    if (!estadosValidos.includes(nuevoEstado)) return;
    const hab = obtenerHabitacionPorNumero(numero);
    if (!hab) return;

    if (hab.estado === "Ocupada") {
        const reservaActiva = reservasActivas[numero];
        if (reservaActiva) {
            alert(`⚠️ La habitación ${numero} está en uso activo.\nCliente: ${reservaActiva.clienteNombre}\nSalida: ${new Date(reservaActiva.fechaSalida).toLocaleString('es-PE')}\n\nNo se puede cambiar el estado mientras esté ocupada.`);
            cerrarModal();
            return;
        }
    }

    const payload = { estado: nuevoEstado };
    payload.inicio_ocupacion = nuevoEstado === "Ocupada" ? new Date().toISOString() : null;

    const { error } = await supabaseClient
        .from('habitaciones')
        .update(payload)
        .eq('id_habitacion', hab.id);

    if (error) { manejarErrorSupabase(error, 'No se pudo cambiar el estado de la habitación.'); return; }

    if (nuevoEstado !== "Ocupada" && contadoresActivos[numero]) {
        clearInterval(contadoresActivos[numero]);
        delete contadoresActivos[numero];
    }

    cerrarModal();
    await cargarHabitaciones();
    await cargarReservasActivas();
    renderizarTodas();
}

// REQUISITO 9: Contador de tiempo de alquiler
function iniciarContadores() {
    Object.keys(contadoresActivos).forEach(n => clearInterval(contadoresActivos[n]));

    habitaciones.filter(h => h.estado === "Ocupada" && h.inicioOcupacion).forEach(h => {
        const inicio = new Date(h.inicioOcupacion);
        contadoresActivos[h.numero] = setInterval(() => {
            const el = document.getElementById(`contador-${h.numero}`);
            if (!el) return;
            const diff = Math.floor((new Date() - inicio) / 1000);
            const hh = Math.floor(diff / 3600).toString().padStart(2,'0');
            const mm = Math.floor((diff % 3600) / 60).toString().padStart(2,'0');
            const ss = (diff % 60).toString().padStart(2,'0');
            el.textContent = `⏱ ${hh}:${mm}:${ss}`;
        }, 1000);
    });
}

// Sincronizar estados desde reservas activas (por si una reserva venció o empezó)
async function sincronizarEstadosDesdeReservas() {
    await cargarReservasActivas();

    const ahora = new Date();
    const actualizaciones = [];

    habitaciones.forEach(h => {
        const activa = reservasActivas[h.numero];
        if (activa && h.estado !== "Ocupada") {
            actualizaciones.push({ id: h.id, estado: "Ocupada", inicio_ocupacion: new Date().toISOString() });
        } else if (!activa && h.estado === "Ocupada") {
            // La reserva venció: pasar a Limpieza automáticamente
            actualizaciones.push({ id: h.id, estado: "Limpieza", inicio_ocupacion: null });
        }
    });

    for (const u of actualizaciones) {
        await supabaseClient.from('habitaciones').update({ estado: u.estado, inicio_ocupacion: u.inicio_ocupacion }).eq('id_habitacion', u.id);
    }

    if (actualizaciones.length > 0) {
        await cargarHabitaciones();
        await cargarReservasActivas();
    }

    renderizarTodas();
    actualizarEstadisticas();
    iniciarContadores();
}

function renderizarTodas() {
    const grid = document.getElementById("grid-habitaciones");
    if (!grid) return;
    grid.innerHTML = "";
    habitaciones
        .slice()
        .sort((a, b) => a.numero - b.numero)
        .forEach(h => grid.appendChild(crearTarjeta(h)));
}

function crearTarjeta(hab) {
    const colorEstado = coloresEstados[hab.estado] || "disponible";
    const tieneTimer = hab.estado === "Ocupada" && !!hab.inicioOcupacion;

    const tarjeta = document.createElement("div");
    tarjeta.className = "tarjeta-habitacion";
    tarjeta.dataset.numero = hab.numero;
    tarjeta.dataset.estado = hab.estado;

    const reservaActiva = reservasActivas[hab.numero];
    const infoCliente = reservaActiva
        ? `<div class="cliente-info">👤 ${reservaActiva.clienteNombre.split(' ').slice(0,2).join(' ')}</div>`
        : '';

    const contadorHtml = tieneTimer
        ? `<div class="contador-timer" id="contador-${hab.numero}">⏱ --:--:--</div>`
        : '';

    tarjeta.innerHTML = `
        <div class="numero-habitacion">${hab.numero}</div>
        <div class="icono-cama">${iconosPorTipo[hab.tipo] || "🛏️"}</div>
        <div class="tipo-habitacion">${hab.tipo}</div>
        ${infoCliente}
        <div class="estado-badge estado-${colorEstado}">
            <span class="punto-estado"></span>${hab.estado}
        </div>
        ${contadorHtml}
    `;

    tarjeta.addEventListener("click", () => abrirModalCambioEstado(hab.numero));
    return tarjeta;
}

function abrirModalCambioEstado(numero) {
    const modal = document.getElementById("modal-estado");
    document.getElementById("habitacion-numero-modal").textContent = numero;
    const opcionesDiv = document.getElementById("opciones-estado");
    opcionesDiv.innerHTML = "";

    const hab = obtenerHabitacionPorNumero(numero);
    const reservaActiva = reservasActivas[numero];

    if (hab && hab.estado === "Ocupada" && reservaActiva) {
        opcionesDiv.innerHTML = `
            <div style="text-align:center;padding:16px;background:#fef9c3;border-radius:12px;margin-bottom:12px;">
                <div style="font-size:1.5rem;margin-bottom:6px;">🔒</div>
                <strong>Habitación en uso activo</strong><br>
                <small>Cliente: ${reservaActiva.clienteNombre}</small><br>
                <small>Salida: ${new Date(reservaActiva.fechaSalida).toLocaleString('es-PE')}</small>
            </div>
            <p style="color:#64748b;font-size:.85rem;text-align:center;">No se puede cambiar el estado mientras la habitación esté ocupada con una reserva activa.</p>
        `;
        modal.classList.add("activo");
        return;
    }

    const iconos = { "Disponible":"✓", "Ocupada":"⏱", "Limpieza":"🧹", "Mantenimiento":"⚙" };
    estadosValidos.forEach(estado => {
        const btn = document.createElement("button");
        btn.className = `btn-opcion${hab && estado === hab.estado ? ' activo' : ''}`;
        btn.innerHTML = `<span class="opcion-icono">${iconos[estado]}</span>${estado}`;
        btn.addEventListener("click", () => cambiarEstado(numero, estado));
        opcionesDiv.appendChild(btn);
    });

    modal.classList.add("activo");
}

function cerrarModal() { document.getElementById("modal-estado").classList.remove("activo"); }
function abrirModal() { window.location.href = 'reservas.html'; }
function abrirCheckout() { alert("Funcionalidad de Check-Out en construcción"); }
function volverPanel() { window.location.href = 'panel_control.html'; }

function actualizarEstadisticas() {
    const conteos = { "Disponible":0, "Ocupada":0, "Limpieza":0, "Mantenimiento":0 };
    habitaciones.forEach(h => {
        if (conteos.hasOwnProperty(h.estado)) conteos[h.estado]++;
    });

    const setTexto = (id, valor) => { const el = document.getElementById(id); if (el) el.textContent = valor; };
    setTexto("total-disponibles", conteos["Disponible"]);
    setTexto("total-ocupadas", conteos["Ocupada"]);
    setTexto("total-limpieza", conteos["Limpieza"]);
    setTexto("total-mantenimiento", conteos["Mantenimiento"]);
    setTexto("count-disponibles", conteos["Disponible"]);
    setTexto("count-ocupadas", conteos["Ocupada"]);
    setTexto("count-limpieza", conteos["Limpieza"]);
    setTexto("count-mantenimiento", conteos["Mantenimiento"]);
}

document.addEventListener("click", (e) => {
    const modal = document.getElementById("modal-estado");
    if (e.target === modal) cerrarModal();
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarModal(); });
