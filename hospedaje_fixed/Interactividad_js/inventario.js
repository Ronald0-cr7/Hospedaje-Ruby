document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.tienda');
    const idProductoInput = document.getElementById('item-id');
    const nombreInput = document.getElementById('item-name');
    const fechaVencimientoInput = document.getElementById('fecha_vencimiento');
    const cantidadInput = document.getElementById('item-quantity');
    const precioInput = document.getElementById('item-price');
    const categoriaSelect = document.getElementById('categoria');

    const tabla = document.getElementById('inventory-body');
    const boton = document.querySelector('button[type="submit"]');
    const alerta = document.getElementById('inventory-alert');

    let productos = [];
    let categorias = [];
    let idEditando = null; // id_producto (texto, ej: "P001")

    inicializar();

    async function inicializar() {
        await cargarCategorias();
        await cargarProductos();
    }

    async function cargarCategorias() {
        const { data, error } = await supabaseClient
            .from('categorias')
            .select('id_categoria, nombre')
            .order('nombre', { ascending: true });

        if (error) { manejarErrorSupabase(error, 'No se pudieron cargar las categorías.'); return; }

        categorias = data || [];
        categoriaSelect.innerHTML = '<option value="">Seleccione una categoría</option>' +
            categorias.map(c => `<option value="${c.id_categoria}">${c.nombre}</option>`).join('');
    }

    async function cargarProductos() {
        const { data, error } = await supabaseClient
            .from('productos')
            .select('id_producto, nombre_producto, fecha_vencimiento, stock, precio_venta, id_categoria, categorias(nombre)')
            .order('id_producto', { ascending: false });

        if (error) { manejarErrorSupabase(error, 'No se pudieron cargar los productos.'); return; }

        productos = (data || []).map(normalizarProducto);
        renderizarTabla();
    }

    function normalizarProducto(p) {
        return {
            idProducto: p.id_producto,
            nombre: p.nombre_producto,
            fecha_vencimiento: p.fecha_vencimiento,
            cantidad: p.stock,
            precio: p.precio_venta,
            idCategoria: p.id_categoria,
            categoriaNombre: p.categorias?.nombre || ''
        };
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (
            !idProductoInput.value ||
            !nombreInput.value ||
            !fechaVencimientoInput.value ||
            !cantidadInput.value ||
            !precioInput.value ||
            !categoriaSelect.value
        ) {
            mostrarAlerta('Completa todos los campos antes de guardar.', true);
            return;
        }

        const productoData = {
            id_producto: idProductoInput.value.trim(),
            nombre_producto: nombreInput.value.trim(),
            fecha_vencimiento: fechaVencimientoInput.value,
            stock: Number(cantidadInput.value),
            precio_venta: Number(precioInput.value),
            id_categoria: Number(categoriaSelect.value)
        };

        boton.disabled = true;
        try {
            if (idEditando) {
                const { error } = await supabaseClient
                    .from('productos')
                    .update(productoData)
                    .eq('id_producto', idEditando);
                if (error) throw error;
                mostrarAlerta('Producto actualizado correctamente.', false);
            } else {
                const existente = productos.find(p => p.idProducto === productoData.id_producto);
                if (existente) { mostrarAlerta('Ya existe un producto con ese ID.', true); return; }

                const { error } = await supabaseClient.from('productos').insert([productoData]);
                if (error) throw error;
                mostrarAlerta('Producto registrado correctamente.', false);
            }

            idEditando = null;
            boton.textContent = 'Añadir Artículo';
            limpiarFormulario();
            await cargarProductos();
        } catch (error) {
            manejarErrorSupabase(error, 'No se pudo guardar el producto.');
        } finally {
            boton.disabled = false;
        }
    });

    function renderizarTabla() {
        tabla.innerHTML = '';
        let productosVencidos = 0;

        productos.forEach((producto) => {
            const estado = obtenerEstado(producto.fecha_vencimiento);
            const vencido = estado === 'VENCIDO';
            if (vencido) productosVencidos += 1;

            const fila = document.createElement('tr');
            fila.className = vencido ? 'producto-vencido' : 'producto-vigente';

            fila.innerHTML = `
                <td>${producto.idProducto}</td>
                <td>${producto.nombre}</td>
                <td>${formatearFecha(producto.fecha_vencimiento)}</td>
                <td>
                    <span class="estado-badge ${vencido ? 'estado-vencido' : 'estado-vigente'}">
                        ${estado}
                    </span>
                </td>
                <td>${producto.cantidad}</td>
                <td>S/ ${Number(producto.precio).toFixed(2)}</td>
                <td>${producto.categoriaNombre}</td>
                <td>
                    <button type="button" onclick='editarProducto(${JSON.stringify(producto.idProducto)})'>Editar</button>
                    <button type="button" onclick='eliminarProducto(${JSON.stringify(producto.idProducto)})'>Eliminar</button>
                </td>
            `;

            tabla.appendChild(fila);
        });

        if (productosVencidos > 0) {
            mostrarAlerta(`Hay ${productosVencidos} producto(s) vencido(s) en el inventario.`, true);
        } else {
            mostrarAlerta('Todos los productos registrados están vigentes.', false);
        }
    }

    function obtenerEstado(fechaValor) {
        if (!fechaValor) return 'SIN FECHA';
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const vencimiento = new Date(`${fechaValor}T00:00:00`);
        vencimiento.setHours(0, 0, 0, 0);
        return hoy >= vencimiento ? 'VENCIDO' : 'VIGENTE';
    }

    function formatearFecha(fechaValor) {
        if (!fechaValor) return '-';
        const [anio, mes, dia] = fechaValor.split('-');
        if (!anio || !mes || !dia) return fechaValor;
        return `${dia}/${mes}/${anio}`;
    }

    function limpiarFormulario() {
        idProductoInput.value = '';
        nombreInput.value = '';
        fechaVencimientoInput.value = '';
        cantidadInput.value = '';
        precioInput.value = '';
        categoriaSelect.value = '';
    }

    function mostrarAlerta(mensaje, esAdvertencia) {
        alerta.textContent = mensaje;
        alerta.classList.toggle('has-warning', Boolean(esAdvertencia));
    }

    window.editarProducto = (idProducto) => {
        const producto = productos.find((p) => String(p.idProducto) === String(idProducto));
        if (!producto) return;

        idProductoInput.value = producto.idProducto;
        nombreInput.value = producto.nombre;
        fechaVencimientoInput.value = producto.fecha_vencimiento;
        cantidadInput.value = producto.cantidad;
        precioInput.value = producto.precio;
        categoriaSelect.value = producto.idCategoria;

        idEditando = producto.idProducto;
        boton.textContent = 'Guardar Cambios';
        mostrarAlerta('Editando producto. Revisa la fecha de vencimiento antes de guardar.', false);
    };

    window.eliminarProducto = async (idProducto) => {
        const producto = productos.find((p) => String(p.idProducto) === String(idProducto));
        if (!producto) return;

        if (!confirm(`¿Eliminar el producto ${producto.nombre}?`)) return;

        try {
            const { error } = await supabaseClient.from('productos').delete().eq('id_producto', producto.idProducto);
            if (error) throw error;

            if (String(idEditando) === String(idProducto)) {
                idEditando = null;
                limpiarFormulario();
                boton.textContent = 'Añadir Artículo';
            }

            await cargarProductos();
            mostrarAlerta('Producto eliminado correctamente.', false);
        } catch (error) {
            manejarErrorSupabase(error, 'No se pudo eliminar el producto (verifica que no tenga suministros o ventas asociadas).');
        }
    };
});
