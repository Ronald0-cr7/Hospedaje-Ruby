// ============================================================
// reportes.js - Generador de reportes en PDF con filtro de fechas
// ============================================================

/**
 * Genera un reporte PDF de reservas filtrado por período de tiempo
 * @param {Date} fechaInicio - Fecha inicial del período
 * @param {Date} fechaFin - Fecha final del período
 * @param {Array} reservas - Lista completa de reservas
 */
async function generarReportePDFReservas(fechaInicio, fechaFin, reservas) {
	if (typeof html2pdf === 'undefined') {
		alert('No se pudo cargar la librería PDF. Por favor, recarga la página.');
		return;
	}

	// Filtrar reservas por período
	const reservasFiltradas = filtrarReservasPorPeriodo(fechaInicio, fechaFin, reservas);

	if (reservasFiltradas.length === 0) {
		alert(`No hay reservas registradas en el período del ${fechaInicio.toLocaleDateString()} al ${fechaFin.toLocaleDateString()}`);
		return;
	}

	// Crear contenido HTML para el PDF
	const contenidoHTML = generarHTMLReportePDFReservas(fechaInicio, fechaFin, reservasFiltradas);

	// Configurar opciones de html2pdf
	const elemento = document.createElement('div');
	elemento.innerHTML = contenidoHTML;
	document.body.appendChild(elemento);

	const opciones = {
		margin: 10,
		filename: `reporte_reservas_${fechaInicio.toISOString().split('T')[0]}_a_${fechaFin.toISOString().split('T')[0]}.pdf`,
		image: { type: 'jpeg', quality: 0.98 },
		html2canvas: { scale: 2 },
		jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
	};

	try {
		await html2pdf().set(opciones).from(elemento).save();
	} catch (error) {
		console.error('Error al generar PDF:', error);
		alert('Hubo un error al generar el PDF.');
	} finally {
		document.body.removeChild(elemento);
	}
}

/**
 * Genera un reporte PDF de ventas filtrado por período de tiempo
 * @param {Date} fechaInicio - Fecha inicial del período
 * @param {Date} fechaFin - Fecha final del período
 * @param {Array} ventas - Lista completa de ventas
 */
async function generarReportePDFVentas(fechaInicio, fechaFin, ventas) {
	if (typeof html2pdf === 'undefined') {
		alert('No se pudo cargar la librería PDF. Por favor, recarga la página.');
		return;
	}

	// Filtrar ventas por período
	const ventasFiltradas = filtrarVentasPorPeriodo(fechaInicio, fechaFin, ventas);

	if (ventasFiltradas.length === 0) {
		alert(`No hay ventas registradas en el período del ${fechaInicio.toLocaleDateString()} al ${fechaFin.toLocaleDateString()}`);
		return;
	}

	// Crear contenido HTML para el PDF
	const contenidoHTML = generarHTMLReportePDFVentas(fechaInicio, fechaFin, ventasFiltradas);

	// Configurar opciones de html2pdf
	const elemento = document.createElement('div');
	elemento.innerHTML = contenidoHTML;
	document.body.appendChild(elemento);

	const opciones = {
		margin: 10,
		filename: `reporte_ventas_${fechaInicio.toISOString().split('T')[0]}_a_${fechaFin.toISOString().split('T')[0]}.pdf`,
		image: { type: 'jpeg', quality: 0.98 },
		html2canvas: { scale: 2 },
		jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
	};

	try {
		await html2pdf().set(opciones).from(elemento).save();
	} catch (error) {
		console.error('Error al generar PDF:', error);
		alert('Hubo un error al generar el PDF.');
	} finally {
		document.body.removeChild(elemento);
	}
}

/**
 * Filtra reservas por período de fechas
 */
function filtrarReservasPorPeriodo(fechaInicio, fechaFin, reservas) {
	const inicio = new Date(fechaInicio);
	const fin = new Date(fechaFin);
	fin.setHours(23, 59, 59, 999);

	return reservas.filter(r => {
		const entrada = new Date(r.fechaEntrada || r.fecha_entrada);
		const salida = new Date(r.fechaSalida || r.fecha_salida);
		// Incluir reservas que se superponen con el período
		return entrada <= fin && salida >= inicio;
	});
}

