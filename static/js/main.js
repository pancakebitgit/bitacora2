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
    const popupModal = document.getElementById('popupModal'); // etc.

    // Image Modal elements
    const imageModalOverlayGlobalRef = document.getElementById('imageModalOverlay'); // etc.

    // Close Trade Modal elements
    const closeTradeModalOverlay = document.getElementById('closeTradeModalOverlay'); // etc.

    // Form fields for closing details
    const closingDetailsSection = document.getElementById('closingDetailsSection'); // etc.

    // Form fields for Tags (Checkboxes)
    const tagCheckboxes = document.querySelectorAll('input[name="tag_options"]');
    const tradeTagsHiddenInput = document.getElementById('trade_tags_hidden');


    // --- Initialization ---
    // ... (sin cambios significativos, solo asegurar que las referencias de arriba son correctas)
    // (Re-obtener referencias a elementos de modales que se movieron dentro de funciones)
    const closePopupBtn = document.getElementById('closePopupBtn');
    const popupIconEl = document.getElementById('popupIcon');
    const popupTitleEl = document.getElementById('popupTitle');
    const popupMessageEl = document.getElementById('popupMessage');
    const closeImageModalBtnGlobalRef = document.getElementById('closeImageModalBtn');
    const closeCloseTradeModalBtn = document.getElementById('closeCloseTradeModalBtn');
    const closeTradeForm = document.getElementById('closeTradeForm');
    const closeTradeIdField = document.getElementById('closeTradeIdField');
    const actualPlInput = document.getElementById('actualPlInput');
    const closingDateInput = document.getElementById('closingDateInput');
    const closingNotesInput = document.getElementById('closingNotesInput');
    const tradeStatusSelect = document.getElementById('trade_status');
    const formActualPlInput = document.getElementById('form_actual_pl');
    const formClosingDateInput = document.getElementById('form_closing_date');
    const formClosingNotesInput = document.getElementById('form_closing_notes');
    const actualPlDiv = document.getElementById('actualPlDiv');
    const closingDateDiv = document.getElementById('closingDateDiv');
    const closingNotesDiv = document.getElementById('closingNotesDiv');


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
    if (closingDateInput) initializeDatepicker(closingDateInput);
    if (formClosingDateInput) initializeDatepicker(formClosingDateInput);
    if (tradeStatusSelect) {
        tradeStatusSelect.addEventListener('change', function() {
            const showClosingFields = this.value === 'Cerrada';
            if(actualPlDiv) actualPlDiv.style.display = showClosingFields ? 'block' : 'none';
            if(closingDateDiv) closingDateDiv.style.display = showClosingFields ? 'block' : 'none';
            if(closingNotesDiv) closingNotesDiv.style.display = showClosingFields ? 'block' : 'none';
            if (showClosingFields && formClosingDateInput && !formClosingDateInput.value) {
                const today = new Date().toISOString().slice(0,10);
                if (formClosingDateInput._flatpickr) formClosingDateInput._flatpickr.setDate(today, true);
                else formClosingDateInput.value = today;
            }
        });
    }

    // --- Datepicker, Leg Management, Pop-up, Image Modal, Close Trade Modal functions (sin cambios) ---
    function initializeDatepicker(element, options = {}) { /* ... */
        if(element && typeof flatpickr === 'function') {
            const defaultConfig = { dateFormat: "Y-m-d", altInput: true, altFormat: "d M, Y" };
            flatpickr(element, {...defaultConfig, ...options});
        }
    }
    function updateLegNumbers() { /* ... */
        const legRows = legsContainer.querySelectorAll('.leg-row');
        legRows.forEach((legRow, index) => {
            const h3 = legRow.querySelector('h3');
            if(h3) h3.textContent = `Leg ${index + 1}`;
            const removeBtn = legRow.querySelector('.remove-leg-btn');
            if (removeBtn) removeBtn.style.display = legRows.length > 1 ? 'inline-block' : 'none';
        });
    }
    function setupButtonToggle(legRow) { /* ... */
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
    function addLeg(indexToUse = null) { /* ... (retorna newLegRow) ... */
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
    function showPopup(title, message, type = 'success') { /* ... */
        if (!popupModal || !popupTitleEl || !popupMessageEl || !popupIconEl) return;
        popupTitleEl.textContent = title; popupMessageEl.textContent = message;
        popupIconEl.innerHTML = ''; popupIconEl.className = 'popup-icon';
        if (type === 'success') { popupIconEl.classList.add('success'); popupIconEl.innerHTML = '&#10004;'; }
        else if (type === 'error') { popupIconEl.classList.add('error'); popupIconEl.innerHTML = '&#10008;'; }
        popupModal.style.display = 'flex'; setTimeout(() => { popupModal.classList.add('visible'); }, 20);
    }
    function hidePopup() { /* ... */
        if (!popupModal) return;
        popupModal.classList.remove('visible');
        setTimeout(() => { if (!popupModal.classList.contains('visible')) popupModal.style.display = 'none'; }, 300);
    }
    if (closePopupBtn) closePopupBtn.addEventListener('click', hidePopup);
    if (popupModal) popupModal.addEventListener('click', function(event) { if (event.target === popupModal) hidePopup(); });
    function showImageModal(imageUrl) { /* ... */
        const imageModal = document.getElementById('imageModalOverlay');
        const fullImgDisplay = document.getElementById('fullImageDisplay');
        if (!imageModal) { console.error("CRITICAL: imageModalOverlay element NOT FOUND!"); return; }
        if (!fullImgDisplay) { console.error("CRITICAL: fullImageDisplay element NOT FOUND!"); return; }
        fullImgDisplay.src = imageUrl; imageModal.style.display = 'flex';
        setTimeout(() => { imageModal.classList.add('visible'); }, 20);
    }
    function hideImageModal() { /* ... */
        const imageModal = document.getElementById('imageModalOverlay');
        const fullImgDisplay = document.getElementById('fullImageDisplay');
        if (!imageModal) { console.error("CRITICAL: imageModalOverlay element NOT FOUND!"); return; }
        imageModal.classList.remove('visible');
        setTimeout(() => {
            if (!imageModal.classList.contains('visible')) {
                imageModal.style.display = 'none';
                if(fullImgDisplay) fullImgDisplay.src = '';
            }
        }, 300);
    }
    if (closeImageModalBtnGlobalRef) closeImageModalBtnGlobalRef.addEventListener('click', hideImageModal);
    if (imageModalOverlayGlobalRef) imageModalOverlayGlobalRef.addEventListener('click', function(event) { if (event.target === imageModalOverlayGlobalRef) hideImageModal(); });
    function showCloseTradeModal(tradeId) { /* ... */
        if (!closeTradeModalOverlay || !closeTradeIdField || !closingDateInput || !actualPlInput || !closingNotesInput) {
            showPopup("Error", "No se pudo abrir el formulario de cierre.", "error"); return;
        }
        closeTradeIdField.value = tradeId;
        const today = new Date().toISOString().slice(0,10);
        if (closingDateInput._flatpickr) closingDateInput._flatpickr.setDate(today, true);
        else closingDateInput.value = today;
        actualPlInput.value = ''; closingNotesInput.value = '';
        closeTradeModalOverlay.style.display = 'flex';
        setTimeout(() => { closeTradeModalOverlay.classList.add('visible'); }, 20);
    }
    function hideCloseTradeModal() { /* ... */
        if (!closeTradeModalOverlay) return;
        closeTradeModalOverlay.classList.remove('visible');
        setTimeout(() => { if (!closeTradeModalOverlay.classList.contains('visible')) closeTradeModalOverlay.style.display = 'none'; }, 300);
    }
    if (closeCloseTradeModalBtn) closeCloseTradeModalBtn.addEventListener('click', hideCloseTradeModal);
    if (closeTradeModalOverlay) closeTradeModalOverlay.addEventListener('click', function(event) { if (event.target === closeTradeModalOverlay) hideCloseTradeModal(); });
    if (closeTradeForm) { /* ... */
        closeTradeForm.addEventListener('submit', function(event) {
            event.preventDefault(); const tradeId = closeTradeIdField.value;
            const payload = { actual_pl: actualPlInput.value, closing_date_str: closingDateInput.value, closing_notes: closingNotesInput.value };
            if (payload.actual_pl === '' || isNaN(parseFloat(payload.actual_pl))) {
                showPopup("Error de Validación", "P/L Real válido es requerido.", "error"); return;
            }
            fetch(`/api/trade/${tradeId}/close`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            .then(response => response.json()).then(data => {
                if (data.success) { showPopup('¡Éxito!', data.message || 'Operación cerrada.', 'success'); hideCloseTradeModal(); fetchAndDisplayStrategies(); }
                else { showPopup('Error', data.message || 'No se pudo cerrar.', 'error'); }
            }).catch(error => { showPopup('Error de Red', 'No se pudo conectar.', 'error'); });
        });
    }
    const OPTION_MULTIPLIER_JS = 100.0;
    const chartInstances = {};

    // --- Helper Function for P/L Ratio ---
    function calculatePotentialPlRatio(maxProfit, maxRisk) {
        const numMaxRisk = (typeof maxRisk === 'number') ? maxRisk : parseFloat(maxRisk);
        const numMaxProfit = (typeof maxProfit === 'number') ? maxProfit : parseFloat(maxProfit);

        if (maxRisk === null) {
            return "N/A (Riesgo Ilimitado)";
        }
        if (maxProfit === null) {
            if (numMaxRisk > 0) {
                return "Ilimitado";
            } else {
                return "N/A";
            }
        }

        if (isNaN(numMaxRisk) || isNaN(numMaxProfit)) {
            return "N/A";
        }

        if (numMaxRisk > 0) {
            return (numMaxProfit / numMaxRisk).toFixed(2);
        } else if (numMaxRisk === 0) {
            if (numMaxProfit > 0) {
                return "Infinito (Profit > 0, Riesgo 0)";
            } else if (numMaxProfit === 0) {
                return "N/A (0/0)";
            } else {
                return "Negativo (Pérdida, Riesgo 0)";
            }
        } else {
            return "N/A";
        }
    }

    // --- Form Population for Edit & Reset (MODIFIED) ---
    function populateFormForEdit(tradeId) {
        const trade = allFetchedStrategies.find(s => s.id === parseInt(tradeId));
        if (!trade) { showPopup('Error', 'No se encontró la estrategia para editar.', 'error'); return; }
        editingTradeId = tradeId;
        if (editingTradeIdField) editingTradeIdField.value = tradeId;
        document.getElementById('ticker').value = trade.ticker;
        // ... (resto de populateFormForEdit como antes) ...
        document.getElementById('marketVision').value = trade.notes || '';

        // Populate tags
        tagCheckboxes.forEach(checkbox => checkbox.checked = false); // Uncheck all first
        if (trade.tags && typeof trade.tags === 'string') {
            const selectedTags = trade.tags.split(',');
            selectedTags.forEach(tagValue => {
                const checkbox = document.querySelector(`input[name="tag_options"][value="${tagValue.trim()}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }

        // ... (populate closingDetailsSection, legs - sin cambios) ...
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
        } else {
             if(formActualPlInput) formActualPlInput.value = '';
             if(formClosingDateInput) {
                if (formClosingDateInput._flatpickr) formClosingDateInput._flatpickr.clear(); else formClosingDateInput.value = '';
             }
             if(formClosingNotesInput) formClosingNotesInput.value = '';
        }
        legsContainer.innerHTML = ''; legCounter = 0;
        trade.legs.forEach((leg, index) => {
            const currentLegRow = addLeg(index);
            const actionInput = currentLegRow.querySelector('.leg-action-input');
            const actionButton = currentLegRow.querySelector(`.action-btn[data-action="${leg.action}"]`);
            if (actionInput) actionInput.value = leg.action; if (actionButton) actionButton.click();
            currentLegRow.querySelector('input[name*="[quantity]"]').value = leg.quantity;
            const optionTypeInput = currentLegRow.querySelector('.leg-option-type-input');
            const optionTypeButton = currentLegRow.querySelector(`.option-type-btn[data-type="${leg.option_type}"]`);
            if (optionTypeInput) optionTypeInput.value = leg.option_type; if (optionTypeButton) optionTypeButton.click();
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
        // ... (reset otros campos como antes) ...
        editingTradeId = null;
        if (editingTradeIdField) editingTradeIdField.value = '';
        if (strategyForm) strategyForm.reset(); // Esto resetea checkboxes a su estado HTML inicial (desmarcado)

        // Explicitly uncheck tag checkboxes and clear hidden input
        tagCheckboxes.forEach(checkbox => checkbox.checked = false);
        if (tradeTagsHiddenInput) tradeTagsHiddenInput.value = '';

        // ... (reset closingDetailsSection, legs, etc. como antes) ...
        if(closingDetailsSection) closingDetailsSection.style.display = 'none';
        if(tradeStatusSelect) tradeStatusSelect.value = 'Abierta';
        if(formActualPlInput) formActualPlInput.value = '';
        if(formClosingDateInput) { if (formClosingDateInput._flatpickr) formClosingDateInput._flatpickr.clear(); else formClosingDateInput.value = ''; }
        if(formClosingNotesInput) formClosingNotesInput.value = '';
        if(actualPlDiv) actualPlDiv.style.display = 'none';
        if(closingDateDiv) closingDateDiv.style.display = 'none';
        if(closingNotesDiv) closingNotesDiv.style.display = 'none';
        legsContainer.innerHTML = ''; legCounter = 0; addLeg(0);
        if (formSubmitButton) formSubmitButton.textContent = 'Guardar Estrategia';
        if (entryDateField) {
            const now = new Date();
            entryDateField.value = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}T${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        }
     }

    // --- Form Submission (Create/Update) (MODIFIED) ---
    if (strategyForm) {
        strategyForm.onsubmit = function(event) {
            event.preventDefault();
            // ... (validación de legs como antes) ...
            let firstValidationError = null;
            const legRows = legsContainer.querySelectorAll('.leg-row');
            if (legRows.length === 0) { firstValidationError = "Debe añadir al menos un leg."; }
            else {
                for (let i = 0; i < legRows.length; i++) {
                    const legRow = legRows[i]; const index = i;
                    const actionInput = legRow.querySelector('.leg-action-input');
                    const optionTypeInput = legRow.querySelector('.leg-option-type-input');
                    if (!actionInput.value) { firstValidationError = `Seleccione Acción para Leg ${index + 1}.`; break; }
                    if (!optionTypeInput.value) { firstValidationError = `Seleccione Tipo para Leg ${index + 1}.`; break; }
                }
            }
            if (!firstValidationError && editingTradeId && tradeStatusSelect && tradeStatusSelect.value === 'Cerrada') {
                if (!formActualPlInput || formActualPlInput.value === '' || isNaN(parseFloat(formActualPlInput.value))) {
                    firstValidationError = "P/L Real es obligatorio y numérico para cerrar.";
                }
                if (!formClosingDateInput || !formClosingDateInput.value) {
                     firstValidationError = "Fecha de Cierre es obligatoria para cerrar.";
                }
            }
            if (firstValidationError) { showPopup('Error de Validación', firstValidationError, 'error'); return; }

            // Consolidate selected tags into the hidden input
            const selectedTags = [];
            tagCheckboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    selectedTags.push(checkbox.value);
                }
            });
            if (tradeTagsHiddenInput) tradeTagsHiddenInput.value = selectedTags.join(',');

            const formData = new FormData(strategyForm);
            let url = '/api/save_strategy'; let method = 'POST';
            if (editingTradeId) { url = `/api/update_strategy/${editingTradeId}`; method = 'PUT'; }

            fetch(url, { method: method, body: formData })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showPopup('¡Éxito!', data.message || `Estrategia ${editingTradeId ? 'actualizada' : 'guardada'}.`, 'success');
                    resetFormToCreateMode();
                    fetchAndDisplayStrategies();
                } else {
                    showPopup('Error', data.message || `Error al ${editingTradeId ? 'actualizar' : 'guardar'}.`, 'error');
                }
            })
            .catch((error) => { showPopup('Error de Red', 'No se pudo conectar.', 'error'); });
        };
    }

    // --- P/L Chart Logic & Displaying Saved Strategies (MODIFIED renderStrategies) ---
    function getGenericStrategyPayoffData(legs, priceRangePoints = 100) { /* ... */
        if (!legs || legs.length === 0) { console.error("No legs for payoff."); return null; }
        let primaNetaTotalEfectiva = 0; const strikes = [];
        legs.forEach(leg => {
            const premium = parseFloat(leg.premium); const quantity = parseInt(leg.quantity, 10); const strike = parseFloat(leg.strike);
            if (!isNaN(strike)) strikes.push(strike);
            if (leg.action === 'BUY') primaNetaTotalEfectiva -= premium * quantity * OPTION_MULTIPLIER_JS;
            else if (leg.action === 'SELL') primaNetaTotalEfectiva += premium * quantity * OPTION_MULTIPLIER_JS;
        });
        const uniqueStrikes = [...new Set(strikes)].sort((a, b) => a - b);
        let minStrike = uniqueStrikes.length > 0 ? uniqueStrikes[0] : 100;
        let maxStrike = uniqueStrikes.length > 0 ? uniqueStrikes[uniqueStrikes.length - 1] : minStrike + 10;
        if (uniqueStrikes.length === 1) { const singleK = uniqueStrikes[0]; minStrike = singleK * 0.70; maxStrike = singleK * 1.30; }
        else if (uniqueStrikes.length > 1) { const rangeFactor = 0.20; minStrike = minStrike * (1 - rangeFactor); maxStrike = maxStrike * (1 + rangeFactor); }
        else { minStrike = 50; maxStrike = 150; }
        minStrike = Math.max(0.1, minStrike);
        const labels = []; const data = [];
        const evaluationPoints = [...new Set([...uniqueStrikes, minStrike, maxStrike])].sort((a,b) => a-b);
        let tempLabels = [...evaluationPoints];
        if (priceRangePoints > evaluationPoints.length) { /* ... (logic to add more points) ... */
            const numAdditionalPoints = priceRangePoints - evaluationPoints.length;
            if (evaluationPoints.length >=2) {
                for (let i = 0; i < evaluationPoints.length - 1; i++) {
                    const start = evaluationPoints[i]; const end = evaluationPoints[i+1];
                    const segmentLength = end - start; const overallRange = maxStrike - minStrike;
                    const pointsInSegment = Math.max(1, Math.round( (segmentLength / (overallRange||1) ) * numAdditionalPoints / ((evaluationPoints.length -1)||1) ) );
                    const stepInSegment = (end - start) / (pointsInSegment +1) ;
                    for (let j = 1; j <= pointsInSegment; j++) tempLabels.push(start + j * stepInSegment);
                }
            } else if (evaluationPoints.length === 1 && numAdditionalPoints > 0) {
                 const K = evaluationPoints[0]; const step = (K * 0.4) / numAdditionalPoints;
                 for(let i=1; i<= numAdditionalPoints/2; i++) tempLabels.push(K - i*step);
                 for(let i=1; i<= numAdditionalPoints/2; i++) tempLabels.push(K + i*step);
            }
        }
        const finalLabelsSorted = [...new Set(tempLabels)].sort((a,b) => a-b).filter(p => p >= minStrike && p <=maxStrike);
        if (finalLabelsSorted.length < 5 && uniqueStrikes.length > 0) { /* ... (fallback range) ... */
            const K = uniqueStrikes[0]; finalLabelsSorted.length = 0;
            for(let i=0; i<priceRangePoints; i++) {
                const price = (K * 0.7) + i * ( (K*1.3 - K*0.7) / ((priceRangePoints -1)||1) );
                finalLabelsSorted.push(price);
            }
        } else if (finalLabelsSorted.length < 2) { finalLabelsSorted.push(minStrike * 0.9, maxStrike * 1.1); }
        finalLabelsSorted.forEach(S_price => {
            labels.push(S_price.toFixed(2)); let payoffBrutoTotalEnS = 0;
            legs.forEach(leg => {
                const K_leg = parseFloat(leg.strike); const Q_leg = parseInt(leg.quantity, 10); let payoffLeg = 0;
                if (leg.option_type === 'CALL') payoffLeg = Math.max(0, S_price - K_leg) * Q_leg * OPTION_MULTIPLIER_JS;
                else if (leg.option_type === 'PUT') payoffLeg = Math.max(0, K_leg - S_price) * Q_leg * OPTION_MULTIPLIER_JS;
                if (leg.action === 'SELL') payoffLeg *= -1;
                payoffBrutoTotalEnS += payoffLeg;
            });
            const PL_NetoEnS = payoffBrutoTotalEnS + primaNetaTotalEfectiva;
            data.push(PL_NetoEnS.toFixed(2));
        });
        return { labels, data, strikes: uniqueStrikes.map(s => s.toFixed(2)), primaNetaTotalEfectiva: primaNetaTotalEfectiva.toFixed(2) };
    }
    function displayPnlChart(canvasId, chartPayload, strategyName, ticker) { /* ... (as before) ... */
        const canvas = document.getElementById(canvasId);
        if (!canvas || !chartPayload) return;
        const ctx = canvas.getContext('2d');
        if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
        const { labels, data } = chartPayload;
        const yValues = data.map(val => parseFloat(val));
        let yMin = Math.min(...yValues); let yMax = Math.max(...yValues);
        const yPadding = Math.abs(yMax - yMin) * 0.15 || Math.abs(yMin) * 0.2 || 10;
        yMin -= yPadding; yMax += yPadding;
        chartInstances[canvasId] = new Chart(ctx, {
            type: 'line', data: { labels: labels, datasets: [{ label: `P/L al Vencimiento`, data: data, borderColor: '#00aeff', backgroundColor: 'rgba(0, 174, 255, 0.1)', tension: 0, fill: true, pointRadius: 0, pointHitRadius: 10 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: `Perfil P/L: ${strategyName} en ${ticker}`, color: '#e0e0e0', font: { size: 14 } }, legend: { display: false }, tooltip: { mode: 'index', intersect: false, callbacks: { label: ctx => `${ctx.dataset.label}: $${parseFloat(ctx.raw).toFixed(2)}`, title: ctx => `Precio Subyacente: $${ctx[0].label}` }}},
            scales: { x: { title: { display: true, text: 'Precio Subyacente', color: '#c0c0c0', font:{size:12} }, ticks: { color: '#c0c0c0', font:{size:10}, maxRotation: 0, autoSkipPadding: 20 }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { title: { display: true, text: 'P/L ($)', color: '#c0c0c0', font:{size:12} }, min: yMin, max: yMax, ticks: { color: '#c0c0c0', font:{size:10}, callback: v => '$' + v.toFixed(0) }, grid: { color: 'rgba(255,255,255,0.1)', zeroLineColor: '#c0c0c0' } } } }
        });
    }
    function populateExpirationNav(strategies) { /* ... (as before) ... */
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
        try { // Added try-catch
            if (!savedStrategiesContainer) { console.warn("savedStrategiesContainer not found"); return; }
            savedStrategiesContainer.innerHTML = '';
            if (!strategiesToRender || strategiesToRender.length === 0) {
                savedStrategiesContainer.innerHTML = `<p>No hay estrategias para mostrar${(currentFilterDate && currentFilterDate !== 'Mostrar Todas' ? ` para ${new Date(currentFilterDate + '-01').toLocaleDateString('es-ES',{month:'long', year:'numeric'})}` : '.')}</p>`;
                return;
            }
            const groupedByMonth = strategiesToRender.reduce((acc, strategy) => { /* ... */
                let monthYear = 'Sin Vencimiento Asignado';
                if (strategy.primary_expiration_date_str) monthYear = strategy.primary_expiration_date_str.substring(0, 7);
                if (!acc[monthYear]) acc[monthYear] = [];
                acc[monthYear].push(strategy);
                return acc;
            }, {});
            const sortedMonths = Object.keys(groupedByMonth).sort((a,b) => { /* ... */
                if(a === 'Sin Vencimiento Asignado') return 1; if(b === 'Sin Vencimiento Asignado') return -1;
                return new Date(a + '-01') - new Date(b + '-01');
            });
            sortedMonths.forEach(monthYear => { /* ... */
                const monthDiv = document.createElement('div'); /* ... */
                monthDiv.classList.add('expiration-month-group');
                const monthHeader = document.createElement('h3');
                let headerText = monthYear;
                if (monthYear !== 'Sin Vencimiento Asignado') { try { headerText = new Date(monthYear + '-01').toLocaleDateString('es-ES', { year: 'numeric', month: 'long' }); } catch (e) {} }
                monthHeader.textContent = headerText; monthDiv.appendChild(monthHeader);

                groupedByMonth[monthYear].forEach(strategy => {
                    const card = document.createElement('div'); card.classList.add('strategy-card');
                    // ... (data formatting as before) ...
                    const entryDateLocale = strategy.entry_date ? new Date(strategy.entry_date).toLocaleString('es-ES') : 'N/A';
                    const maxRiskDisplay = strategy.max_risk !== null && strategy.max_risk !== undefined ? Number(strategy.max_risk).toFixed(2) : 'N/A';
                    const maxProfitDisplay = strategy.max_profit !== null && strategy.max_profit !== undefined ? Number(strategy.max_profit).toFixed(2) : 'N/A';
                    const actualPlDisplay = strategy.actual_pl !== null && strategy.actual_pl !== undefined ? Number(strategy.actual_pl).toFixed(2) : 'N/A';
                    const closingDateDisplay = strategy.closing_date ? new Date(strategy.closing_date).toLocaleDateString('es-ES') : 'N/A';
                    let statusBadge = `<span class="status-badge status-${strategy.status ? strategy.status.toLowerCase() : 'abierta'}">${strategy.status || 'Abierta'}</span>`;
                    let potentialPlRatio = calculatePotentialPlRatio(strategy.max_profit, strategy.max_risk);

                    // Tags display
                    let tagsHtml = 'N/A';
                    if (strategy.tags && typeof strategy.tags === 'string' && strategy.tags.trim() !== '') {
                        tagsHtml = strategy.tags.split(',')
                                     .map(tag => `<span class="tag-badge">${tag.trim()}</span>`)
                                     .join(' ');
                    }

                    card.innerHTML = `
                        <h4>${strategy.ticker || 'N/A'} - ${strategy.detected_strategy || 'N/A'} ${statusBadge}</h4>
                        <p><strong>Fecha Entrada:</strong> ${entryDateLocale}</p>
                        <p><strong>Criterios:</strong> ${tagsHtml}</p>
                        ${strategy.status === 'Cerrada' ? `
                            <p><strong>P/L Real:</strong> <span class="pl-value ${Number(strategy.actual_pl) >= 0 ? 'profit' : 'loss'}">${actualPlDisplay}</span></p>
                            <p><strong>Fecha Cierre:</strong> ${closingDateDisplay}</p>
                            ${strategy.closing_notes ? `<p><strong>Notas Cierre:</strong> ${strategy.closing_notes}</p>` : ''}
                        ` : `
                            <p><strong>Riesgo Máx:</strong> ${maxRiskDisplay}</p>
                            <p><strong>Beneficio Máx:</strong> ${maxProfitDisplay}</p>
                            <p><strong>Ratio P/L Potencial:</strong> ${potentialPlRatio}</p>
                        `}
                        <div class="card-actions">
                            <button class="view-details-btn" data-trade-id="${strategy.id}">Ver Detalles</button>
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
                            <h5>Gráfico P/L al Vencimiento:</h5>
                            <div class="pnl-chart-container"><canvas id="pnlChartCanvas_${strategy.id}"></canvas></div>
                        </div>`;
                    monthDiv.appendChild(card);
                    const detailsBtn = card.querySelector('.view-details-btn');
                    if(detailsBtn) { /* ... (event listener para detalles y gráfico) ... */
                        detailsBtn.addEventListener('click', function() {
                            const detailsDiv = card.querySelector('.strategy-details');
                            const tradeId = strategy.id; // Use strategy.id directly from closure
                            const currentStrategy = allFetchedStrategies.find(s => s.id === parseInt(tradeId));
                            if (detailsDiv) {
                                detailsDiv.classList.toggle('expanded');
                                this.textContent = detailsDiv.classList.contains('expanded') ? 'Ocultar Detalles' : 'Ver Detalles';
                                if (detailsDiv.classList.contains('expanded') && currentStrategy && currentStrategy.legs && currentStrategy.legs.length > 0) {
                                    const chartData = getGenericStrategyPayoffData(currentStrategy.legs);
                                    if (chartData) {
                                        displayPnlChart(`pnlChartCanvas_${currentStrategy.id}`, chartData, currentStrategy.detected_strategy, currentStrategy.ticker);
                                    } else {
                                        const canvas = document.getElementById(`pnlChartCanvas_${currentStrategy.id}`);
                                        if (canvas) { const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); }
                                        console.warn("No se pudieron generar datos del gráfico para:", currentStrategy);
                                    }
                                } else if (!detailsDiv.classList.contains('expanded') && chartInstances[`pnlChartCanvas_${currentStrategy.id}`]) {
                                    chartInstances[`pnlChartCanvas_${currentStrategy.id}`].destroy();
                                    delete chartInstances[`pnlChartCanvas_${currentStrategy.id}`];
                                }
                            }
                        });
                    }
                }); // Cierre de forEach strategy
                if (groupedByMonth[monthYear].length > 0) savedStrategiesContainer.appendChild(monthDiv);
            }); // Cierre de forEach monthYear
        } catch (error) {
            console.error("Error en renderStrategies:", error);
            if(savedStrategiesContainer) savedStrategiesContainer.innerHTML = "<p>Ocurrió un error al mostrar las estrategias. Revise la consola para más detalles.</p>";
            showPopup("Error de Interfaz", "Ocurrió un error al mostrar las estrategias.", "error");
        }
    }

    function fetchAndDisplayStrategies() { /* ... (sin cambios) ... */
        fetch('/api/get_strategies')
            .then(response => {
                console.log("Respuesta cruda del servidor (status):", response.status, response.statusText);
                const clonedResponse = response.clone();
                clonedResponse.text().then(text => { console.log("Respuesta cruda del servidor (texto):", text); });
                if (!response.ok) { throw new Error(`Error de red o servidor: ${response.status} ${response.statusText}`); }
                return response.json();
            })
            .then(data => {
                console.log("Datos JSON parseados recibidos del servidor:", data);
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
                    console.error("Error reportado por el API (data.success es false):", data.message);
                    if(savedStrategiesContainer) savedStrategiesContainer.innerHTML = `<p>Error al cargar estrategias: ${data.message || 'Respuesta no exitosa del servidor.'}</p>`;
                }
            })
            .catch(error => {
                console.error('Error en fetchAndDisplayStrategies (catch):', error);
                if(savedStrategiesContainer) savedStrategiesContainer.innerHTML = `<p>Error de red o al procesar la respuesta: ${error.message}</p>`;
            });
    }

    fetchAndDisplayStrategies();

    if (savedStrategiesContainer) { /* ... (sin cambios en listeners de edit, delete, image, close-trade) ... */
        savedStrategiesContainer.addEventListener('click', function(event) {
            const target = event.target;
            if (target.classList.contains('edit-strategy-btn')) {
                const tradeId = target.dataset.tradeId; populateFormForEdit(tradeId);
            } else if (target.classList.contains('delete-strategy-btn')) {
                const tradeId = target.dataset.tradeId;
                if (window.confirm(`¿Estás seguro de que quieres eliminar la estrategia ID ${tradeId}?`)) {
                    fetch(`/api/delete_strategy/${tradeId}`, { method: 'DELETE' })
                    .then(response => response.json()).then(data => {
                        if (data.success) { showPopup('Eliminada', data.message || 'Estrategia eliminada.', 'success'); fetchAndDisplayStrategies(); }
                        else { showPopup('Error', data.message || 'No se pudo eliminar.', 'error'); }
                    }).catch(error => showPopup('Error de Red', 'No se pudo conectar.', 'error'));
                }
            } else if (target.classList.contains('strategy-image-thumbnail')) {
                const fullImageUrl = target.getAttribute('data-fullimage-url');
                if (fullImageUrl) showImageModal(fullImageUrl); else console.error("data-fullimage-url attribute missing.");
            } else if (target.classList.contains('close-trade-btn')) {
                const tradeId = target.dataset.tradeId; showCloseTradeModal(tradeId);
            }
        });
    }
});
