"use strict";

const form = document.getElementById("form");
const canvas = document.getElementById("qr");
const empty = document.getElementById("empty");
const msg = document.getElementById("msg");
const png = document.getElementById("png");
const svg = document.getElementById("svg");
const share = document.getElementById("share");

const val = name => form.elements[name].value.trim();
const enc = encodeURIComponent;
// 10 digits = Indian mobile, so prefix 91; otherwise assume the country code was typed
const phone = s => { s = s.replace(/\D/g, ""); return s.length === 10 ? "91" + s : s; };
const wifiEscape = s => s.replace(/([\\;,:"])/g, "\\$1");
const xmlEscape = s => s.replace(/[&<>"]/g, c => "&#" + c.charCodeAt(0) + ";");

// Each builder returns the exact text stored inside the QR code
const builders = {
	text: () => val("text"),
	whatsapp: () => "https://wa.me/" + phone(val("wa")) + (val("wamsg") ? "?text=" + enc(val("wamsg")) : ""),
	wifi: () => val("sec") === "nopass"
		? `WIFI:T:nopass;S:${wifiEscape(form.elements.ssid.value)};;`
		: `WIFI:T:${val("sec")};S:${wifiEscape(form.elements.ssid.value)};P:${wifiEscape(form.elements.pass.value)};;`,
	phone: () => "tel:+" + phone(val("tel")),
};

// Business policy: no payment, banking or crypto QR codes (fraud risk).
// ponytail: catches payment-app schemes and common Indian payment-link hosts only; a bank's own
// https page still passes, so staff review before printing remains the real check.
const paymentScheme = /^\s*(upi|bhim|paytmmp|phonepe|tez|gpay|credpay|paypal|bitcoin|ethereum|litecoin|dogecoin|solana|tron)\s*:/i;
const paymentHost = /(^|\.)(rzp\.io|razorpay\.me|paytm\.me|phon\.pe|paypal\.me|imjo\.in|pay\.google\.com)$/i;
function isPayment(data) {
	if (paymentScheme.test(data))
		return true;
	try {
		return paymentHost.test(new URL(data.trim()).hostname);
	} catch (e) {
		return false;  // Not a URL, just text
	}
}

const luminance = hex => { const n = parseInt(hex.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255); };


function render() {
	const kind = form.elements.kind.value;
	// Disabled fieldsets are skipped by checkValidity(), so only the visible form is validated
	for (const fs of form.querySelectorAll("fieldset[data-kind]"))
		fs.hidden = fs.disabled = fs.dataset.kind !== kind;

	const ready = form.checkValidity();
	let qr = null;
	msg.textContent = "";
	if (ready) {
		const data = builders[kind]();
		if (isPayment(data))
			msg.textContent = "We don't make QR codes for payments, UPI or banking. Please use the QR code your bank or payment app gives you.";
		else try {
			qr = qrcodegen.QrCode.encodeText(data, qrcodegen.QrCode.Ecc[val("ecc")]);
		} catch (e) {
			msg.textContent = "Too much text for one QR code. Please shorten it.";
		}
	}
	canvas.hidden = !qr;
	empty.hidden = !!qr;
	for (const a of [png, svg]) {
		a.setAttribute("aria-disabled", !qr);
		if (!qr) a.removeAttribute("href");
	}
	if (!qr)
		return;

	const fg = val("fg"), bg = val("bg"), label = val("label");
	if (luminance(fg) >= luminance(bg))
		msg.textContent = "Tip: keep the QR colour darker than the background, or many phones won't scan it.";

	// Bitmap: integer scale so modules stay sharp, about 1200px wide for printing
	const border = 4;
	const modules = qr.size + border * 2;
	const scale = Math.max(4, Math.floor(1200 / modules));
	const width = modules * scale;
	const labelHeight = label ? Math.round(width * 0.12) : 0;
	canvas.width = width;
	canvas.height = width + labelHeight;
	const ctx = canvas.getContext("2d");
	ctx.fillStyle = bg;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = fg;
	for (let y = 0; y < qr.size; y++)
		for (let x = 0; x < qr.size; x++)
			if (qr.getModule(x, y))
				ctx.fillRect((x + border) * scale, (y + border) * scale, scale, scale);
	if (label) {
		ctx.font = `600 ${Math.round(labelHeight * 0.5)}px system-ui, sans-serif`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(label, width / 2, width + labelHeight / 2, width - border * scale * 2);
	}
	canvas.setAttribute("aria-label", "QR code" + (label ? ": " + label : ""));
	png.href = canvas.toDataURL("image/png");

	// Vector: same layout in QR-module units
	const lh = label ? modules * 0.12 : 0;
	// ponytail: ~0.55em average glyph width estimate; SVG has no native shrink-to-fit like canvas maxWidth
	const fontSize = Math.min(lh * 0.5, (modules - border * 2) / (label.length * 0.55));
	let path = "";
	for (let y = 0; y < qr.size; y++)
		for (let x = 0; x < qr.size; x++)
			if (qr.getModule(x, y))
				path += `M${x + border},${y + border}h1v1h-1z`;
	const code = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${modules} ${modules + lh}" shape-rendering="crispEdges">`
		+ `<rect width="100%" height="100%" fill="${bg}"/><path d="${path}" fill="${fg}"/>`
		+ (label ? `<text x="${modules / 2}" y="${modules + lh / 2}" font-family="system-ui, sans-serif" font-weight="600" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle" fill="${fg}">${xmlEscape(label)}</text>` : "")
		+ `</svg>`;
	svg.href = "data:image/svg+xml," + enc(code);
}


// Share straight to WhatsApp etc. on phones that support sharing files
const canShareFiles = navigator.canShare && navigator.canShare({ files: [new File([""], "x.png", { type: "image/png" })] });
share.hidden = !canShareFiles;
share.onclick = () => {
	if (canvas.hidden)
		return;
	canvas.toBlob(blob => navigator.share({ files: [new File([blob], "qr-code.png", { type: "image/png" })] }).catch(() => {}));
};

form.onsubmit = e => e.preventDefault();
form.oninput = render;
form.onchange = render;
render();