/**
 * Filtra ventas por período de fechas
 */
function filtrarVentasPorPeriodo(fechaInicio, fechaFin, ventas) {
	const inicio = new Date(fechaInicio);
	const fin = new Date(fechaFin);
	fin.setHours(23, 59, 59, 999);

	return ventas.filter(v => {
		const fechaVenta = new Date(v.fecha_hora_venta || v.fechaHoraVenta || v.fecha);
		return fechaVenta >= inicio && fechaVenta <= fin;
	});
}

function crearTablaReservasCombinado(reservasFiltradas) {
	if (reservasFiltradas.length === 0) {
		return '<p style="font-size:12px;color:#64748b;">Sin reservas en el período seleccionado.</p>';
	}

	const filas = reservasFiltradas.map((r, idx) => `
		<tr>
			<td style="padding:7px;border:1px solid #ddd;font-size:10px;">${idx + 1}</td>
			<td style="padding:7px;border:1px solid #ddd;font-size:10px;">${r.reserva_id || r.reservaId || '—'}</td>
			<td style="padding:7px;border:1px solid #ddd;font-size:10px;">${r.apellidos_nombres || r.clienteNombre || '—'}</td>
			<td style="padding:7px;border:1px solid #ddd;font-size:10px;">${r.dni || r.clienteDni || '—'}</td>
			<td style="padding:7px;border:1px solid #ddd;font-size:10px;">${r.numero_habitacion || r.numeroHabitacion || '—'}</td>
			<td style="padding:7px;border:1px solid #ddd;font-size:10px;text-align:right;">S/ ${Number(r.importe_total || r.importeTotal || 0).toFixed(2)}</td>
		</tr>
	`).join('');

	return `
		<table style="width:100%;border-collapse:collapse;margin-top:10px;">
			<thead>
				<tr style="background:#1e3a8a;color:#fff;">
					<th style="padding:8px;border:1px solid #ddd;font-size:10px;">#</th>
					<th style="padding:8px;border:1px solid #ddd;font-size:10px;">ID Reserva</th>
					<th style="padding:8px;border:1px solid #ddd;font-size:10px;">Cliente</th>
					<th style="padding:8px;border:1px solid #ddd;font-size:10px;">DNI</th>
					<th style="padding:8px;border:1px solid #ddd;font-size:10px;">Habitación</th>
					<th style="padding:8px;border:1px solid #ddd;font-size:10px;">Importe</th>
				</tr>
			</thead>
			<tbody>${filas}</tbody>
		</table>
	`;
}

function crearTablaVentasCombinado(ventasFiltradas) {
	if (ventasFiltradas.length === 0) {
		return '<p style="font-size:12px;color:#64748b;">Sin ventas en el período seleccionado.</p>';
	}

	const filas = ventasFiltradas.map((v, idx) => `
		<tr>
			<td style="padding:7px;border:1px solid #ddd;font-size:10px;">${idx + 1}</td>
			<td style="padding:7px;border:1px solid #ddd;font-size:10px;">${v.venta_id || v.ventaId || '—'}</td>
			<td style="padding:7px;border:1px solid #ddd;font-size:10px;">${v.cliente_nombre || v.clienteNombre || '—'}</td>
			<td style="padding:7px;border:1px solid #ddd;font-size:10px;">${v.metodo_pago || v.metodoPago || 'No registrado'}</td>
			<td style="padding:7px;border:1px solid #ddd;font-size:10px;text-align:right;">S/ ${Number(v.subtotal || 0).toFixed(2)}</td>
			<td style="padding:7px;border:1px solid #ddd;font-size:10px;text-align:right;">S/ ${Number(v.igv || 0).toFixed(2)}</td>
			<td style="padding:7px;border:1px solid #ddd;font-size:10px;text-align:right;">S/ ${Number(v.total || 0).toFixed(2)}</td>
		</tr>
	`).join('');

	return `
		<table style="width:100%;border-collapse:collapse;margin-top:10px;">
			<thead>
				<tr style="background:#16a34a;color:#fff;">
					<th style="padding:8px;border:1px solid #ddd;font-size:10px;">#</th>
					<th style="padding:8px;border:1px solid #ddd;font-size:10px;">ID Venta</th>
					<th style="padding:8px;border:1px solid #ddd;font-size:10px;">Cliente</th>
					<th style="padding:8px;border:1px solid #ddd;font-size:10px;">Método</th>
					<th style="padding:8px;border:1px solid #ddd;font-size:10px;">Subtotal</th>
					<th style="padding:8px;border:1px solid #ddd;font-size:10px;">IGV</th>
					<th style="padding:8px;border:1px solid #ddd;font-size:10px;">Total</th>
				</tr>
			</thead>
			<tbody>${filas}</tbody>
		</table>
	`;
}

