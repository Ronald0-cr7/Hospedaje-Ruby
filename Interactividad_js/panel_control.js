document.addEventListener("DOMContentLoaded", () => {
	const body = document.body;
	const sidebar = document.getElementById("sidebar");
	const toggleSidebarBtn = document.getElementById("toggle-sidebar-btn");
	const themeToggleBtn = document.getElementById("theme-toggle-btn");
	const themeLabel = document.getElementById("theme-toggle-label");
	const themeIcon = document.getElementById("theme-toggle-icon");
	const navLinks = document.querySelectorAll(".nav-link");
	const activeSection = document.getElementById("active-section");

	const rutaActual = window.location.pathname.split("/").pop() || "panel_control.html";

	function aplicarTema(tema) {
		body.setAttribute("data-theme", tema);
		document.documentElement.setAttribute("data-theme", tema);
		localStorage.setItem("tema-sistema", tema);
		if (themeLabel) {
			themeLabel.textContent = tema === "oscuro" ? "Modo oscuro" : "Modo claro";
		}
		if (themeIcon) {
			themeIcon.textContent = tema === "oscuro" ? "🌙" : "☀️";
		}
	}

	function alternarTema() {
		const temaActual = body.getAttribute("data-theme") === "oscuro" ? "oscuro" : "claro";
		aplicarTema(temaActual === "claro" ? "oscuro" : "claro");
	}

	function aplicarSidebarColapsado(colapsado) {
		body.classList.toggle("sidebar-collapsed", colapsado);
		if (sidebar) {
			sidebar.setAttribute("aria-expanded", colapsado ? "false" : "true");
		}
		localStorage.setItem("sidebar-colapsado", colapsado ? "1" : "0");
	}

	function alternarSidebar() {
		aplicarSidebarColapsado(!body.classList.contains("sidebar-collapsed"));
	}

	const temaInicial = localStorage.getItem("tema-sistema") || "claro";
	aplicarTema(temaInicial);
	const sidebarGuardado = localStorage.getItem("sidebar-colapsado") === "1";
	aplicarSidebarColapsado(sidebarGuardado);

	if (themeToggleBtn) {
		themeToggleBtn.addEventListener("click", alternarTema);
	}

	if (toggleSidebarBtn) {
		toggleSidebarBtn.addEventListener("click", alternarSidebar);
	}

	navLinks.forEach((link) => {
		const destino = link.getAttribute("href");
		if (destino && destino === rutaActual) {
			link.classList.add("active");
			if (activeSection) {
				activeSection.textContent = link.querySelector("span:last-child")?.textContent || "Dashboard";
			}
		}
	});

	if (activeSection && !activeSection.textContent) {
		activeSection.textContent = "Dashboard";
	}
});