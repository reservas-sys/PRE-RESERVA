/* ==========================================
   CONFIGURACIÓN PRINCIPAL - VIVANTURA
   ========================================== */

const ACCESS_PASSWORD = 'HOLA'; // Contraseña de acceso (Cámbiala si ellos quieren otra)

document.addEventListener('DOMContentLoaded', () => {
    
    // --------------------------------------------------------
    // 1. CONFIGURACIÓN DE CORREO (EMAILJS) - LISTO ✅
    // --------------------------------------------------------
    const EMAILJS_SERVICE_ID = 'service_1q1q1l9';
    const EMAILJS_PUBLIC_KEY = 'Bwz_ooLl9-P5SjDQA';
    const EMAILJS_TEMPLATE_ID = 'template_i7zwj8u';
    
    emailjs.init(EMAILJS_PUBLIC_KEY);

    // --------------------------------------------------------
    // 2. CONFIGURACIÓN DE FIREBASE - LISTO ✅
    // --------------------------------------------------------
    const firebaseConfig = {
      apiKey: "AIzaSyAoeLCPECJEtzO1sJcYzKgrI7nzeelVUG8",
      authDomain: "viventura-6a646.firebaseapp.com",
      projectId: "viventura-6a646",
      storageBucket: "viventura-6a646.firebasestorage.app",
      messagingSenderId: "935783599165",
      appId: "1:935783599165:web:e1b5530720de8d5b5dee54",
      measurementId: "G-9PSH2V92YK"
    };

    // Inicialización de Firebase
    try {
        // Evitamos reinicializar si ya existe
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
    } catch(e) { 
        console.error("Error inicializando Firebase:", e); 
    }
    
    // Inicialización del Storage
    let storage;
    try {
        storage = firebase.storage();
    } catch (e) {
        console.error("Error: Firebase Storage no está disponible. Revisa si habilitaste 'Storage' en la consola.");
    }

    // --------------------------------------------------------
    // 3. LÓGICA DEL SISTEMA
    // --------------------------------------------------------
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password-input');
    const loginError = document.getElementById('login-error');
    const mainWrapper = document.querySelector('.wrapper');
    const form = document.getElementById('pre-reserva-form');
    const formTitleSection = document.getElementById('form-title-section');
    const formSection = document.getElementById('form-section');
    const confirmationSection = document.getElementById('confirmation-section');
    const processBtn = document.getElementById('process-voucher-btn');
    const newVoucherBtn = document.getElementById('new-voucher-btn');

    // Login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (passwordInput.value === ACCESS_PASSWORD) {
            loginOverlay.style.display = 'none';
            mainWrapper.style.display = 'block';
        } else {
            loginError.style.display = 'block';
            passwordInput.value = '';
        }
    });

    // Funciones Auxiliares
    const toggleLoader = (show, text = "Generando PDF...") => {
        const loaderTextElement = document.getElementById('loader-text');
        if (loaderTextElement) loaderTextElement.textContent = text;
        const loaderOverlayElement = document.getElementById('loader-overlay');
        if(loaderOverlayElement) loaderOverlayElement.style.display = show ? 'flex' : 'none';
    };
    
    function formatDate(date) { return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }); }

    function formatCurrency(value, currency) {
        const number = parseFloat(String(value).replace(/[^0-9.-]+/g, ""));
        if (isNaN(number)) { return currency === 'COP' ? '$ 0 COP' : '$ 0.00 USD'; }
        const options = currency === 'COP' ? { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 } : { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 };
        return number.toLocaleString(currency === 'COP' ? 'es-CO' : 'en-US', options);
    }
    
    function addLinkToPDF(pdf, elementId, container, scaleFactor) {
        const element = document.getElementById(elementId);
        if (!element || !element.href) return;
        const rect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const x = (rect.left - containerRect.left) * scaleFactor;
        const y = (rect.top - containerRect.top) * scaleFactor;
        const w = rect.width * scaleFactor;
        const h = rect.height * scaleFactor;
        pdf.link(x, y, w, h, { url: element.href });
    }

    // Rellenar datos en el voucher
    function populateVoucher() {
        const data = {
            destino: document.getElementById('destino').value, nombre: document.getElementById('nombre-completo').value, documento: document.getElementById('documento').value, 
            telefono: document.getElementById('telefono').value, email: document.getElementById('email').value, direccion: document.getElementById('direccion').value,
            fechaInput: document.getElementById('fecha-viaje').value, noches: document.getElementById('cantidad-noches').value, hotel: document.getElementById('hotel').value, localizador: document.getElementById('localizador').value || 'Pendiente', 
            habitaciones: document.getElementById('cantidad-habitaciones').value, valorRestante: document.getElementById('valor-restante').value, moneda: document.getElementById('moneda').value, regimen: document.getElementById('regimen').value, acompanantes: document.getElementById('acompanantes').value, observaciones: document.getElementById('observaciones').value,
        };
        const nochesInt = parseInt(data.noches, 10);
        const checkInDate = new Date(data.fechaInput + 'T00:00:00');
        const checkOutDate = new Date(checkInDate);
        checkOutDate.setDate(checkOutDate.getDate() + nochesInt);
        const fechaCheckInFormateada = formatDate(checkInDate);
        const fechaCheckOutFormateada = formatDate(checkOutDate);
        const valorFormateado = formatCurrency(data.valorRestante, data.moneda) + ' ' + data.moneda;
        const habitacionesInt = parseInt(data.habitaciones, 10);
        const habitacionesTexto = `${habitacionesInt} ${habitacionesInt > 1 ? 'habitaciones' : 'habitación'}`;

        let planDescription = '';
        switch(data.regimen) {
            case 'Solo hotel': planDescription = '<strong>Plan Incluye:</strong> Alojamiento según las noches estipuladas.'; break;
            case 'Hotel y desayuno': planDescription = '<strong>Plan Incluye:</strong> Alojamiento y Desayuno diario.'; break;
            case 'Media Pensión': planDescription = '<strong>Plan Incluye:</strong> Alojamiento, Desayuno y una comida principal.'; break;
            case 'Pensión Completa': planDescription = '<strong>Plan Incluye:</strong> Alojamiento, Desayuno, Almuerzo y Cena.'; break;
            case 'Todo incluido': planDescription = '<strong>Plan Incluye:</strong> Alojamiento, todas las comidas, bebidas y snacks ilimitados.'; break;
        }
        document.getElementById('confirm-nombre-intro').textContent = data.nombre;
        document.getElementById('confirm-destino').textContent = data.destino;
        document.getElementById('confirm-hotel').textContent = data.hotel;
        document.getElementById('confirm-localizador').textContent = data.localizador;
        document.getElementById('confirm-regimen').textContent = data.regimen;
        document.getElementById('confirm-habitaciones').textContent = habitacionesTexto;
        document.getElementById('confirm-nombre').textContent = data.nombre;
        document.getElementById('confirm-documento').textContent = data.documento;
        document.getElementById('confirm-telefono').textContent = data.telefono;
        document.getElementById('confirm-email').textContent = data.email;
        document.getElementById('confirm-direccion').textContent = data.direccion.trim() || 'No especificada';
        document.getElementById('confirm-acompanantes').textContent = data.acompanantes.trim() || 'No especificado';
        document.getElementById('confirm-checkin').textContent = fechaCheckInFormateada;
        document.getElementById('confirm-checkout').textContent = fechaCheckOutFormateada;
        document.getElementById('confirm-noches').textContent = `${nochesInt} ${nochesInt > 1 ? 'noches' : 'noche'}`;
        document.getElementById('confirm-observaciones').textContent = data.observaciones.trim() || 'Ninguna';
        document.getElementById('confirm-valor-restante').textContent = valorFormateado;
        document.getElementById('confirm-plan-incluye').innerHTML = planDescription;
        
        // --- WHATSAPP ACTUALIZADO (3137449530) ---
        const wppNumber = '3137449530';
        const msgVuelos = encodeURIComponent(`Hola, estoy interesado en cotizar tiquetes aéreos para mi reserva a ${data.destino}. Titular: ${data.nombre}`);
        const msgTours = encodeURIComponent(`Hola, me gustaría información sobre tours y actividades para mi reserva en ${data.hotel}. Titular: ${data.nombre}`);
        const msgTraslados = encodeURIComponent(`Hola, necesito cotizar los traslados privados para mi reserva en ${data.hotel}. Titular: ${data.nombre}`);
        
        document.getElementById('banner-vuelos').href = `https://wa.me/${wppNumber}?text=${msgVuelos}`;
        document.getElementById('banner-tours').href = `https://wa.me/${wppNumber}?text=${msgTours}`;
        document.getElementById('banner-traslados').href = `https://wa.me/${wppNumber}?text=${msgTraslados}`;
    }

    // Generar PDF y Enviar
    async function processVoucher() {
        if (!storage) {
            alert("⚠️ Error: El servicio de almacenamiento (Firebase Storage) no está activo. Revisa la consola para más detalles.");
            // Permitimos descargar el PDF localmente aunque falle Firebase
        }
        
        toggleLoader(true, "Generando PDF...");
        processBtn.disabled = true;

        try {
            const elementToPrint = document.getElementById('voucher-to-print');
            const canvas = await html2canvas(elementToPrint, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const pdf = new window.jspdf.jsPDF({
                orientation: 'p',
                unit: 'px',
                format: [imgWidth, imgHeight]
            });

            pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
            
            const scaleFactor = imgWidth / elementToPrint.offsetWidth;
            addLinkToPDF(pdf, 'banner-vuelos', elementToPrint, scaleFactor);
            addLinkToPDF(pdf, 'banner-tours', elementToPrint, scaleFactor);
            addLinkToPDF(pdf, 'banner-traslados', elementToPrint, scaleFactor);
            addLinkToPDF(pdf, 'footer-wpp-link', elementToPrint, scaleFactor);
            
            const nombreCliente = document.getElementById('nombre-completo').value;
            const localFileName = `Comprobante_${nombreCliente.replace(/ /g, '_')}.pdf`;
            
            // 1. Guardar PDF Localmente
            pdf.save(localFileName);
            
            // 2. Subir a Firebase y Enviar Correo (Solo si storage está activo)
            if (storage) {
                const pdfBlob = pdf.output('blob');
                const firebaseFileName = `comprobantes/Comprobante_${nombreCliente.replace(/ /g, '_')}_${Date.now()}.pdf`;
                
                toggleLoader(true, "Subiendo archivo a la nube...");
                const storageRef = storage.ref(firebaseFileName);
                
                // Subida
                const uploadTask = await storageRef.put(pdfBlob);
                const downloadURL = await uploadTask.ref.getDownloadURL();
                
                toggleLoader(true, "Enviando correo al cliente...");
                
                // Envío de correo con EmailJS
                const templateParams = {
                    nombre_cliente: nombreCliente,
                    nombre_hotel: document.getElementById('hotel').value,
                    to_email: document.getElementById('email').value,
                    download_link: downloadURL
                };
                
                await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
                alert("¡ÉXITO TOTAL!\n\n1. PDF descargado en tu equipo.\n2. PDF guardado en la nube.\n3. Correo enviado al cliente.");
            } else {
                alert("¡PDF DESCARGADO!\n\nNota: No se pudo enviar por correo porque Firebase Storage no respondió.");
            }

        } catch (error) {
            console.error("Error en el proceso:", error);
            // Mensajes de error amigables
            if(error.code === 'storage/unauthorized') {
                alert("Error de Permisos en Firebase:\n\nDebes ir a la consola de Firebase -> Storage -> Rules y cambiar 'allow read, write: if request.auth != null;' por 'allow read, write: if true;'");
            } else {
                alert("Hubo un error inesperado. Revisa la consola (F12) para ver el detalle.");
            }
        } finally {
            toggleLoader(false);
            processBtn.disabled = false;
        }
    }
    
    // Event Listeners
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        populateVoucher();
        formTitleSection.style.display = 'none';
        formSection.style.display = 'none';
        confirmationSection.style.display = 'block';
        window.scrollTo(0, 0);
    });

    processBtn.addEventListener('click', processVoucher);

    newVoucherBtn.addEventListener('click', (e) => {
        e.preventDefault();
        confirmationSection.style.display = 'none';
        formTitleSection.style.display = 'block';
        formSection.style.display = 'block';
        form.reset();
        document.getElementById('fecha-viaje').min = new Date().toISOString().split("T")[0];
        window.scrollTo(0, 0);
    });

    document.getElementById('valor-restante').addEventListener('input', function (e) {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });
    document.getElementById('fecha-viaje').min = new Date().toISOString().split("T")[0];
});

// Función de Mapas (Global)
function initAutocomplete() {
    const destinoInput = document.getElementById('destino');
    const hotelInput = document.getElementById('hotel');
    if (typeof google !== 'undefined' && google.maps && google.maps.places) {
        const destinoAutocomplete = new google.maps.places.Autocomplete(destinoInput, { types: ['(cities)'], fields: ['geometry'] });
        const hotelAutocomplete = new google.maps.places.Autocomplete(hotelInput, { types: ['establishment'], fields: ['name'] });
        destinoAutocomplete.addListener('place_changed', () => {
            const place = destinoAutocomplete.getPlace();
            if (place.geometry && place.geometry.viewport) { hotelAutocomplete.setBounds(place.geometry.viewport); }
        });
        hotelAutocomplete.addListener('place_changed', () => {
            const place = hotelAutocomplete.getPlace();
            if (place.name) { hotelInput.value = place.name; }
        });
    }
}
