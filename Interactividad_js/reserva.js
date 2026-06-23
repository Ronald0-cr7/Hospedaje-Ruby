// RESERVAS — conectado a Supabase
// Tablas usadas: clientes, habitaciones, tipo_habitacion, metodo_pago, reserva_habitacion

const reservaForm = document.getElementById("reserva-form");
const inventoryBody = document.getElementById("inventory-body");
const clienteRegistrado = document.getElementById("cliente-registrado");

const campos = {
	clienteId:              document.getElementById("cliente-id"),
	clienteNombre:          document.getElementById("cliente-nombre"),
	clienteFechaNacimiento: document.getElementById("cliente-fecha-nacimiento"),
	clienteDni:             document.getElementById("cliente-dni"),
	clienteResidencia:      document.getElementById("cliente-residencia"),
	reservaId:              document.getElementById("reserva-id"),
	numeroHabitacion:       document.getElementById("numero-habitacion"),
	tipoHabitacion:         document.getElementById("tipo-habitacion"),
	precioBase:             document.getElementById("precio-base"),
	nochesEstadia:          document.getElementById("noches-estadia"),
	fechaEntrada:           document.getElementById("fecha_entrada"),
	fechaSalida:            document.getElementById("fecha_salida"),
	importeTotal:           document.getElementById("importe-total"),
	metodoPago:             document.getElementById("metodo-pago"),
	estadoHabitacion:       document.getElementById("estado-habitacion")
};

let filaEditando = null;
let reservas = [];        // copia en memoria de reserva_habitacion (con datos "planos")
let clientes = [];
let habitaciones = [];    // [{ id_habitacion, numero, tipo, precio_base, estado }]
let metodosPago = [];     // [{ id_metodo_pago, nombre }]

// ── CARGA INICIAL DESDE SUPABASE ──────────────────────────────

async function cargarClientesGuardados() {
	const { data, error } = await supabaseClient
		.from('clientes')
		.select('id_cliente, apellidos_nombres, fecha_nacimiento, dni, distrito_ciudad')
		.order('apellidos_nombres', { ascending: true });
	if (error) { manejarErrorSupabase(error, 'No se pudieron cargar los clientes.'); return; }
	clientes = data || [];
}

async function cargarHabitacionesDisponiblesParaSelect() {
	const { data, error } = await supabaseClient
		.from('habitaciones')
		.select('id_habitacion, numero_habitacion, precio_base, estado, tipo_habitacion(nombre)')
		.order('numero_habitacion', { ascending: true });
	if (error) { manejarErrorSupabase(error, 'No se pudieron cargar las habitaciones.'); return; }

	habitaciones = (data || []).map(h => ({
		id: h.id_habitacion,
		numero: h.numero_habitacion,
		tipo: h.tipo_habitacion?.nombre || 'Matrimonial',
		precioBase: Number(h.precio_base),
		estado: h.estado
	}));
}

async function cargarMetodosPago() {
	const { data, error } = await supabaseClient.from('metodo_pago').select('id_metodo_pago, nombre').order('id_metodo_pago');
	if (error) { manejarErrorSupabase(error, 'No se pudieron cargar los métodos de pago.'); return; }
	metodosPago = data || [];
}

async function cargarReservas() {
	const { data, error } = await supabaseClient
		.from('reserva_habitacion')
		.select(`
			reserva_id, fecha_entrada, fecha_salida, precio_base, noches_estadia,
			importe_total, estado_habitacion,
			id_cliente, id_habitacion, id_metodo_pago,
			clientes(apellidos_nombres, fecha_nacimiento, dni, distrito_ciudad),
			habitaciones(numero_habitacion, tipo_habitacion(nombre)),
			metodo_pago(nombre)
		`)
		.order('fecha_entrada', { ascending: false });

	if (error) { manejarErrorSupabase(error, 'No se pudieron cargar las reservas.'); return; }

	reservas = (data || []).map(mapearReservaPlano);
}

