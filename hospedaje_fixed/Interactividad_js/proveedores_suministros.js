/**
 * proveedores_suministros.js
 * Módulo: Proveedores & Suministros — Hospedaje Ruby
 *
 * Conectado a Supabase. Tablas: proveedores, suministros, productos.
 * El stock de productos se actualiza automáticamente mediante el
 * trigger trg_stock_suministro definido en la base de datos, así
 * que este archivo NO modifica el stock manualmente: solo inserta,
 * actualiza o elimina filas en `suministros` y la BD hace el resto.
 */

document.addEventListener('DOMContentLoaded', () => {

    /* =====================================================
       ESTADO GLOBAL (en memoria, recargado desde Supabase)
    ===================================================== */
    let proveedores = [];
    let suministros = [];
    let productos = [];

    let editandoProvId = null;   // id_proveedor (numérico) — null = modo creación
    let editandoSumId  = null;   // id_suministro (numérico)

    /* =====================================================
       REFERENCIAS DOM — PROVEEDORES
    ===================================================== */
    const formProv      = document.getElementById('form-proveedor');
    const provNombre    = document.getElementById('prov-nombre');
    const provRuc       = document.getElementById('prov-ruc');
    const provTelefono  = document.getElementById('prov-telefono');
    const provEmail     = document.getElementById('prov-email');
    const provDireccion = document.getElementById('prov-direccion');
    const btnProvSubmit = document.getElementById('btn-prov-submit');
    const bodyProv      = document.getElementById('body-proveedores');

    /* =====================================================
       REFERENCIAS DOM — SUMINISTROS
    ===================================================== */
    const formSum       = document.getElementById('form-suministro');
    const sumProveedor  = document.getElementById('sum-proveedor');
    const sumProducto   = document.getElementById('sum-producto');
    const sumFecha      = document.getElementById('sum-fecha');
    const sumCantidad   = document.getElementById('sum-cantidad');
    const sumPrecio     = document.getElementById('sum-precio');
    const btnSumSubmit  = document.getElementById('btn-sum-submit');
    const bodySum       = document.getElementById('body-suministros');

    /* =====================================================
       CARGA DESDE SUPABASE
    ===================================================== */
    async function cargarProveedores() {
        const { data, error } = await supabaseClient
            .from('proveedores')
            .select('id_proveedor, nombre, ruc, telefono, email, direccion')
            .order('nombre', { ascending: true });
        if (error) { manejarErrorSupabase(error, 'No se pudieron cargar los proveedores.'); return; }
        proveedores = data || [];
    }

    async function cargarProductosDb() {
        const { data, error } = await supabaseClient
            .from('productos')
            .select('id_producto, nombre_producto, stock')
            .order('nombre_producto', { ascending: true });
        if (error) { manejarErrorSupabase(error, 'No se pudieron cargar los productos.'); return; }
        productos = data || [];
    }

    async function cargarSuministros() {
        const { data, error } = await supabaseClient
            .from('suministros')
            .select('id_suministro, id_proveedor, id_producto, nombre_proveedor, nombre_producto, fecha_suministro, cantidad, precio_compra, total_compra')
            .order('id_suministro', { ascending: false });
        if (error) { manejarErrorSupabase(error, 'No se pudieron cargar los suministros.'); return; }
        suministros = data || [];
    }

    async function cargarTodo() {
        await Promise.all([cargarProveedores(), cargarProductosDb(), cargarSuministros()]);
        poblarSelectProveedores();
        poblarSelectProductos();
        renderProveedores();
        renderSuministros();
    }

    /* =====================================================
       SELECT DINÁMICOS
    ===================================================== */
    function poblarSelectProveedores() {
        const valorActual = sumProveedor.value;
        sumProveedor.innerHTML = '<option value="">-- Seleccione un proveedor --</option>';
        proveedores.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id_proveedor;
            opt.textContent = `${p.nombre} (RUC: ${p.ruc})`;
            sumProveedor.appendChild(opt);
        });
        sumProveedor.value = valorActual;
    }

    function poblarSelectProductos() {
        const valorActual = sumProducto.value;
        sumProducto.innerHTML = '<option value="">-- Seleccione un producto --</option>';
        productos.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id_producto;
            opt.textContent = `${p.nombre_producto} (Stock: ${p.stock})`;
            sumProducto.appendChild(opt);
        });
        sumProducto.value = valorActual;
    }

    /* =====================================================
       RENDER — TABLA PROVEEDORES
    ===================================================== */
    function renderProveedores() {
        bodyProv.innerHTML = '';

        if (proveedores.length === 0) {
            bodyProv.innerHTML = `<tr class="fila-vacia"><td colspan="7">No hay proveedores registrados aún.</td></tr>`;
            return;
        }

        proveedores.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${p.id_proveedor}</td>
                <td>${p.nombre}</td>
                <td>${p.ruc}</td>
                <td>${p.telefono || '—'}</td>
                <td>${p.email || '—'}</td>
                <td>${p.direccion || '—'}</td>
                <td>
                    <button class="btn-editar"   onclick="editarProveedor(${p.id_proveedor})">Editar</button>
                    <button class="btn-eliminar" onclick="eliminarProveedor(${p.id_proveedor})">Eliminar</button>
                </td>
            `;
            bodyProv.appendChild(tr);
        });
    }

    /* =====================================================
       RENDER — TABLA SUMINISTROS
    ===================================================== */
    function renderSuministros() {
        bodySum.innerHTML = '';

        if (suministros.length === 0) {
            bodySum.innerHTML = `<tr class="fila-vacia"><td colspan="8">No hay suministros registrados aún.</td></tr>`;
            return;
        }

        suministros.forEach(s => {
            const total = Number(s.total_compra ?? (s.precio_compra * s.cantidad)).toFixed(2);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${s.id_suministro}</td>
                <td>${s.nombre_proveedor}</td>
                <td>${s.nombre_producto}</td>
                <td>${s.fecha_suministro}</td>
                <td>${s.cantidad}</td>
                <td>S/ ${Number(s.precio_compra).toFixed(2)}</td>
                <td>S/ ${total}</td>
                <td>
                    <button class="btn-editar" onclick="editarSuministro(${s.id_suministro})">✏️ Editar</button>
                    <button class="btn-eliminar" onclick="eliminarSuministro(${s.id_suministro})">🗑️ Eliminar</button>
                </td>
            `;
            bodySum.appendChild(tr);
        });
    }

    /* =====================================================
       LIMPIAR FORMULARIOS
    ===================================================== */
    function limpiarFormProv() {
        provNombre.value    = '';
        provRuc.value       = '';
        provTelefono.value  = '';
        provEmail.value     = '';
        provDireccion.value = '';
        editandoProvId      = null;
        btnProvSubmit.textContent = 'Añadir Proveedor';
        btnProvSubmit.classList.remove('modo-edicion');
    }

    function limpiarFormSum() {
        sumProveedor.value = '';
        sumProducto.value  = '';
        sumFecha.value     = '';
        sumCantidad.value  = '';
        sumPrecio.value    = '';
        editandoSumId      = null;
        btnSumSubmit.textContent = 'Registrar Suministro';
        btnSumSubmit.classList.remove('modo-edicion');
    }

    /* =====================================================
       CRUD — PROVEEDORES
    ===================================================== */
    formProv.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!/^\d{11}$/.test(provRuc.value.trim())) {
            alert('El RUC debe tener exactamente 11 dígitos numéricos.');
            provRuc.focus();
            return;
        }

        if (!editandoProvId) {
            const rucExiste = proveedores.some(p => p.ruc === provRuc.value.trim());
            if (rucExiste) {
                alert('Ya existe un proveedor registrado con ese RUC.');
                provRuc.focus();
                return;
            }
        }

        const datosProveedor = {
            nombre:    provNombre.value.trim(),
            ruc:       provRuc.value.trim(),
            telefono:  provTelefono.value.trim(),
            email:     provEmail.value.trim(),
            direccion: provDireccion.value.trim()
        };

        btnProvSubmit.disabled = true;
        try {
            if (editandoProvId) {
                const { error } = await supabaseClient.from('proveedores').update(datosProveedor).eq('id_proveedor', editandoProvId);
                if (error) throw error;
            } else {
                const { error } = await supabaseClient.from('proveedores').insert([datosProveedor]);
                if (error) throw error;
            }

            limpiarFormProv();
            await cargarTodo();
        } catch (error) {
            manejarErrorSupabase(error, 'No se pudo guardar el proveedor.');
        } finally {
            btnProvSubmit.disabled = false;
        }
    });

    window.editarProveedor = (id) => {
        const p = proveedores.find(x => x.id_proveedor === id);
        if (!p) return;

        provNombre.value    = p.nombre;
        provRuc.value       = p.ruc;
        provTelefono.value  = p.telefono;
        provEmail.value     = p.email;
        provDireccion.value = p.direccion;

        editandoProvId = id;
        btnProvSubmit.textContent = 'Guardar Cambios';
        btnProvSubmit.classList.add('modo-edicion');

        formProv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    window.eliminarProveedor = async (id) => {
        const tieneSuministros = suministros.some(s => s.id_proveedor === id);
        if (tieneSuministros) {
            alert('No se puede eliminar este proveedor porque tiene suministros asociados.\nElimina primero los suministros correspondientes.');
            return;
        }

        if (!confirm('¿Estás seguro de eliminar este proveedor?')) return;

        const { error } = await supabaseClient.from('proveedores').delete().eq('id_proveedor', id);
        if (error) { manejarErrorSupabase(error, 'No se pudo eliminar el proveedor.'); return; }

        if (editandoProvId === id) limpiarFormProv();
        await cargarTodo();
    };

    /* =====================================================
       CRUD — SUMINISTROS
       (el stock de `productos` se actualiza solo, vía trigger)
    ===================================================== */
    formSum.addEventListener('submit', async (e) => {
        e.preventDefault();

        const idProv    = parseInt(sumProveedor.value);
        const idProd     = sumProducto.value; // id_producto es texto (ej: "P001")
        const fecha     = sumFecha.value;
        const cantidad  = parseInt(sumCantidad.value);
        const precio    = parseFloat(sumPrecio.value);

        if (!idProv || !idProd || !fecha || !cantidad || isNaN(precio)) {
            alert('Por favor completa todos los campos obligatorios.');
            return;
        }
        if (cantidad <= 0) { alert('La cantidad debe ser mayor a 0.'); return; }
        if (precio < 0) { alert('El precio de compra no puede ser negativo.'); return; }

        const proveedor = proveedores.find(p => p.id_proveedor === idProv);
        const producto  = productos.find(p => p.id_producto === idProd);

        if (!proveedor || !producto) { alert('Proveedor o producto no encontrado.'); return; }

        const datosSuministro = {
            id_proveedor:     idProv,
            nombre_proveedor: proveedor.nombre,
            id_producto:      idProd,
            nombre_producto:  producto.nombre_producto,
            fecha_suministro: fecha,
            cantidad,
            precio_compra:    precio
        };

        btnSumSubmit.disabled = true;
        try {
            if (editandoSumId) {
                // El trigger revierte el stock anterior y aplica el nuevo automáticamente
                const { error } = await supabaseClient.from('suministros').update(datosSuministro).eq('id_suministro', editandoSumId);
                if (error) throw error;
            } else {
                const { error } = await supabaseClient.from('suministros').insert([datosSuministro]);
                if (error) throw error;
            }

            limpiarFormSum();
            await cargarTodo();
        } catch (error) {
            manejarErrorSupabase(error, 'No se pudo guardar el suministro.');
        } finally {
            btnSumSubmit.disabled = false;
        }
    });

    window.editarSuministro = (id) => {
        const s = suministros.find(x => x.id_suministro === id);
        if (!s) return;

        sumProveedor.value = s.id_proveedor;
        sumProducto.value  = s.id_producto;
        sumFecha.value     = s.fecha_suministro;
        sumCantidad.value  = s.cantidad;
        sumPrecio.value    = s.precio_compra;

        editandoSumId = id;
        btnSumSubmit.textContent = '💾 Guardar Cambios';
        btnSumSubmit.classList.add('modo-edicion');

        formSum.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    window.eliminarSuministro = async (id) => {
        if (!confirm('¿Eliminar este suministro? El stock del producto se reducirá automáticamente.')) return;

        const { error } = await supabaseClient.from('suministros').delete().eq('id_suministro', id);
        if (error) { manejarErrorSupabase(error, 'No se pudo eliminar el suministro.'); return; }

        await cargarTodo();
    };

    /* =====================================================
       INICIALIZACIÓN
    ===================================================== */
    cargarTodo();
});
