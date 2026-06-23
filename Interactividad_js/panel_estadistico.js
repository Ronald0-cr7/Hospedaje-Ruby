document.addEventListener('DOMContentLoaded', () => {
    const kpiIngresosReservas = document.getElementById('kpi-ingresos-reservas');
    const kpiIngresosVentas = document.getElementById('kpi-ingresos-ventas');
    const kpiIngresosTotal = document.getElementById('kpi-ingresos-total');
    const kpiClientes = document.getElementById('kpi-clientes');
    const ocupacionLista = document.getElementById('ocupacion-lista');
    const metodosLista = document.getElementById('metodos-lista');
    const topProductos = document.getElementById('top-productos');
    const clientesActivos = document.getElementById('clientes-activos');

    function formatearMoneda(valor) {
        return `S/ ${Number(valor || 0).toFixed(2)}`;
    }

    async function obtenerReservas() {
        const { data, error } = await supabaseClient
            .from('reserva_habitacion')
            .select('id_cliente, importe_total, metodo_pago:id_metodo_pago(nombre)');
        if (error) { manejarErrorSupabase(error, 'No se pudieron cargar las reservas.'); return []; }
        return (data || []).map(r => ({
            clienteId: r.id_cliente,
            importeTotal: Number(r.importe_total) || 0,
            metodoPago: r.metodo_pago?.nombre || 'No registrado'
        }));
    }

    async function obtenerVentas() {
        const { data, error } = await supabaseClient
            .from('ventas')
            .select('id_cliente, total, metodo_pago:id_metodo_pago(nombre), detalle_venta(producto_nombre, cantidad)');
        if (error) { manejarErrorSupabase(error, 'No se pudieron cargar las ventas.'); return []; }
        return (data || []).map(v => ({
            clienteId: v.id_cliente,
            total: Number(v.total) || 0,
            metodoPago: v.metodo_pago?.nombre || 'Efectivo',
            detalles: (v.detalle_venta || []).map(d => ({ productoNombre: d.producto_nombre, cantidad: Number(d.cantidad) }))
        }));
    }

    async function obtenerClientes() {
        const { data, error } = await supabaseClient.from('clientes').select('id_cliente, apellidos_nombres');
        if (error) { manejarErrorSupabase(error, 'No se pudieron cargar los clientes.'); return []; }
        return data || [];
    }

    // Usa la vista v_ocupacion_habitaciones definida en el script SQL
    async function obtenerOcupacion() {
        const { data, error } = await supabaseClient.from('v_ocupacion_habitaciones').select('estado');
        if (error) { manejarErrorSupabase(error, 'No se pudo cargar la ocupación de habitaciones.'); return []; }
        return data || [];
    }

    function crearItemMetrica(titulo, detalle, valor) {
        const div = document.createElement('div');
        div.className = 'item-metrica';
        div.innerHTML = `
            <div>
                <strong>${titulo}</strong>
                <small>${detalle}</small>
            </div>
            <span>${valor}</span>
        `;
        return div;
    }

    function renderizarOcupacion(filasOcupacion) {
        const conteo = { Disponible: 0, Ocupada: 0, Limpieza: 0, Mantenimiento: 0 };
        filasOcupacion.forEach((fila) => {
            if (conteo.hasOwnProperty(fila.estado)) conteo[fila.estado] += 1;
        });

        ocupacionLista.innerHTML = '';
        Object.entries(conteo).forEach(([estado, cantidad]) => {
            ocupacionLista.appendChild(crearItemMetrica(estado, 'Estado de habitaciones', String(cantidad)));
        });
    }

    function renderizarMetodosPago(ventas) {
        const resumen = ventas.reduce((acumulado, venta) => {
            const metodo = venta.metodoPago || 'Efectivo';
            acumulado[metodo] = (acumulado[metodo] || 0) + Number(venta.total || 0);
            return acumulado;
        }, {});

        metodosLista.innerHTML = '';
        const entradas = Object.entries(resumen);
        if (entradas.length === 0) {
            metodosLista.appendChild(crearItemMetrica('Sin registros', 'Todavía no hay ventas registradas', 'S/ 0.00'));
            return;
        }

        entradas.sort((a, b) => b[1] - a[1]).forEach(([metodo, total]) => {
            metodosLista.appendChild(crearItemMetrica(metodo, 'Monto acumulado en ventas', formatearMoneda(total)));
        });
    }

    function renderizarTopProductos(ventas) {
        const resumen = {};
        ventas.forEach((venta) => {
            venta.detalles.forEach((detalle) => {
                const nombre = detalle.productoNombre || 'Producto';
                resumen[nombre] = (resumen[nombre] || 0) + Number(detalle.cantidad || 0);
            });
        });

        topProductos.innerHTML = '';
        const entradas = Object.entries(resumen).sort((a, b) => b[1] - a[1]).slice(0, 5);
        if (entradas.length === 0) {
            topProductos.appendChild(crearItemMetrica('Sin ventas', 'Aún no hay productos vendidos', '0 u.'));
            return;
        }

        entradas.forEach(([producto, cantidad]) => {
            topProductos.appendChild(crearItemMetrica(producto, 'Unidades vendidas', `${cantidad} u.`));
        });
    }

    function renderizarClientesActivos(clientes, ventas, reservas) {
        const activos = clientes.map((cliente) => {
            const ventasCliente = ventas.filter((venta) => String(venta.clienteId || '') === String(cliente.id_cliente));
            const reservasCliente = reservas.filter((reserva) => String(reserva.clienteId || '') === String(cliente.id_cliente));
            const total = ventasCliente.reduce((acumulado, venta) => acumulado + Number(venta.total || 0), 0)
                + reservasCliente.reduce((acumulado, reserva) => acumulado + Number(reserva.importeTotal || 0), 0);

            return {
                nombre: cliente.apellidos_nombres,
                movimientos: ventasCliente.length + reservasCliente.length,
                total
            };
        }).filter((cliente) => cliente.movimientos > 0)
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

        clientesActivos.innerHTML = '';
        if (activos.length === 0) {
            clientesActivos.appendChild(crearItemMetrica('Sin actividad', 'No hay clientes con movimientos aún', 'S/ 0.00'));
            return;
        }

        activos.forEach((cliente) => {
            clientesActivos.appendChild(crearItemMetrica(cliente.nombre, `${cliente.movimientos} movimientos`, formatearMoneda(cliente.total)));
        });
    }

    async function renderizarKPIs() {
        const [reservas, ventas, clientes, ocupacion] = await Promise.all([
            obtenerReservas(), obtenerVentas(), obtenerClientes(), obtenerOcupacion()
        ]);

        const ingresosReservas = reservas.reduce((acumulado, reserva) => acumulado + Number(reserva.importeTotal || 0), 0);
        const ingresosVentas = ventas.reduce((acumulado, venta) => acumulado + Number(venta.total || 0), 0);

        kpiIngresosReservas.textContent = formatearMoneda(ingresosReservas);
        kpiIngresosVentas.textContent = formatearMoneda(ingresosVentas);
        kpiIngresosTotal.textContent = formatearMoneda(ingresosReservas + ingresosVentas);
        kpiClientes.textContent = String(clientes.length);

        renderizarOcupacion(ocupacion);
        renderizarMetodosPago(ventas);
        renderizarTopProductos(ventas);
        renderizarClientesActivos(clientes, ventas, reservas);
    }

    renderizarKPIs();
});