function mapearReservaPlano(r) {
	return {
		reservaId: r.reserva_id,
		clienteId: r.id_cliente,
		clienteNombre: r.clientes?.apellidos_nombres || '',
		clienteFechaNacimiento: r.clientes?.fecha_nacimiento || '',
		clienteDni: r.clientes?.dni || '',
		clienteResidencia: r.clientes?.distrito_ciudad || '',
		idHabitacion: r.id_habitacion,
		numeroHabitacion: r.habitaciones?.numero_habitacion ?? '',
		tipoHabitacion: r.habitaciones?.tipo_habitacion?.nombre || '',
		precioBase: Number(r.precio_base),
		nochesEstadia: r.noches_estadia,
		fechaEntrada: r.fecha_entrada,
		fechaSalida: r.fecha_salida,
		importeTotal: Number(r.importe_total),
		idMetodoPago: r.id_metodo_pago,
		metodoPago: r.metodo_pago?.nombre || 'No registrado',
		estadoHabitacion: r.estado_habitacion
	};
}

async function cargarTodoYRenderizar() {
	await Promise.all([cargarClientesGuardados(), cargarHabitacionesDisponiblesParaSelect(), cargarMetodosPago(), cargarReservas()]);
	cargarClientesEnSelect();
	poblarSelectHabitaciones();
	poblarSelectMetodoPago();
	renderizarTablaReservas(reservas);
	actualizarDisponibilidadHabitaciones();
}

// ── CLIENTES ──────────────────────────────────────────────────

function validarDniFormato(dni) {
	return /^\d{8}$/.test(String(dni).trim());
}

function cargarClientesEnSelect() {
	if (!clienteRegistrado) return;
	const valorActual = clienteRegistrado.value;
	clienteRegistrado.innerHTML = '<option value="">-- Selecciona un cliente guardado o registra uno nuevo --</option>';
	clientes.forEach((c) => {
		const opt = document.createElement('option');
		opt.value = c.id_cliente;
		opt.textContent = `${c.apellidos_nombres} - DNI: ${c.dni}`;
		opt.dataset.nombre     = c.apellidos_nombres;
		opt.dataset.fechaNac   = c.fecha_nacimiento || '';
		opt.dataset.dni        = c.dni;
		opt.dataset.residencia = c.distrito_ciudad || '';
		clienteRegistrado.appendChild(opt);
	});
	clienteRegistrado.value = valorActual;
}

function habilitarCamposCliente(bloquear) {
	if (!campos.clienteId) return;
	campos.clienteId.readOnly             = bloquear;
	campos.clienteNombre.readOnly         = bloquear;
	campos.clienteFechaNacimiento.readOnly = bloquear;
	campos.clienteDni.readOnly            = bloquear;
	campos.clienteResidencia.readOnly     = bloquear;
}

function cargarClienteSeleccionado() {
	if (!clienteRegistrado) return;
	const id = clienteRegistrado.value;
	if (!id) {
		if (campos.clienteId)             campos.clienteId.value = "";
		if (campos.clienteNombre)         campos.clienteNombre.value = "";
		if (campos.clienteFechaNacimiento) campos.clienteFechaNacimiento.value = "";
		if (campos.clienteDni)            campos.clienteDni.value = "";
		if (campos.clienteResidencia)     campos.clienteResidencia.value = "";
		habilitarCamposCliente(false);
		return;
	}
	const c = clientes.find(x => x.id_cliente === id);
	if (!c) return;
	if (campos.clienteId)             campos.clienteId.value = c.id_cliente;
	if (campos.clienteNombre)         campos.clienteNombre.value = c.apellidos_nombres;
	if (campos.clienteFechaNacimiento) campos.clienteFechaNacimiento.value = c.fecha_nacimiento || '';
	if (campos.clienteDni)            campos.clienteDni.value = c.dni;
	if (campos.clienteResidencia)     campos.clienteResidencia.value = c.distrito_ciudad || '';
	habilitarCamposCliente(true);
}

function clienteExistePorDni(dni) {
	return clientes.find(c => String(c.dni).trim() === String(dni).trim());
}

// Crea el cliente en Supabase si todavía no existe (por DNI). Devuelve { cliente, creado }
async function guardarClienteDesdeReserva(datos) {
	const dni = String(datos.dni || '').trim();
	const existe = clienteExistePorDni(dni);
	if (existe) return { cliente: existe, creado: false };

	const nuevo = {
		id_cliente:        String(datos.id_cliente || '').trim(),
		apellidos_nombres: String(datos.apellidos_nombres || '').trim(),
		fecha_nacimiento:  datos.fecha_nacimiento || null,
		dni,
		distrito_ciudad:   String(datos.distrito_ciudad || '').trim(),
		telefono: ''
	};

	const { error } = await supabaseClient.from('clientes').insert([nuevo]);
	if (error) throw error;

	clientes.push(nuevo);
	return { cliente: nuevo, creado: true };
}

