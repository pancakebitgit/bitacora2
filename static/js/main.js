document.addEventListener('DOMContentLoaded', function() {
    // --- Global Variables & Element References ---
    let editingTradeId = null;
    const strategyForm = document.getElementById('strategyForm');
    const editingTradeIdField = document.getElementById('editingTradeIdField');
    const formSubmitButton = strategyForm ? strategyForm.querySelector('button[type="submit"]') : null;

    const entryDateField = document.getElementById('entryDate');
    const legsContainer = document.getElementById('legsContainer');
    const addLegBtn = document.getElementById('addLegBtn');
    let legCounter = 0;

    const savedStrategiesContainer = document.getElementById('savedStrategiesContainer');
    const expirationNav = document.getElementById('expiration-nav');
    let allFetchedStrategies = [];

    // Notification Pop-up elements
    const popupModal = document.getElementById('popupModal');
    const closePopupBtn = document.getElementById('closePopupBtn');
    const popupIconEl = document.getElementById('popupIcon');
    const popupTitleEl = document.getElementById('popupTitle');
    const popupMessageEl = document.getElementById('popupMessage');

    // Image Modal elements
    const imageModalOverlay = document.getElementById('imageModalOverlay');
    const closeImageModalBtn = document.getElementById('closeImageModalBtn');
    const fullImageDisplay = document.getElementById('fullImageDisplay');

    // Close Trade Modal elements (for initial closing action)
    const closeTradeModalOverlay = document.getElementById('closeTradeModalOverlay');
    const closeCloseTradeModalBtn = document.getElementById('closeCloseTradeModalBtn');
    const closeTradeForm = document.getElementById('closeTradeForm');
    const closeTradeIdField = document.getElementById('closeTradeIdField'); // Hidden input in closeTradeForm
    const actualPlInput = document.getElementById('actualPlInput'); // In closeTradeForm
    const closingDateInput = document.getElementById('closingDateInput'); // In closeTradeForm
    const closingNotesInput = document.getElementById('closingNotesInput'); // In closeTradeForm

    // Form fields for closing details (within main strategyForm, for editing closed trades)
    const closingDetailsSection = document.getElementById('closingDetailsSection');
    const tradeStatusSelect = document.getElementById('trade_status');
    const formActualPlInput = document.getElementById('form_actual_pl');
    const formClosingDateInput = document.getElementById('form_closing_date');
    const formClosingNotesInput = document.getElementById('form_closing_notes');
    // Divs containing these form inputs
    const actualPlDiv = document.getElementById('actualPlDiv');
    const closingDateDiv = document.getElementById('closingDateDiv');
    const closingNotesDiv = document.getElementById('closingNotesDiv');


    // --- Initialization ---
    if (entryDateField) {
        const now = new Date();
        entryDateField.value = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}T${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }

    if (legsContainer && legsContainer.children.length === 0) {
        addLeg(0);
    } else if (legsContainer) {
        legCounter = legsContainer.querySelectorAll('.leg-row').length;
        const initialLeg = document.getElementById('leg-0');
        if (initialLeg) {
            setupButtonToggle(initialLeg);
            const initialDateInput = initialLeg.querySelector('input[type="date"]');
            if (initialDateInput) initializeDatepicker(initialDateInput);
        }
        updateLegNumbers();
    }

    // --- Datepicker Initialization ---
    function initializeDatepicker(element, options = {}) {
        if(element && typeof flatpickr === 'function') {
            const defaultConfig = { dateFormat: "Y-m-d", altInput: true, altFormat: "d M, Y" };
            flatpickr(element, {...defaultConfig, ...options});
        }
    }
    if (closingDateInput) initializeDatepicker(closingDateInput); // For the close trade modal
    if (formClosingDateInput) initializeDatepicker(formClosingDateInput); // For the main form's closing date

    // Event listener for trade status change in the main form
    if (tradeStatusSelect) {
        tradeStatusSelect.addEventListener('change', function() {
            const showClosingFields = this.value === 'Cerrada';
            if(actualPlDiv) actualPlDiv.style.display = showClosingFields ? 'block' : 'none';
            if(closingDateDiv) closingDateDiv.style.display = showClosingFields ? 'block' : 'none';
            if(closingNotesDiv) closingNotesDiv.style.display = showClosingFields ? 'block' : 'none';

            if (showClosingFields && formClosingDateInput && !formClosingDateInput.value) {
                // Set closing date to today by default if switching to 'Cerrada' and it's empty
                const today = new Date().toISOString().slice(0,10);
                if (formClosingDateInput._flatpickr) formClosingDateInput._flatpickr.setDate(today, true);
                else formClosingDateInput.value = today;
            }
        });
    }

    // --- Leg Management ---
    function updateLegNumbers() { /* ... (no changes) ... */
        const legRows = legsContainer.querySelectorAll('.leg-row');
        legRows.forEach((legRow, index) => {
            const h3 = legRow.querySelector('h3');
            if(h3) h3.textContent = `Leg ${index + 1}`;
            const removeBtn = legRow.querySelector('.remove-leg-btn');
            if (removeBtn) removeBtn.style.display = legRows.length > 1 ? 'inline-block' : 'none';
        });
    }
    function setupButtonToggle(legRow) { /* ... (no changes) ... */
        const actionButtons = legRow.querySelectorAll('.action-btn');
        const actionInput = legRow.querySelector('.leg-action-input');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                actionButtons.forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
                if(actionInput) actionInput.value = this.dataset.action;
            });
        });
        const optionTypeButtons = legRow.querySelectorAll('.option-type-btn');
        const optionTypeInput = legRow.querySelector('.leg-option-type-input');
        optionTypeButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                optionTypeButtons.forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
                if(optionTypeInput) optionTypeInput.value = this.dataset.type;
            });
        });
    }
    function addLeg(indexToUse = null) { /* ... (no changes, ensure it returns newLegRow) ... */
        const currentIndex = (indexToUse !== null) ? indexToUse : legCounter;
        const newLegRow = document.createElement('div');
        newLegRow.classList.add('leg-row');
        newLegRow.id = `leg-${currentIndex}`;
        newLegRow.innerHTML = `
            <h3>Leg ${currentIndex + 1}</h3>
            <div><label>Acción:</label><button type="button" class="action-btn buy" data-action="BUY">COMPRA</button><button type="button" class="action-btn sell" data-action="SELL">VENTA</button><input type="hidden" id="leg_${currentIndex}_action" name="legs[${currentIndex}][action]" class="leg-action-input" required></div>
            <div><label for="leg_${currentIndex}_quantity">Cantidad:</label><input type="number" id="leg_${currentIndex}_quantity" name="legs[${currentIndex}][quantity]" min="1" value="1" required></div>
            <div><label>Tipo:</label><button type="button" class="option-type-btn call" data-type="CALL">CALL</button><button type="button" class="option-type-btn put" data-type="PUT">PUT</button><input type="hidden" id="leg_${currentIndex}_option_type" name="legs[${currentIndex}][option_type]" class="leg-option-type-input" required></div>
            <div><label for="leg_${currentIndex}_expirationDate">Fecha de Vencimiento:</label><input type="date" id="leg_${currentIndex}_expirationDate" name="legs[${currentIndex}][expirationDate]" required></div>
            <div><label for="leg_${currentIndex}_strike">Strike:</label><input type="number" step="any" id="leg_${currentIndex}_strike" name="legs[${currentIndex}][strike]" required></div>
            <div><label for="leg_${currentIndex}_premium">Prima:</label><input type="number" step="any" id="leg_${currentIndex}_premium" name="legs[${currentIndex}][premium]" required></div>
            <button type="button" class="remove-leg-btn">Eliminar Leg</button>`;
        legsContainer.appendChild(newLegRow);
        setupButtonToggle(newLegRow);
        const dateInput = newLegRow.querySelector('input[type="date"]');
        if (dateInput) initializeDatepicker(dateInput);
        const removeBtn = newLegRow.querySelector('.remove-leg-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                newLegRow.remove();
                updateLegNumbers();
                if(indexToUse === null && legCounter > 0 && legsContainer.children.length < legCounter) legCounter = legsContainer.children.length;
            });
        }
        if (indexToUse === null) legCounter++;
        updateLegNumbers();
        return newLegRow;
     }
    if (addLegBtn) addLegBtn.addEventListener('click', () => addLeg(null));

    // --- Form Population for Edit & Reset ---
    function populateFormForEdit(tradeId) {
        const trade = allFetchedStrategies.find(s => s.id === parseInt(tradeId));
        if (!trade) {
            showPopup('Error', 'No se encontró la estrategia para editar.', 'error');
            return;
        }
        editingTradeId = tradeId;
        if (editingTradeIdField) editingTradeIdField.value = tradeId;

        document.getElementById('ticker').value = trade.ticker;
        if (entryDateField) {
            const entryDateVal = trade.entry_date ? trade.entry_date.substring(0, 16) : '';
            if (entryDateField._flatpickr) entryDateField._flatpickr.setDate(entryDateVal, true);
            else entryDateField.value = entryDateVal;
        }
        document.getElementById('marketVision').value = trade.notes || '';

        // Populate closing details section
        if(closingDetailsSection) closingDetailsSection.style.display = 'block';
        if(tradeStatusSelect) tradeStatusSelect.value = trade.status || 'Abierta';

        const showClosingFields = (trade.status === 'Cerrada');
        if(actualPlDiv) actualPlDiv.style.display = showClosingFields ? 'block' : 'none';
        if(closingDateDiv) closingDateDiv.style.display = showClosingFields ? 'block' : 'none';
        if(closingNotesDiv) closingNotesDiv.style.display = showClosingFields ? 'block' : 'none';

        if (showClosingFields) {
            if(formActualPlInput) formActualPlInput.value = trade.actual_pl !== null ? trade.actual_pl : '';
            if(formClosingDateInput) {
                if (formClosingDateInput._flatpickr) formClosingDateInput._flatpickr.setDate(trade.closing_date, true);
                else formClosingDateInput.value = trade.closing_date ? trade.closing_date.slice(0,10) : '';
            }
            if(formClosingNotesInput) formClosingNotesInput.value = trade.closing_notes || '';
        } else { // Clear if Abierta
             if(formActualPlInput) formActualPlInput.value = '';
             if(formClosingDateInput) {
                if (formClosingDateInput._flatpickr) formClosingDateInput._flatpickr.clear();
                else formClosingDateInput.value = '';
             }
             if(formClosingNotesInput) formClosingNotesInput.value = '';
        }


        legsContainer.innerHTML = '';
        legCounter = 0;
        trade.legs.forEach((leg, index) => {
            const currentLegRow = addLeg(index);
            // ... (population of leg fields - no change from before) ...
            const actionInput = currentLegRow.querySelector('.leg-action-input');
            const actionButton = currentLegRow.querySelector(`.action-btn[data-action="${leg.action}"]`);
            if (actionInput) actionInput.value = leg.action;
            if (actionButton) actionButton.click();
            currentLegRow.querySelector('input[name*="[quantity]"]').value = leg.quantity;
            const optionTypeInput = currentLegRow.querySelector('.leg-option-type-input');
            const optionTypeButton = currentLegRow.querySelector(`.option-type-btn[data-type="${leg.option_type}"]`);
            if (optionTypeInput) optionTypeInput.value = leg.option_type;
            if (optionTypeButton) optionTypeButton.click();
            const expDateInput = currentLegRow.querySelector('input[name*="[expirationDate]"]');
            if (expDateInput) {
                 if (expDateInput._flatpickr) expDateInput._flatpickr.setDate(leg.expiration_date, true);
                 else expDateInput.value = leg.expiration_date;
            }
            currentLegRow.querySelector('input[name*="[strike]"]').value = leg.strike;
            currentLegRow.querySelector('input[name*="[premium]"]').value = leg.premium;
        });
        legCounter = trade.legs.length;
        if (trade.legs.length === 0) addLeg(0);

        if (formSubmitButton) formSubmitButton.textContent = 'Actualizar Estrategia';
        document.getElementById('strategyForm').scrollIntoView({ behavior: 'smooth' });
    }

    function resetFormToCreateMode() {
        editingTradeId = null;
        if (editingTradeIdField) editingTradeIdField.value = '';
        if (strategyForm) strategyForm.reset(); // Resets native form fields

        if(closingDetailsSection) closingDetailsSection.style.display = 'none'; // Hide closing section
        if(tradeStatusSelect) tradeStatusSelect.value = 'Abierta'; // Reset status select
        if(formActualPlInput) formActualPlInput.value = '';
        if(formClosingDateInput) { // Clear flatpickr for form closing date
            if (formClosingDateInput._flatpickr) formClosingDateInput._flatpickr.clear();
            else formClosingDateInput.value = '';
        }
        if(formClosingNotesInput) formClosingNotesInput.value = '';
        // Hide individual closing divs
        if(actualPlDiv) actualPlDiv.style.display = 'none';
        if(closingDateDiv) closingDateDiv.style.display = 'none';
        if(closingNotesDiv) closingNotesDiv.style.display = 'none';

        legsContainer.innerHTML = '';
        legCounter = 0;
        addLeg(0);
        if (formSubmitButton) formSubmitButton.textContent = 'Guardar Estrategia';
        if (entryDateField) {
            const now = new Date();
            entryDateField.value = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}T${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            // No need to update flatpickr for entryDate as it's readonly and set directly
        }
     }

    // --- Form Submission (Create/Update) ---
    if (strategyForm) {
        strategyForm.onsubmit = function(event) {
            event.preventDefault();
            let firstValidationError = null;
            const legRows = legsContainer.querySelectorAll('.leg-row');
            if (legRows.length === 0) {
                 firstValidationError = "Debe añadir al menos un leg a la estrategia.";
            } else { /* ... (leg validation - no change) ... */
                for (let i = 0; i < legRows.length; i++) {
                    const legRow = legRows[i];
                    const index = i;
                    const actionInput = legRow.querySelector('.leg-action-input');
                    const optionTypeInput = legRow.querySelector('.leg-option-type-input');
                    if (!actionInput.value) {
                        firstValidationError = `Por favor seleccione una Acción para el Leg ${index + 1}.`;
                        break;
                    }
                    if (!optionTypeInput.value) {
                        firstValidationError = `Por favor seleccione un Tipo para el Leg ${index + 1}.`;
                        break;
                    }
                }
            }
            // Validation for closing fields if status is 'Cerrada' during edit
            if (editingTradeId && tradeStatusSelect && tradeStatusSelect.value === 'Cerrada') {
                if (!formActualPlInput || formActualPlInput.value === '' || isNaN(parseFloat(formActualPlInput.value))) {
                    firstValidationError = firstValidationError || "El P/L Real es obligatorio y debe ser un número si el estado es 'Cerrada'.";
                }
                if (!formClosingDateInput || !formClosingDateInput.value) {
                     firstValidationError = firstValidationError || "La Fecha de Cierre es obligatoria si el estado es 'Cerrada'.";
                }
            }

            if (firstValidationError) {
                showPopup('Error de Validación', firstValidationError, 'error');
                return;
            }

            const formData = new FormData(strategyForm);
            // FormData will pick up 'status', 'actual_pl', 'closing_date_str', 'closing_notes'
            // from the main form if they are visible and have values.
            // The backend handles 'None' if fields are empty and status is 'Abierta'.

            let url = '/api/save_strategy';
            let method = 'POST';
            if (editingTradeId) {
                url = `/api/update_strategy/${editingTradeId}`;
                method = 'PUT';
                // FormData automatically includes fields from visible inputs.
                // If status is 'Abierta', actual_pl etc. might be empty. Backend handles this.
            }

            fetch(url, { method: method, body: formData })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showPopup('¡Éxito!', data.message || `Estrategia ${editingTradeId ? 'actualizada' : 'guardada'} correctamente.`, 'success');
                    resetFormToCreateMode();
                    fetchAndDisplayStrategies();
                } else {
                    showPopup('Error', data.message || `Ocurrió un error al ${editingTradeId ? 'actualizar' : 'guardar'} la estrategia.`, 'error');
                }
            })
            .catch((error) => {
                showPopup('Error de Red', 'No se pudo conectar con el servidor.', 'error');
            });
        };
    }

    // --- Notification Pop-up Modal Logic ---
    function showPopup(title, message, type = 'success') { /* ... (no changes) ... */
        if (!popupModal || !popupTitleEl || !popupMessageEl || !popupIconEl) return;
        popupTitleEl.textContent = title;
        popupMessageEl.textContent = message;
        popupIconEl.innerHTML = '';
        popupIconEl.className = 'popup-icon';
        if (type === 'success') {
            popupIconEl.classList.add('success');
            popupIconEl.innerHTML = '&#10004;';
        } else if (type === 'error') {
            popupIconEl.classList.add('error');
            popupIconEl.innerHTML = '&#10008;';
        }
        popupModal.style.display = 'flex';
        setTimeout(() => { popupModal.classList.add('visible'); }, 20);
    }
    function hidePopup() { /* ... (no changes) ... */
        if (!popupModal) return;
        popupModal.classList.remove('visible');
        setTimeout(() => {
            if (!popupModal.classList.contains('visible')) popupModal.style.display = 'none';
        }, 300);
    }
    if (closePopupBtn) closePopupBtn.addEventListener('click', hidePopup);
    if (popupModal) popupModal.addEventListener('click', function(event) { if (event.target === popupModal) hidePopup(); });

    // --- Image Modal Logic ---
    // (No changes here, this is just context for where to add the new function)

    // --- Helper Function for P/L Ratio ---
    function calculatePotentialPlRatio(maxProfit, maxRisk) {
        // Ensure maxRisk and maxProfit are numbers before division
        const numMaxRisk = (typeof maxRisk === 'number') ? maxRisk : parseFloat(maxRisk);
        const numMaxProfit = (typeof maxProfit === 'number') ? maxProfit : parseFloat(maxProfit);

        if (maxRisk === null) { // Risk is unlimited
            return "N/A (Riesgo Ilimitado)";
        }
        if (maxProfit === null) { // Profit is unlimited
            if (numMaxRisk > 0) {
                return "Ilimitado";
            } else { // Unlimited profit with zero or undefined risk is also ill-defined for a simple ratio
                return "N/A";
            }
        }

        // At this point, maxProfit and numMaxProfit should be numbers (not null)
        // And maxRisk is not null (so numMaxRisk is a number or NaN)

        if (isNaN(numMaxRisk) || isNaN(numMaxProfit)) {
            return "N/A";
        }

        if (numMaxRisk > 0) {
            return (numMaxProfit / numMaxRisk).toFixed(2); // Using 2 decimal places for ratio
        } else if (numMaxRisk === 0) {
            if (numMaxProfit > 0) {
                return "Infinito (Profit > 0, Riesgo 0)";
            } else if (numMaxProfit === 0) {
                return "N/A (0/0)";
            } else { // maxProfit < 0 and maxRisk === 0
                return "Negativo (Pérdida, Riesgo 0)";
            }
        } else { // maxRisk < 0 (should not happen for "risk") or other cases
            return "N/A";
        }
    }


    function showImageModal(imageUrl) { /* ... (no changes) ... */
        const imageModalOverlay = document.getElementById('imageModalOverlay');
        const fullImageDisplay = document.getElementById('fullImageDisplay');
        if (!imageModalOverlay) { console.error("CRITICAL: imageModalOverlay element NOT FOUND at the moment of call!"); return; }
        if (!fullImageDisplay) { console.error("CRITICAL: fullImageDisplay element NOT FOUND at the moment of call!"); return; }
        fullImageDisplay.src = imageUrl;
        imageModalOverlay.style.display = 'flex';
        setTimeout(() => { imageModalOverlay.classList.add('visible'); }, 20);
    }
    function hideImageModal() { /* ... (no changes) ... */
        const imageModalOverlay = document.getElementById('imageModalOverlay');
        const fullImageDisplay = document.getElementById('fullImageDisplay');
        if (!imageModalOverlay) { console.error("CRITICAL: imageModalOverlay element NOT FOUND at the moment of call!"); return; }
        imageModalOverlay.classList.remove('visible');
        setTimeout(() => {
            if (!imageModalOverlay.classList.contains('visible')) {
                imageModalOverlay.style.display = 'none';
                if(fullImageDisplay) fullImageDisplay.src = '';
            }
        }, 300);
    }
    const imageModalOverlayGlobal = document.getElementById('imageModalOverlay');
    const closeImageModalBtnGlobal = document.getElementById('closeImageModalBtn');
    if (closeImageModalBtnGlobal) closeImageModalBtnGlobal.addEventListener('click', hideImageModal);
    if (imageModalOverlayGlobal) imageModalOverlayGlobal.addEventListener('click', function(event) { if (event.target === imageModalOverlayGlobal) hideImageModal(); });

    // --- Close Trade Modal Logic (for initial closing action) ---
    function showCloseTradeModal(tradeId) { /* ... (no changes) ... */
        if (!closeTradeModalOverlay || !closeTradeIdField || !closingDateInput || !actualPlInput || !closingNotesInput) {
            showPopup("Error", "No se pudo abrir el formulario de cierre.", "error"); return;
        }
        closeTradeIdField.value = tradeId;
        const today = new Date().toISOString().slice(0,10);
        if (closingDateInput._flatpickr) closingDateInput._flatpickr.setDate(today, true);
        else closingDateInput.value = today;
        actualPlInput.value = '';
        closingNotesInput.value = '';
        closeTradeModalOverlay.style.display = 'flex';
        setTimeout(() => { closeTradeModalOverlay.classList.add('visible'); }, 20);
    }
    function hideCloseTradeModal() { /* ... (no changes) ... */
        if (!closeTradeModalOverlay) return;
        closeTradeModalOverlay.classList.remove('visible');
        setTimeout(() => { if (!closeTradeModalOverlay.classList.contains('visible')) closeTradeModalOverlay.style.display = 'none'; }, 300);
    }
    if (closeCloseTradeModalBtn) closeCloseTradeModalBtn.addEventListener('click', hideCloseTradeModal);
    if (closeTradeModalOverlay) closeTradeModalOverlay.addEventListener('click', function(event) { if (event.target === closeTradeModalOverlay) hideCloseTradeModal(); });
    if (closeTradeForm) { /* ... (no changes to its submit handler) ... */
        closeTradeForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const tradeId = closeTradeIdField.value;
            const payload = {
                actual_pl: actualPlInput.value,
                closing_date_str: closingDateInput.value,
                closing_notes: closingNotesInput.value
            };
            if (payload.actual_pl === '' || isNaN(parseFloat(payload.actual_pl))) {
                showPopup("Error de Validación", "Por favor, ingrese un P/L Real válido.", "error"); return;
            }
            fetch(`/api/trade/${tradeId}/close`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showPopup('¡Éxito!', data.message || 'Operación cerrada correctamente.', 'success');
                    hideCloseTradeModal(); fetchAndDisplayStrategies();
                } else {
                    showPopup('Error', data.message || 'No se pudo cerrar la operación.', 'error');
                }
            })
            .catch(error => { showPopup('Error de Red', 'No se pudo conectar con el servidor.', 'error'); });
        });
    }

    // --- Displaying Saved Strategies & Sidebar ---
    function populateExpirationNav(strategies) { /* ... (no changes) ... */
        if (!expirationNav) return;
        expirationNav.innerHTML = '';
        const expirationDates = [...new Set(strategies.map(s => s.primary_expiration_date_str ? s.primary_expiration_date_str.substring(0, 7) : 'Sin Vencimiento'))];
        expirationDates.sort((a, b) => {
            if (a === 'Sin Vencimiento') return 1; if (b === 'Sin Vencimiento') return -1;
            return new Date(a + '-01') - new Date(b + '-01');
        });
        const allLink = document.createElement('a');
        allLink.href = '#'; allLink.textContent = 'Mostrar Todas'; allLink.classList.add('expiration-link', 'active');
        allLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('#expiration-nav .expiration-link.active').forEach(el => el.classList.remove('active'));
            allLink.classList.add('active');
            renderStrategies(allFetchedStrategies);
        });
        expirationNav.appendChild(allLink);
         expirationDates.forEach(dateStr => {
            const link = document.createElement('a');
            link.href = '#'; link.classList.add('expiration-link');
            link.textContent = dateStr === 'Sin Vencimiento' ? 'Sin Vencimiento' : new Date(dateStr + '-01').toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
            link.dataset.filterDate = dateStr;
            link.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('#expiration-nav .expiration-link.active').forEach(el => el.classList.remove('active'));
                link.classList.add('active');
                const filtered = allFetchedStrategies.filter(s => (s.primary_expiration_date_str ? s.primary_expiration_date_str.substring(0, 7) : 'Sin Vencimiento') === dateStr);
                renderStrategies(filtered, dateStr);
            });
            expirationNav.appendChild(link);
        });
    }

    function renderStrategies(strategiesToRender, currentFilterDate = null) {
        savedStrategiesContainer.innerHTML = '';
        if (!strategiesToRender || strategiesToRender.length === 0) {
            savedStrategiesContainer.innerHTML = `<p>No hay estrategias para mostrar${(currentFilterDate && currentFilterDate !== 'Mostrar Todas' ? ` para ${new Date(currentFilterDate + '-01').toLocaleDateString('es-ES',{month:'long', year:'numeric'})}` : '.')}</p>`;
            return;
        }

        const groupedByMonth = strategiesToRender.reduce((acc, strategy) => {
            let monthYear = 'Sin Vencimiento Asignado';
            if (strategy.primary_expiration_date_str) monthYear = strategy.primary_expiration_date_str.substring(0, 7);
            if (!acc[monthYear]) acc[monthYear] = [];
            acc[monthYear].push(strategy);
            return acc;
        }, {});

        const sortedMonths = Object.keys(groupedByMonth).sort((a,b) => {
            if(a === 'Sin Vencimiento Asignado') return 1;
            if(b === 'Sin Vencimiento Asignado') return -1;
            return new Date(a + '-01') - new Date(b + '-01');
        });

        sortedMonths.forEach(monthYear => {
            const monthDiv = document.createElement('div');
            monthDiv.classList.add('expiration-month-group');
            const monthHeader = document.createElement('h3');
            let headerText = monthYear;
             if (monthYear !== 'Sin Vencimiento Asignado') {
                try { headerText = new Date(monthYear + '-01').toLocaleDateString('es-ES', { year: 'numeric', month: 'long' }); } catch (e) { /* use raw monthYear */ }
            }
            monthHeader.textContent = headerText;
            monthDiv.appendChild(monthHeader);

            groupedByMonth[monthYear].forEach(strategy => {
                const card = document.createElement('div');
                card.classList.add('strategy-card');
                const entryDateLocale = strategy.entry_date ? new Date(strategy.entry_date).toLocaleString('es-ES') : 'N/A';
                const maxRiskDisplay = strategy.max_risk !== null && strategy.max_risk !== undefined ? Number(strategy.max_risk).toFixed(2) : 'N/A';
                const maxProfitDisplay = strategy.max_profit !== null && strategy.max_profit !== undefined ? Number(strategy.max_profit).toFixed(2) : 'N/A';
                const actualPlDisplay = strategy.actual_pl !== null && strategy.actual_pl !== undefined ? Number(strategy.actual_pl).toFixed(2) : 'N/A';
                const closingDateDisplay = strategy.closing_date ? new Date(strategy.closing_date).toLocaleDateString('es-ES') : 'N/A';
                let statusBadge = `<span class="status-badge status-${strategy.status ? strategy.status.toLowerCase() : 'abierta'}">${strategy.status || 'Abierta'}</span>`;

                card.innerHTML = `
                    <h4>${strategy.ticker || 'N/A'} - ${strategy.detected_strategy || 'N/A'} ${statusBadge}</h4>
                    <p><strong>Fecha Entrada:</strong> ${entryDateLocale}</p>
                    ${strategy.status === 'Cerrada' ? `
                        <p><strong>P/L Real:</strong> <span class="pl-value ${Number(strategy.actual_pl) >= 0 ? 'profit' : 'loss'}">${actualPlDisplay}</span></p>
                        <p><strong>Fecha Cierre:</strong> ${closingDateDisplay}</p>
                        ${strategy.closing_notes ? `<p><strong>Notas Cierre:</strong> ${strategy.closing_notes}</p>` : ''}
                    ` : `
                        <p><strong>Riesgo Máx:</strong> ${maxRiskDisplay}</p>
                        <p><strong>Beneficio Máx:</strong> ${maxProfitDisplay}</p>
                        <p><strong>Ratio P/L Potencial:</strong> ${calculatePotentialPlRatio(strategy.max_profit, strategy.max_risk)}</p>
                    `}
                    <div class="card-actions">
                        <button class="view-details-btn">Ver Detalles</button>
                        <button class="edit-strategy-btn" data-trade-id="${strategy.id}">Editar</button>
                        ${strategy.status !== 'Cerrada' ? `<button class="close-trade-btn" data-trade-id="${strategy.id}">Registrar Cierre</button>` : ''}
                        <button class="delete-strategy-btn" data-trade-id="${strategy.id}">Eliminar</button>
                    </div>
                    <div class="strategy-details">
                        <h5>Detalle de Legs:</h5>
                        <table class="legs-table"><thead><tr><th>Acción</th><th>Cant.</th><th>Tipo</th><th>Vencimiento</th><th>Strike</th><th>Prima</th></tr></thead>
                        <tbody>${strategy.legs.map(leg => `<tr><td>${leg.action}</td><td>${leg.quantity}</td><td>${leg.option_type}</td><td>${leg.expiration_date ? new Date(leg.expiration_date).toLocaleDateString('es-ES') : 'N/A'}</td><td>${leg.strike}</td><td>${Number(leg.premium).toFixed(2)}</td></tr>`).join('')}</tbody>
                        </table>
                        <h5>Notas:</h5><p>${strategy.notes || 'N/A'}</p>
                        <h5>Imágenes:</h5><div class="strategy-images">${(strategy.images && strategy.images.length > 0) ? strategy.images.map(img => `<img src="${img.url}" alt="${img.filename}" class="strategy-image-thumbnail" data-fullimage-url="${img.url}" width="100" style="cursor:pointer;">`).join('') : 'N/A'}</div>
                    </div>`;
                monthDiv.appendChild(card);
                const detailsBtn = card.querySelector('.view-details-btn');
                if(detailsBtn) {
                    detailsBtn.addEventListener('click', function() {
                        const detailsDiv = card.querySelector('.strategy-details');
                        if (detailsDiv) {
                            detailsDiv.classList.toggle('expanded');
                            this.textContent = detailsDiv.classList.contains('expanded') ? 'Ocultar Detalles' : 'Ver Detalles';
                        }
                    });
                }
            });
            if (groupedByMonth[monthYear].length > 0) savedStrategiesContainer.appendChild(monthDiv);
        });
    }

    function fetchAndDisplayStrategies() { /* ... (no changes) ... */
        fetch('/api/get_strategies')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    allFetchedStrategies = data.strategies;
                    populateExpirationNav(allFetchedStrategies);
                    const activeFilterLink = document.querySelector('#expiration-nav .expiration-link.active');
                    let filterDate = null;
                    if (activeFilterLink && activeFilterLink.dataset.filterDate && activeFilterLink.textContent !== 'Mostrar Todas') {
                        filterDate = activeFilterLink.dataset.filterDate;
                        const filtered = allFetchedStrategies.filter(s => (s.primary_expiration_date_str ? s.primary_expiration_date_str.substring(0, 7) : 'Sin Vencimiento') === filterDate);
                        renderStrategies(filtered, filterDate);
                    } else {
                        renderStrategies(allFetchedStrategies);
                    }
                } else {
                    if(savedStrategiesContainer) savedStrategiesContainer.innerHTML = `<p>Error al cargar: ${data.message}</p>`;
                }
            })
            .catch(error => {
                if(savedStrategiesContainer) savedStrategiesContainer.innerHTML = `<p>Error de red.</p>`;
            });
    }

    fetchAndDisplayStrategies();

    if (savedStrategiesContainer) { /* ... (modified to include .close-trade-btn listener) ... */
        savedStrategiesContainer.addEventListener('click', function(event) {
            const target = event.target;
            if (target.classList.contains('edit-strategy-btn')) {
                const tradeId = target.dataset.tradeId;
                populateFormForEdit(tradeId);
            } else if (target.classList.contains('delete-strategy-btn')) {
                const tradeId = target.dataset.tradeId;
                if (window.confirm(`¿Estás seguro de que quieres eliminar la estrategia ID ${tradeId}?`)) {
                    fetch(`/api/delete_strategy/${tradeId}`, { method: 'DELETE' })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            showPopup('Eliminada', data.message || 'Estrategia eliminada.', 'success');
                            fetchAndDisplayStrategies();
                        } else {
                            showPopup('Error', data.message || 'No se pudo eliminar.', 'error');
                        }
                    })
                    .catch(error => showPopup('Error de Red', 'No se pudo conectar.', 'error'));
                }
            } else if (target.classList.contains('strategy-image-thumbnail')) {
                const fullImageUrl = target.getAttribute('data-fullimage-url');
                if (fullImageUrl) showImageModal(fullImageUrl);
                else console.error("data-fullimage-url attribute is missing or empty.");
            } else if (target.classList.contains('close-trade-btn')) { // Listener for new button
                const tradeId = target.dataset.tradeId;
                showCloseTradeModal(tradeId);
            }
        });
    }
});
