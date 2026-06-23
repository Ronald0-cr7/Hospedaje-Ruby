document.addEventListener("DOMContentLoaded", () => {
	const temaGuardado = localStorage.getItem("tema-sistema") || "claro";
	document.documentElement.setAttribute("data-theme", temaGuardado);
	document.body?.setAttribute("data-theme", temaGuardado);
});