// ── HABITACIONES ──────────────────────────────────────────────

function poblarSelectHabitaciones() {
	const valorActual = campos.numeroHabitacion.value;
	campos.numeroHabitacion.innerHTML = '<option value="">Seleccione una habitación</option>';
	habitaciones.forEach(h => {
		const opt = document.createElement('option');
		opt.value = h.numero;
		opt.dataset.tipo = h.tipo;
		opt.dataset.precio = h.precioBase;
		opt.dataset.idHabitacion = h.id;
		const noDisponible = h.estado === "Ocupada" || h.estado === "Limpieza";
		opt.disabled = noDisponible;
		opt.textContent = noDisponible ? `${h.numero} — NO DISPONIBLE` : `${h.numero} (${h.tipo})`;
		campos.numeroHabitacion.appendChild(opt);
	});
	campos.numeroHabitacion.value = valorActual;
}

function poblarSelectMetodoPago() {
	const valorActual = campos.metodoPago.value;
	campos.metodoPago.innerHTML = '<option value="">Seleccione método de pago</option>';
	metodosPago.forEach(m => {
		const opt = document.createElement('option');
		opt.value = m.nombre;
		opt.textContent = m.nombre;
		campos.metodoPago.appendChild(opt);
	});
	campos.metodoPago.value = valorActual;
}

function actualizarDisponibilidadHabitaciones() {
	campos.numeroHabitacion.querySelectorAll("option[value]").forEach(op => {
		if (!op.value) return;
		const hab = habitaciones.find(h => String(h.numero) === String(op.value));
		if (!hab) return;
		const noDisponible = hab.estado === "Ocupada" || hab.estado === "Limpieza";
		op.disabled = noDisponible;
		op.textContent = noDisponible ? `${hab.numero} — NO DISPONIBLE` : `${hab.numero} (${hab.tipo})`;
	});
}

function asignarTipoHabitacionAutomaticamente() {
	const num = campos.numeroHabitacion.value;
	if (!num) { campos.tipoHabitacion.value = ""; campos.precioBase.value = ""; return; }
	const op = campos.numeroHabitacion.querySelector(`option[value="${num}"]`);
	if (op) {
		campos.tipoHabitacion.value = op.dataset.tipo;
		if (!campos.precioBase.value) campos.precioBase.value = Number(op.dataset.precio || 0).toFixed(2);
	}
}

// ── CÁLCULO IMPORTE ───────────────────────────────────────────

function normalizarNumero(v) {
	if (v === null || v === undefined || v === "") return NaN;
	return Number(String(v).replace(",", "."));
}

function calcularNochesDesdeFechas(entrada, salida) {
	const e = new Date(entrada), s = new Date(salida);
	if (isNaN(e) || isNaN(s) || s <= e) return "";
	return Math.max(1, Math.ceil((s - e) / (1000 * 60 * 60 * 12)));
}

function calcularImporteTotal() {
	const precio  = normalizarNumero(campos.precioBase.value);
	const entrada = new Date(campos.fechaEntrada.value);
	const salida  = new Date(campos.fechaSalida.value);

	if (!precio || isNaN(entrada) || isNaN(salida) || salida <= entrada) {
		campos.nochesEstadia.value = "";
		campos.importeTotal.value  = "";
		return 0;
	}

	const bloques = Math.max(1, Math.ceil((salida - entrada) / (1000 * 60 * 60 * 12)));
	const total   = precio * bloques;

	campos.nochesEstadia.value = String(bloques);
	campos.precioBase.value    = Number(precio).toFixed(2);
	campos.importeTotal.value  = total.toFixed(2);
	return total;
}

// ── TABLA: RENDERIZAR ─────────────────────────────────────────

