document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('cliente-form');
    const inputId = document.getElementById('id-cliente');
    const inputNombre = document.getElementById('apellidos-nombres');
    const inputFecha = document.getElementById('fecha-nacimiento');
    const inputDni = document.getElementById('dni-cliente');
    const inputDistrito = document.getElementById('distrito-ciudad');
    const inputTelefono = document.getElementById('telefono-cliente');
    const botonGuardar = document.getElementById('guardar-cliente');
    const botonCancelar = document.getElementById('cancelar-edicion');
    const tablaBody = document.getElementById('clientes-body');
    const buscador = document.getElementById('buscar-cliente');
    const metodosResumen = document.getElementById('metodos-pago-resumen');
    const metodosReservas = document.getElementById('metodos-pago-reservas');
    const totalClientes = document.getElementById('total-clientes');
    const clientesConVentas = document.getElementById('clientes-con-ventas');
    const ingresoTotalClientes = document.getElementById('ingreso-total-clientes');
    const ingresoTotalReservas = document.getElementById('ingreso-total-reservas');

    // Estado en memoria (se recarga desde Supabase)
    let clientes = [];
    let ventas = [];      // [{ clienteId, total, metodoPago }]
    let reservas = [];    // [{ clienteId, importeTotal, metodoPago }]
    let clienteEditando = null;

    function formatearMoneda(valor) { return `S/ ${Number(valor || 0).toFixed(2)}`; }

    // ── CARGA DE DATOS DESDE SUPABASE ──────────────────────────
    async function cargarClientes() {
        const { data, error } = await supabaseClient
            .from('clientes')
            .select('id_cliente, apellidos_nombres, fecha_nacimiento, dni, distrito_ciudad, telefono')
            .order('apellidos_nombres', { ascending: true });
        if (error) { manejarErrorSupabase(error, 'No se pudieron cargar los clientes.'); return; }
        clientes = data || [];
    }

    async function cargarVentas() {
        const { data, error } = await supabaseClient
            .from('ventas')
            .select('id_cliente, total, metodo_pago:id_metodo_pago(nombre)')
            .order('fecha_hora_venta', { ascending: true });
        if (error) { manejarErrorSupabase(error, 'No se pudieron cargar las ventas.'); return; }
        ventas = (data || []).map(v => ({
            clienteId: v.id_cliente,
            total: Number(v.total) || 0,
            metodoPago: v.metodo_pago?.nombre || 'Efectivo'
        }));
    }

    async function cargarReservas() {
        const { data, error } = await supabaseClient
            .from('reserva_habitacion')
            .select('id_cliente, importe_total, metodo_pago:id_metodo_pago(nombre)')
            .order('created_at', { ascending: true });
        if (error) { manejarErrorSupabase(error, 'No se pudieron cargar las reservas.'); return; }
        reservas = (data || []).map(r => ({
            clienteId: r.id_cliente,
            importeTotal: Number(r.importe_total) || 0,
            metodoPago: r.metodo_pago?.nombre || 'No registrado'
        }));
    }

    async function cargarTodo() {
        await Promise.all([cargarClientes(), cargarVentas(), cargarReservas()]);
        renderizarClientes();
    }

    // REQUISITO 1: Registrar consumo total (ventas + reservas) por cliente
    function calcularEstadisticasCliente(clienteId) {
        const ventasCliente = ventas.filter(v => String(v.clienteId || '') === String(clienteId));
        const reservasCliente = reservas.filter(r => String(r.clienteId || '') === String(clienteId));
        const totalVentas = ventasCliente.reduce((s, v) => s + Number(v.total || 0), 0);
        const totalReservas = reservasCliente.reduce((s, r) => s + Number(r.importeTotal || 0), 0);
        const ultimoMetodo = ventasCliente.length ? ventasCliente[ventasCliente.length - 1].metodoPago : '-';
        return { cantidadVentas: ventasCliente.length, totalVentas, cantidadReservas: reservasCliente.length, totalReservas, consumoTotal: totalVentas + totalReservas, ultimoMetodo };
    }

    // REQUISITO 6: Calcular ingresos por método de pago (ventas y reservas separados)
    function calcularResumenPorMetodo() {
        const resumenVentas = ventas.reduce((acc, v) => {
            const m = v.metodoPago || 'Efectivo';
            acc[m] = (acc[m] || 0) + Number(v.total || 0);
            return acc;
        }, {});

        const resumenReservas = reservas.reduce((acc, r) => {
            const m = r.metodoPago || 'No registrado';
            acc[m] = (acc[m] || 0) + Number(r.importeTotal || 0);
            return acc;
        }, {});

        const renderResumen = (resumen, container) => {
            const items = Object.entries(resumen).map(([m, t]) =>
                `<div class="metodo-item"><strong>${m}</strong><span>${formatearMoneda(t)}</span></div>`
            ).join('');
            container.innerHTML = items || '<div class="metodo-item"><strong>Sin registros</strong><span>S/ 0.00</span></div>';
        };

        renderResumen(resumenVentas, metodosResumen);
        if (metodosReservas) renderResumen(resumenReservas, metodosReservas);
    }

    function actualizarResumenGeneral() {
        const activos = clientes.filter(c => {
            const est = calcularEstadisticasCliente(c.id_cliente);
            return est.cantidadVentas > 0 || est.cantidadReservas > 0;
        }).length;

        const totalV = ventas.reduce((s, v) => s + Number(v.total || 0), 0);
        const totalR = reservas.reduce((s, r) => s + Number(r.importeTotal || 0), 0);

        totalClientes.textContent = String(clientes.length);
        clientesConVentas.textContent = String(activos);
        ingresoTotalClientes.textContent = formatearMoneda(totalV);
        ingresoTotalReservas.textContent = formatearMoneda(totalR);
    }

    function renderizarClientes() {
        const texto = (buscador.value || '').trim().toLowerCase();
        tablaBody.innerHTML = '';

        const filtrados = clientes.filter(c => {
            const contenido = `${c.id_cliente} ${c.apellidos_nombres} ${c.dni} ${c.telefono}`.toLowerCase();
            return contenido.includes(texto);
        });

        filtrados.forEach(cliente => {
            const est = calcularEstadisticasCliente(cliente.id_cliente);
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${cliente.id_cliente}</td>
                <td>${cliente.apellidos_nombres}</td>
                <td>${cliente.dni}</td>
                <td>${cliente.distrito_ciudad ?? ''}</td>
                <td>${cliente.telefono ?? ''}</td>
                <td>${est.cantidadVentas} ventas / ${est.cantidadReservas} reservas</td>
                <td>${formatearMoneda(est.totalVentas)}</td>
                <td>${formatearMoneda(est.totalReservas)}</td>
                <td><strong>${formatearMoneda(est.consumoTotal)}</strong></td>
                <td>${est.ultimoMetodo}</td>
                <td class="acciones-tabla">
                    <button type="button" class="editar">✏️ Editar</button>
                    <button type="button" class="eliminar">🗑️ Eliminar</button>
                </td>
            `;
            fila.querySelector('.editar').addEventListener('click', () => cargarClienteEnFormulario(cliente));
            fila.querySelector('.eliminar').addEventListener('click', () => eliminarCliente(cliente.id_cliente));
            tablaBody.appendChild(fila);
        });

        if (filtrados.length === 0) {
            const fila = document.createElement('tr');
            fila.innerHTML = '<td colspan="11">No hay clientes registrados con ese criterio.</td>';
            tablaBody.appendChild(fila);
        }

        actualizarResumenGeneral();
        calcularResumenPorMetodo();
    }

    function cargarClienteEnFormulario(cliente) {
        inputId.value = cliente.id_cliente;
        inputNombre.value = cliente.apellidos_nombres;
        inputFecha.value = cliente.fecha_nacimiento ?? '';
        inputDni.value = cliente.dni;
        inputDistrito.value = cliente.distrito_ciudad ?? '';
        inputTelefono.value = cliente.telefono ?? '';
        clienteEditando = cliente.id_cliente;
        botonGuardar.textContent = 'Guardar cambios';
        botonCancelar.classList.remove('oculto');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function limpiarFormulario() {
        form.reset();
        clienteEditando = null;
        botonGuardar.textContent = 'Guardar cliente';
        botonCancelar.classList.add('oculto');
    }

    async function eliminarCliente(idCliente) {
        const tieneMovimientos = ventas.some(v => String(v.clienteId || '') === String(idCliente)) ||
            reservas.some(r => String(r.clienteId || '') === String(idCliente));
        if (tieneMovimientos && !confirm('Este cliente tiene movimientos asociados. ¿Deseas eliminarlo igualmente?')) return;

        const { error } = await supabaseClient.from('clientes').delete().eq('id_cliente', idCliente);
        if (error) { manejarErrorSupabase(error, 'No se pudo eliminar el cliente (verifica que no tenga ventas/reservas asociadas).'); return; }

        if (clienteEditando === idCliente) limpiarFormulario();
        await cargarTodo();
    }

    // REQUISITO 2: Exportar Excel con todos los clientes y su consumo
    function exportarExcelClientes() {
        if (typeof XLSX === 'undefined') { alert('No se pudo cargar la librería Excel.'); return; }
        const filas = clientes.map(c => {
            const est = calcularEstadisticasCliente(c.id_cliente);
            return {
                ID: c.id_cliente,
                Nombre: c.apellidos_nombres,
                Fecha_Nac: c.fecha_nacimiento,
                DNI: c.dni,
                Distrito: c.distrito_ciudad,
                Telefono: c.telefono,
                N_Ventas: est.cantidadVentas,
                Total_Ventas: est.totalVentas.toFixed(2),
                N_Reservas: est.cantidadReservas,
                Total_Reservas: est.totalReservas.toFixed(2),
                Consumo_Total: est.consumoTotal.toFixed(2),
                Ultimo_Metodo: est.ultimoMetodo
            };
        });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas), 'Clientes');
        XLSX.writeFile(wb, 'clientes_hospedaje.xlsx');
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const cliente = {
            id_cliente: inputId.value.trim(),
            apellidos_nombres: inputNombre.value.trim(),
            fecha_nacimiento: inputFecha.value || null,
            dni: inputDni.value.trim(),
            distrito_ciudad: inputDistrito.value.trim(),
            telefono: inputTelefono.value.trim()
        };
        if (!cliente.id_cliente || !cliente.apellidos_nombres || !cliente.dni) { alert('Completa los datos obligatorios del cliente.'); return; }
        if (!/^\d{8}$/.test(cliente.dni)) { alert('El DNI debe contener exactamente 8 dígitos.'); return; }

        const dniDuplicado = clientes.find(c => c.dni === cliente.dni && c.id_cliente !== clienteEditando);
        if (dniDuplicado) { alert('Ya existe un cliente registrado con ese DNI.'); return; }

        botonGuardar.disabled = true;
        try {
            if (clienteEditando) {
                const { error } = await supabaseClient
                    .from('clientes')
                    .update({
                        apellidos_nombres: cliente.apellidos_nombres,
                        fecha_nacimiento: cliente.fecha_nacimiento,
                        dni: cliente.dni,
                        distrito_ciudad: cliente.distrito_ciudad,
                        telefono: cliente.telefono
                    })
                    .eq('id_cliente', clienteEditando);
                if (error) throw error;
            } else {
                const existente = clientes.find(c => c.id_cliente === cliente.id_cliente);
                if (existente) { alert('Ya existe un cliente con ese ID.'); return; }
                const { error } = await supabaseClient.from('clientes').insert([cliente]);
                if (error) throw error;
            }

            limpiarFormulario();
            await cargarTodo();
        } catch (error) {
            manejarErrorSupabase(error, 'No se pudo guardar el cliente.');
        } finally {
            botonGuardar.disabled = false;
        }
    });

    buscador.addEventListener('input', renderizarClientes);
    botonCancelar.addEventListener('click', limpiarFormulario);

    const btnExport = document.getElementById('btn-export-clientes');
    if (btnExport) btnExport.addEventListener('click', exportarExcelClientes);

    cargarTodo();
});