/**
 * Genera HTML para reporte de reservas
 */
function generarHTMLReportePDFReservas(fechaInicio, fechaFin, reservasFiltradas) {
	const formatearFecha = (iso) => {
		const f = new Date(iso);
		if (isNaN(f)) return "—";
		return f.toLocaleString("es-PE", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
	};

	const totalIngresos = reservasFiltradas.reduce((sum, r) => sum + Number(r.importe_total || r.importeTotal || 0), 0);

	let filas = '';
	reservasFiltradas.forEach((r, idx) => {
		filas += `
			<tr>
				<td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 11px;">${idx + 1}</td>
				<td style="padding: 8px; border: 1px solid #ddd; font-size: 11px;">${r.reserva_id || r.reservaId || '—'}</td>
				<td style="padding: 8px; border: 1px solid #ddd; font-size: 11px;">${r.apellidos_nombres || r.clienteNombre || '—'}</td>
				<td style="padding: 8px; border: 1px solid #ddd; font-size: 11px;">${r.dni || r.clienteDni || '—'}</td>
				<td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 11px;">${r.numero_habitacion || r.numeroHabitacion || '—'}</td>
				<td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 11px;">${formatearFecha(r.fecha_entrada || r.fechaEntrada)}</td>
				<td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 11px;">${formatearFecha(r.fecha_salida || r.fechaSalida)}</td>
				<td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-size: 11px;">S/ ${Number(r.precio_base || r.precioBase || 0).toFixed(2)}</td>
				<td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-size: 11px;">S/ ${Number(r.importe_total || r.importeTotal || 0).toFixed(2)}</td>
				<td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 11px;">${r.metodo_pago || r.metodoPago || 'No registrado'}</td>
			</tr>
		`;
	});

	const html = `
		<div style="font-family: Arial, sans-serif; padding: 20px;">
			<div style="text-align: center; margin-bottom: 30px;">
				<h1 style="margin: 0 0 10px 0; color: #1e3a8a;">HOSPEDAJE RUBY</h1>
				<h2 style="margin: 0 0 20px 0; color: #3b82f6;">Reporte de Reservas</h2>
				<p style="margin: 5px 0; color: #666;">Período: ${fechaInicio.toLocaleDateString()} al ${fechaFin.toLocaleDateString()}</p>
				<p style="margin: 5px 0; color: #666;">Fecha de generación: ${new Date().toLocaleString("es-PE")}</p>
			</div>

			<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
				<thead>
					<tr style="background-color: #1e3a8a; color: white;">
						<th style="padding: 10px; border: 1px solid #ddd; text-align: center; font-size: 12px; font-weight: bold;">N°</th>
						<th style="padding: 10px; border: 1px solid #ddd; text-align: left; font-size: 12px; font-weight: bold;">ID Reserva</th>
						<th style="padding: 10px; border: 1px solid #ddd; text-align: left; font-size: 12px; font-weight: bold;">Cliente</th>
						<th style="padding: 10px; border: 1px solid #ddd; text-align: center; font-size: 12px; font-weight: bold;">DNI</th>
						<th style="padding: 10px; border: 1px solid #ddd; text-align: center; font-size: 12px; font-weight: bold;">Habitación</th>
						<th style="padding: 10px; border: 1px solid #ddd; text-align: center; font-size: 12px; font-weight: bold;">Entrada</th>
						<th style="padding: 10px; border: 1px solid #ddd; text-align: center; font-size: 12px; font-weight: bold;">Salida</th>
						<th style="padding: 10px; border: 1px solid #ddd; text-align: right; font-size: 12px; font-weight: bold;">Precio Base</th>
						<th style="padding: 10px; border: 1px solid #ddd; text-align: right; font-size: 12px; font-weight: bold;">Importe Total</th>
						<th style="padding: 10px; border: 1px solid #ddd; text-align: center; font-size: 12px; font-weight: bold;">Método Pago</th>
					</tr>
				</thead>
				<tbody>
					${filas}
				</tbody>
				<tfoot>
					<tr style="background-color: #f0f9ff; font-weight: bold;">
						<td colspan="8" style="padding: 10px; border: 1px solid #ddd; text-align: right;">TOTAL INGRESOS POR RESERVAS:</td>
						<td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #16a34a;">S/ ${totalIngresos.toFixed(2)}</td>
						<td style="padding: 10px; border: 1px solid #ddd;"></td>
					</tr>
				</tfoot>
			</table>

			<div style="margin-top: 30px; padding: 20px; background-color: #f8fafc; border-radius: 8px;">
				<p style="margin: 5px 0; font-size: 12px;">
					<strong>Total de reservas:</strong> ${reservasFiltradas.length}
				</p>
				<p style="margin: 5px 0; font-size: 12px;">
					<strong>Ingreso total:</strong> <span style="color: #16a34a; font-size: 14px;">S/ ${totalIngresos.toFixed(2)}</span>
				</p>
			</div>

			<div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; font-size: 10px; color: #999; text-align: center;">
				<p>Generado por Sistema de Gestión Hospedaje Ruby | ${new Date().toLocaleDateString()}</p>
			</div>
		</div>
	`;

	return html;
}

/**
 * Genera HTML para reporte de ventas
 */
function generarHTMLReportePDFVentas(fechaInicio, fechaFin, ventasFiltradas) {
	const formatearFecha = (iso) => {
		const f = new Date(iso);
		if (isNaN(f)) return "—";
		return f.toLocaleString("es-PE", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
	};

	const totalVentas = ventasFiltradas.reduce((sum, v) => sum + Number(v.total || 0), 0);
	const totalIGV = ventasFiltradas.reduce((sum, v) => sum + Number(v.igv || 0), 0);
	const totalSubtotal = ventasFiltradas.reduce((sum, v) => sum + Number(v.subtotal || 0), 0);

	let filas = '';
	ventasFiltradas.forEach((v, idx) => {
		filas += `
			<tr>
				<td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 11px;">${idx + 1}</td>
				<td style="padding: 8px; border: 1px solid #ddd; font-size: 11px;">${v.venta_id || '—'}</td>
				<td style="padding: 8px; border: 1px solid #ddd; font-size: 11px;">${v.cliente_nombre || '—'}</td>
				<td style="padding: 8px; border: 1px solid #ddd; font-size: 11px;">${v.dni || '—'}</td>
				<td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 11px;">${formatearFecha(v.fecha_hora_venta)}</td>
				<td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-size: 11px;">S/ ${Number(v.subtotal || 0).toFixed(2)}</td>
				<td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-size: 11px;">S/ ${Number(v.igv || 0).toFixed(2)}</td>
				<td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-size: 11px;">S/ ${Number(v.total || 0).toFixed(2)}</td>
				<td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 11px;">${v.metodo_pago || 'No registrado'}</td>
			</tr>
		`;
	});

	const html = `
		<div style="font-family: Arial, sans-serif; padding: 20px;">
			<div style="text-align: center; margin-bottom: 30px;">
				<h1 style="margin: 0 0 10px 0; color: #1e3a8a;">HOSPEDAJE RUBY</h1>
				<h2 style="margin: 0 0 20px 0; color: #16a34a;">Reporte de Ventas</h2>
				<p style="margin: 5px 0; color: #666;">Período: ${fechaInicio.toLocaleDateString()} al ${fechaFin.toLocaleDateString()}</p>
				<p style="margin: 5px 0; color: #666;">Fecha de generación: ${new Date().toLocaleString("es-PE")}</p>
			</div>

			<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
				<thead>
					<tr style="background-color: #16a34a; color: white;">
						<th style="padding: 10px; border: 1px solid #ddd; text-align: center; font-size: 12px; font-weight: bold;">N°</th>
						<th style="padding: 10px; border: 1px solid #ddd; text-align: left; font-size: 12px; font-weight: bold;">ID Venta</th>
						<th style="padding: 10px; border: 1px solid #ddd; text-align: left; font-size: 12px; font-weight: bold;">Cliente</th>
						<th style="padding: 10px; border: 1px solid #ddd; text-align: center; font-size: 12px; font-weight: bold;">DNI</th>
						<th style="padding: 10px; border: 1px solid #ddd; text-align: center; font-size: 12px; font-weight: bold;">Fecha y Hora</th>
						<th style="padding: 10px; border: 1px solid #ddd; text-align: right; font-size: 12px; font-weight: bold;">Subtotal</th>
						<th style="padding: 10px; border: 1px solid #ddd; text-align: right; font-size: 12px; font-weight: bold;">IGV</th>
						<th style="padding: 10px; border: 1px solid #ddd; text-align: right; font-size: 12px; font-weight: bold;">Total</th>
						<th style="padding: 10px; border: 1px solid #ddd; text-align: center; font-size: 12px; font-weight: bold;">Método Pago</th>
					</tr>
				</thead>
				<tbody>
					${filas}
				</tbody>
				<tfoot>
					<tr style="background-color: #f0f9ff; font-weight: bold;">
						<td colspan="5" style="padding: 10px; border: 1px solid #ddd; text-align: right;">TOTAL:</td>
						<td style="padding: 10px; border: 1px solid #ddd; text-align: right;">S/ ${totalSubtotal.toFixed(2)}</td>
						<td style="padding: 10px; border: 1px solid #ddd; text-align: right;">S/ ${totalIGV.toFixed(2)}</td>
						<td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #16a34a;">S/ ${totalVentas.toFixed(2)}</td>
						<td style="padding: 10px; border: 1px solid #ddd;"></td>
					</tr>
				</tfoot>
			</table>

			<div style="margin-top: 30px; padding: 20px; background-color: #f8fafc; border-radius: 8px;">
				<p style="margin: 5px 0; font-size: 12px;">
					<strong>Total de ventas:</strong> ${ventasFiltradas.length}
				</p>
				<p style="margin: 5px 0; font-size: 12px;">
					<strong>Subtotal:</strong> S/ ${totalSubtotal.toFixed(2)}
				</p>
				<p style="margin: 5px 0; font-size: 12px;">
					<strong>IGV (18%):</strong> S/ ${totalIGV.toFixed(2)}
				</p>
				<p style="margin: 5px 0; font-size: 12px;">
					<strong>Total Venta:</strong> <span style="color: #16a34a; font-size: 14px;">S/ ${totalVentas.toFixed(2)}</span>
				</p>
			</div>

			<div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; font-size: 10px; color: #999; text-align: center;">
				<p>Generado por Sistema de Gestión Hospedaje Ruby | ${new Date().toLocaleDateString()}</p>
			</div>
		</div>
	`;

	return html;
}

/**
 * Genera un reporte combinado (Reservas + Ventas) en PDF
 */
async function generarReportePDFCombinado(fechaInicio, fechaFin, reservas, ventas) {
	if (typeof html2pdf === 'undefined') {
		alert('No se pudo cargar la librería PDF. Por favor, recarga la página.');
		return;
	}

	const reservasFiltradas = filtrarReservasPorPeriodo(fechaInicio, fechaFin, reservas);
	const ventasFiltradas = filtrarVentasPorPeriodo(fechaInicio, fechaFin, ventas);

	if (reservasFiltradas.length === 0 && ventasFiltradas.length === 0) {
		alert(`No hay datos registrados en el período del ${fechaInicio.toLocaleDateString()} al ${fechaFin.toLocaleDateString()}`);
		return;
	}

	const contenidoHTML = generarHTMLReporteCombinado(fechaInicio, fechaFin, reservasFiltradas, ventasFiltradas);

	const elemento = document.createElement('div');
	elemento.innerHTML = contenidoHTML;
	document.body.appendChild(elemento);

	const opciones = {
		margin: 10,
		filename: `reporte_combinado_${fechaInicio.toISOString().split('T')[0]}_a_${fechaFin.toISOString().split('T')[0]}.pdf`,
		image: { type: 'jpeg', quality: 0.98 },
		html2canvas: { scale: 2 },
		jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
	};

	try {
		await html2pdf().set(opciones).from(elemento).save();
	} catch (error) {
		console.error('Error al generar PDF:', error);
		alert('Hubo un error al generar el PDF.');
	} finally {
		document.body.removeChild(elemento);
	}
}

/**
 * Genera HTML para reporte combinado
 */
function generarHTMLReporteCombinado(fechaInicio, fechaFin, reservasFiltradas, ventasFiltradas) {
	const totalReservas = reservasFiltradas.reduce((sum, r) => sum + Number(r.importe_total || r.importeTotal || 0), 0);
	const totalVentas = ventasFiltradas.reduce((sum, v) => sum + Number(v.total || 0), 0);
	const totalGeneral = totalReservas + totalVentas;

	const tablaReservas = crearTablaReservasCombinado(reservasFiltradas);
	const tablaVentas = crearTablaVentasCombinado(ventasFiltradas);

	const html = `
		<div style="font-family: Arial, sans-serif; padding: 20px;">
			<div style="text-align: center; margin-bottom: 30px;">
				<h1 style="margin: 0 0 10px 0; color: #1e3a8a;">HOSPEDAJE RUBY</h1>
				<h2 style="margin: 0 0 20px 0; color: #3b82f6;">Reporte Combinado</h2>
				<p style="margin: 5px 0; color: #666;">Período: ${fechaInicio.toLocaleDateString()} al ${fechaFin.toLocaleDateString()}</p>
				<p style="margin: 5px 0; color: #666;">Fecha de generación: ${new Date().toLocaleString("es-PE")}</p>
			</div>

			<div style="margin-top: 30px; padding: 20px; background-color: #f0f9ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
				<h3 style="margin: 0 0 15px 0; color: #1e3a8a;">RESUMEN EJECUTIVO</h3>
				<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; font-size: 14px;">
					<div>
						<p style="margin: 0; color: #666;">Ingresos por Reservas</p>
						<p style="margin: 5px 0 0 0; color: #1e40af; font-size: 18px; font-weight: bold;">S/ ${totalReservas.toFixed(2)}</p>
					</div>
					<div>
						<p style="margin: 0; color: #666;">Ingresos por Ventas</p>
						<p style="margin: 5px 0 0 0; color: #16a34a; font-size: 18px; font-weight: bold;">S/ ${totalVentas.toFixed(2)}</p>
					</div>
					<div>
						<p style="margin: 0; color: #666;">Ingreso Total</p>
						<p style="margin: 5px 0 0 0; color: #dc2626; font-size: 18px; font-weight: bold;">S/ ${totalGeneral.toFixed(2)}</p>
					</div>
				</div>
			</div>

			<div style="margin-top: 32px; page-break-inside: avoid;">
				<h3 style="margin: 0 0 10px 0; color: #1e3a8a;">Detalle de Reservas</h3>
				${tablaReservas}
			</div>

			<div style="margin-top: 32px; page-break-inside: avoid;">
				<h3 style="margin: 0 0 10px 0; color: #16a34a;">Detalle de Ventas</h3>
				${tablaVentas}
			</div>
		</div>
	`;

	return html;
}