function formatearFecha(iso) {
	const f = new Date(iso);
	if (isNaN(f)) return "";
	return f.toLocaleString("es-PE", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
}

function badgeEstado(estado) {
	const mapa = {
		"Disponible":    "badge-disponible",
		"Ocupada":       "badge-ocupada",
		"Limpieza":      "badge-limpieza",
		"Reservada":     "badge-reservada",
		"Mantenimiento": "badge-mantenimiento"
	};
	const cls = mapa[estado] || "badge-disponible";
	return `<span class="badge ${cls}">${estado || "—"}</span>`;
}

function renderizarTablaReservas(lista) {
	inventoryBody.innerHTML = '';
	lista.forEach(r => inventoryBody.appendChild(crearFilaDesdeDatos(r)));
}

function crearFilaDesdeDatos(d) {
	const fila = document.createElement('tr');
	fila.dataset.reservaId = d.reservaId;

	const noches = d.nochesEstadia || calcularNochesDesdeFechas(d.fechaEntrada, d.fechaSalida);

	fila.innerHTML = `
		<td>${d.reservaId || "—"}</td>
		<td>${d.clienteId || "—"}</td>
		<td>${d.clienteNombre || "—"}</td>
		<td>${d.clienteFechaNacimiento || "—"}</td>
		<td>${d.clienteDni || "—"}</td>
		<td>${d.clienteResidencia || "—"}</td>
		<td>${d.numeroHabitacion || "—"}</td>
		<td>${d.tipoHabitacion || "—"}</td>
		<td>S/ ${Number(d.precioBase).toFixed(2)}</td>
		<td>${noches}</td>
		<td>${formatearFecha(d.fechaEntrada)}</td>
		<td>${formatearFecha(d.fechaSalida)}</td>
		<td>S/ ${Number(d.importeTotal).toFixed(2)}</td>
		<td>${d.metodoPago || "No registrado"}</td>
		<td>${badgeEstado(d.estadoHabitacion)}</td>
		<td>
			<button type="button" class="btn-editar">✏️ Editar</button>
			<button type="button" class="btn-eliminar">🗑️ Eliminar</button>
		</td>
	`;

	fila.querySelector(".btn-editar").addEventListener("click", () => {
		filaEditando = d.reservaId;
		llenarFormularioDesdeDatos(d);
		window.scrollTo({ top: 0, behavior: "smooth" });
	});

	fila.querySelector(".btn-eliminar").addEventListener("click", () => eliminarReserva(d.reservaId, d.idHabitacion));

	return fila;
}

function llenarFormularioDesdeDatos(d) {
	if (campos.clienteId)             campos.clienteId.value = d.clienteId;
	if (campos.clienteNombre)         campos.clienteNombre.value = d.clienteNombre;
	if (campos.clienteFechaNacimiento) campos.clienteFechaNacimiento.value = d.clienteFechaNacimiento;
	if (campos.clienteDni)            campos.clienteDni.value = d.clienteDni;
	if (campos.clienteResidencia)     campos.clienteResidencia.value = d.clienteResidencia;
	campos.reservaId.value        = d.reservaId;
	campos.numeroHabitacion.value = d.numeroHabitacion;
	campos.tipoHabitacion.value   = d.tipoHabitacion;
	campos.precioBase.value       = Number(d.precioBase).toFixed(2);
	campos.fechaEntrada.value     = d.fechaEntrada ? d.fechaEntrada.slice(0, 16) : '';
	campos.fechaSalida.value      = d.fechaSalida ? d.fechaSalida.slice(0, 16) : '';
	campos.importeTotal.value     = Number(d.importeTotal).toFixed(2);
	campos.metodoPago.value       = d.metodoPago || "";
	campos.estadoHabitacion.value = d.estadoHabitacion;
	if (clienteRegistrado) clienteRegistrado.value = d.clienteId || "";
	actualizarDisponibilidadHabitaciones();
}

async function eliminarReserva(reservaId, idHabitacion) {
	if (!window.confirm("¿Deseas eliminar esta reserva?")) return;

	const { error } = await supabaseClient.from('reserva_habitacion').delete().eq('reserva_id', reservaId);
	if (error) { manejarErrorSupabase(error, 'No se pudo eliminar la reserva.'); return; }

	// Liberar la habitación
	await supabaseClient.from('habitaciones').update({ estado: 'Disponible', inicio_ocupacion: null }).eq('id_habitacion', idHabitacion);

	if (filaEditando === reservaId) filaEditando = null;
	await cargarTodoYRenderizar();
}

// ── FILTROS Y EXCEL ───────────────────────────────────────────

function filtrarReservasPorFechas() {
	const fechaDesde = document.getElementById("fecha-desde").value;
	const fechaHasta = document.getElementById("fecha-hasta").value;

	if (!fechaDesde || !fechaHasta) { alert("Selecciona ambas fechas."); return; }

	const desde = new Date(fechaDesde);
	const hasta = new Date(fechaHasta);
	hasta.setHours(23, 59, 59, 999);

	const filtradas = reservas.filter(r => {
		const entrada = new Date(r.fechaEntrada);
		const salida = new Date(r.fechaSalida);
		return entrada <= hasta && salida >= desde;
	});

	renderizarTablaReservas(filtradas);
}

function mostrarTodasLasReservas() {
	renderizarTablaReservas(reservas);
}

function exportReservasExcel() {
	if (typeof XLSX === "undefined") { alert("No se pudo cargar la librería Excel."); return; }
	const filas = reservas.map(r => ({
		ID_Reserva:       r.reservaId,
		ID_Cliente:       r.clienteId,
		Cliente:          r.clienteNombre,
		FechaNacimiento:  r.clienteFechaNacimiento,
		DNI:              r.clienteDni,
		Residencia:       r.clienteResidencia,
		N_Habitacion:     r.numeroHabitacion,
		Tipo:             r.tipoHabitacion,
		PrecioBase:       Number(r.precioBase).toFixed(2),
		Bloques:          r.nochesEstadia || calcularNochesDesdeFechas(r.fechaEntrada, r.fechaSalida),
		Entrada:          r.fechaEntrada,
		Salida:           r.fechaSalida,
		ImporteTotal:     Number(r.importeTotal).toFixed(2),
		MetodoPago:       r.metodoPago || "No registrado",
		Estado:           r.estadoHabitacion
	}));
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas), "Reservas");
	XLSX.writeFile(wb, "reservas.xlsx");
}

// ── VALIDACIONES ──────────────────────────────────────────────

function validarUnicidad(reservaId, dni) {
	const reservaDuplicada = reservas.find(r => r.reservaId === reservaId && r.reservaId !== filaEditando);
	if (reservaDuplicada) return { valido: false, mensaje: "El ID de reserva ya existe." };

	const dniDuplicado = reservas.find(r => r.clienteDni === dni && r.reservaId !== filaEditando);
	if (dniDuplicado) return { valido: false, mensaje: "Ya existe una reserva con ese DNI." };

	return { valido: true };
}

// ── SUBMIT ────────────────────────────────────────────────────

reservaForm.addEventListener("submit", async (e) => {
	e.preventDefault();

	let clienteId    = campos.clienteId    ? campos.clienteId.value.trim()    : "";
	let clienteNombre = campos.clienteNombre ? campos.clienteNombre.value.trim() : "";
	let clienteFechaNac = campos.clienteFechaNacimiento ? campos.clienteFechaNacimiento.value : "";
	let clienteDni   = campos.clienteDni   ? campos.clienteDni.value.trim()   : "";
	let clienteRes   = campos.clienteResidencia ? campos.clienteResidencia.value.trim() : "";

	if (!clienteId && clienteRegistrado && clienteRegistrado.value) {
		const c = clientes.find(x => x.id_cliente === clienteRegistrado.value);
		if (c) {
			clienteId      = c.id_cliente;
			clienteNombre  = c.apellidos_nombres;
			clienteFechaNac = c.fecha_nacimiento || '';
			clienteDni     = c.dni;
			clienteRes     = c.distrito_ciudad || '';
		}
	}

	const reservaId = campos.reservaId.value.trim();

	if (!reservaId) { alert("Ingresa el ID de reserva."); return; }
	if (!clienteId) { alert("Selecciona o ingresa un cliente."); return; }
	if (!clienteDni) { alert("Falta el DNI del cliente."); return; }
	if (!validarDniFormato(clienteDni)) { alert("El DNI debe tener exactamente 8 dígitos."); return; }
	if (!campos.numeroHabitacion.value) { alert("Selecciona una habitación."); return; }
	if (!campos.fechaEntrada.value || !campos.fechaSalida.value) { alert("Ingresa las fechas de entrada y salida."); return; }
	if (!campos.metodoPago.value) { alert("Selecciona un método de pago."); return; }

	const total = calcularImporteTotal();
	if (!total) { alert("Revisa las fechas y el precio base."); return; }

	const { valido, mensaje } = validarUnicidad(reservaId, clienteDni);
	if (!valido) { alert(mensaje); return; }

	const habSeleccionada = habitaciones.find(h => String(h.numero) === String(campos.numeroHabitacion.value));
	const metodoSeleccionado = metodosPago.find(m => m.nombre === campos.metodoPago.value);
	if (!habSeleccionada || !metodoSeleccionado) { alert("Habitación o método de pago inválido."); return; }

	const submitBtn = reservaForm.querySelector('button[type="submit"]');
	if (submitBtn) submitBtn.disabled = true;

	try {
		const resultado = await guardarClienteDesdeReserva({
			id_cliente:        clienteId,
			apellidos_nombres: clienteNombre,
			fecha_nacimiento:  clienteFechaNac,
			dni:               clienteDni,
			distrito_ciudad:   clienteRes
		});

		const datosReserva = {
			reserva_id:        reservaId,
			id_cliente:        resultado.cliente.id_cliente,
			id_habitacion:     habSeleccionada.id,
			id_metodo_pago:    metodoSeleccionado.id_metodo_pago,
			fecha_entrada:     new Date(campos.fechaEntrada.value).toISOString(),
			fecha_salida:      new Date(campos.fechaSalida.value).toISOString(),
			precio_base:       Number(campos.precioBase.value),
			noches_estadia:    Number(campos.nochesEstadia.value) || 1,
			importe_total:     total,
			estado_habitacion: campos.estadoHabitacion.value
		};

		if (filaEditando) {
			const { error } = await supabaseClient.from('reserva_habitacion').update(datosReserva).eq('reserva_id', filaEditando);
			if (error) throw error;
		} else {
			const { error } = await supabaseClient.from('reserva_habitacion').insert([datosReserva]);
			if (error) throw error;
		}

		// Sincronizar el estado físico de la habitación
		await supabaseClient.from('habitaciones').update({
			estado: datosReserva.estado_habitacion,
			inicio_ocupacion: datosReserva.estado_habitacion === 'Ocupada' ? new Date().toISOString() : null
		}).eq('id_habitacion', habSeleccionada.id);

		if (resultado.creado) alert("Cliente nuevo guardado también en el módulo de clientes.");

		reservaForm.reset();
		campos.importeTotal.value = "";
		filaEditando = null;
		if (clienteRegistrado) clienteRegistrado.value = "";

		await cargarTodoYRenderizar();
	} catch (error) {
		manejarErrorSupabase(error, 'No se pudo guardar la reserva.');
	} finally {
		if (submitBtn) submitBtn.disabled = false;
	}
});

// ── EVENTOS ───────────────────────────────────────────────────

campos.precioBase.addEventListener("input", calcularImporteTotal);
campos.fechaEntrada.addEventListener("change", calcularImporteTotal);
campos.fechaSalida.addEventListener("change", calcularImporteTotal);
campos.numeroHabitacion.addEventListener("change", () => {
	asignarTipoHabitacionAutomaticamente();
	calcularImporteTotal();
});
if (clienteRegistrado) clienteRegistrado.addEventListener("change", cargarClienteSeleccionado);

const exportBtn = document.getElementById('export-reservas-btn');
if (exportBtn) exportBtn.addEventListener('click', exportReservasExcel);

const btnFiltrar = document.getElementById("filtrar-fechas-btn");
if (btnFiltrar) btnFiltrar.addEventListener("click", filtrarReservasPorFechas);

const btnMostrarTodas = document.getElementById("mostrar-todas-btn");
if (btnMostrarTodas) btnMostrarTodas.addEventListener("click", mostrarTodasLasReservas);

// ── LIBERAR HABITACIONES CON RESERVA VENCIDA ──────────────────
// (la limpieza automática a "Disponible" ya la hace gestionar_habitaciones.js
//  cada 30s sobre la tabla `habitaciones`; aquí solo refrescamos la vista)
async function refrescarSiHayVencidas() {
	const ahora = new Date();
	const hayVencidas = reservas.some(r =>
		new Date(r.fechaSalida) <= ahora && r.estadoHabitacion === 'Ocupada'
	);
	if (hayVencidas) await cargarTodoYRenderizar();
}
setInterval(refrescarSiHayVencidas, 60000);

// ── INIT ──────────────────────────────────────────────────────
cargarTodoYRenderizar();
