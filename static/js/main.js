document.addEventListener('DOMContentLoaded', function() {
    // --- Global Variables & Element References ---
    let editingTradeId = null; // null for create mode, tradeId for edit mode
    const strategyForm = document.getElementById('strategyForm');
    const editingTradeIdField = document.getElementById('editingTradeIdField');
    const formSubmitButton = strategyForm ? strategyForm.querySelector('button[type="submit"]') : null;

    const entryDateField = document.getElementById('entryDate');
    const legsContainer = document.getElementById('legsContainer');
    const addLegBtn = document.getElementById('addLegBtn');
    let legCounter = 0; // Will be set to 1 initially if a leg is present

    const savedStrategiesContainer = document.getElementById('savedStrategiesContainer');
    const expirationNav = document.getElementById('expiration-nav');
    let allFetchedStrategies = [];

    const popupModal = document.getElementById('popupModal');
    const closePopupBtn = document.getElementById('closePopupBtn');
    const popupIconEl = document.getElementById('popupIcon');
    const popupTitleEl = document.getElementById('popupTitle');
    const popupMessageEl = document.getElementById('popupMessage');

    // --- Initialization ---
    if (entryDateField) { // Set initial entry date
        const now = new Date();
        entryDateField.value = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}T${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }

    if (legsContainer && legsContainer.children.length === 0) { // Ensure at least one leg row on init if empty
        addLeg(0); // Add the first leg with index 0
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
    function initializeDatepicker(element) {
        if(element && typeof flatpickr === 'function') {
            flatpickr(element, {
                dateFormat: "Y-m-d",
                altInput: true,
                altFormat: "d M, Y",
                // theme: "dark", // Already using a dark theme CSS from CDN
            });
        }
    }

    // --- Leg Management ---
    function updateLegNumbers() {
        const legRows = legsContainer.querySelectorAll('.leg-row');
        legRows.forEach((legRow, index) => {
            const h3 = legRow.querySelector('h3');
            if(h3) h3.textContent = `Leg ${index + 1}`;
            const removeBtn = legRow.querySelector('.remove-leg-btn');
            if (removeBtn) {
                 removeBtn.style.display = legRows.length > 1 ? 'inline-block' : 'none';
            }
        });
    }

    function setupButtonToggle(legRow) {
        // Action buttons
        const actionButtons = legRow.querySelectorAll('.action-btn');
        const actionInput = legRow.querySelector('.leg-action-input');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                actionButtons.forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
                if(actionInput) actionInput.value = this.dataset.action;
            });
        });
        // Option Type buttons
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

    function addLeg(indexToUse = null) {
        const currentIndex = (indexToUse !== null) ? indexToUse : legCounter;

        const newLegRow = document.createElement('div');
        newLegRow.classList.add('leg-row');
        newLegRow.id = `leg-${currentIndex}`;
        newLegRow.innerHTML = `
            <h3>Leg ${currentIndex + 1}</h3>
            <div>
                <label>Acción:</label>
                <button type="button" class="action-btn buy" data-action="BUY">COMPRA</button>
                <button type="button" class="action-btn sell" data-action="SELL">VENTA</button>
                <input type="hidden" name="legs[${currentIndex}][action]" class="leg-action-input" required>
            </div>
            <div><label>Cantidad:</label><input type="number" name="legs[${currentIndex}][quantity]" min="1" value="1" required></div>
            <div>
                <label>Tipo:</label>
                <button type="button" class="option-type-btn call" data-type="CALL">CALL</button>
                <button type="button" class="option-type-btn put" data-type="PUT">PUT</button>
                <input type="hidden" name="legs[${currentIndex}][option_type]" class="leg-option-type-input" required>
            </div>
            <div><label>Fecha de Vencimiento:</label><input type="date" name="legs[${currentIndex}][expirationDate]" required></div>
            <div><label>Strike:</label><input type="number" step="any" name="legs[${currentIndex}][strike]" required></div>
            <div><label>Prima:</label><input type="number" step="any" name="legs[${currentIndex}][premium]" required></div>
            <button type="button" class="remove-leg-btn">Eliminar Leg</button>
        `;
        legsContainer.appendChild(newLegRow);
        setupButtonToggle(newLegRow);
        const dateInput = newLegRow.querySelector('input[type="date"]');
        if (dateInput) initializeDatepicker(dateInput);

        const removeBtn = newLegRow.querySelector('.remove-leg-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                newLegRow.remove();
                // Re-index subsequent legs if necessary (more complex, backend handles non-sequential for now)
                updateLegNumbers();
                if(indexToUse === null && legCounter > 0) legCounter--; // Decrement if it was a manually added leg
            });
        }

        if (indexToUse === null) { // Only increment global counter if manually adding
            legCounter++;
        }
        updateLegNumbers();
        return newLegRow;
    }

    if (addLegBtn) {
        addLegBtn.addEventListener('click', () => addLeg(null));
    }

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

        legsContainer.innerHTML = '';
        legCounter = 0;

        trade.legs.forEach((leg, index) => {
            const currentLegRow = addLeg(index); // Use index, addLeg returns the row

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
        legCounter = trade.legs.length; // Set counter for next manual add
        if (trade.legs.length === 0) addLeg(0); // Ensure at least one leg if editing an empty one

        if (formSubmitButton) formSubmitButton.textContent = 'Actualizar Estrategia';
        document.getElementById('strategyForm').scrollIntoView({ behavior: 'smooth' });
    }

    function resetFormToCreateMode() {
        editingTradeId = null;
        if (editingTradeIdField) editingTradeIdField.value = '';
        if (strategyForm) strategyForm.reset();

        legsContainer.innerHTML = ''; // Clear all legs
        legCounter = 0;
        addLeg(0); // Add one fresh initial leg

        if (formSubmitButton) formSubmitButton.textContent = 'Guardar Estrategia';

        if (entryDateField) { // Reset entry date
            const now = new Date();
            entryDateField.value = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}T${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            if(entryDateField._flatpickr) entryDateField._flatpickr.setDate(entryDateField.value, true); // Update flatpickr too
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
            } else {
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

            if (firstValidationError) {
                showPopup('Error de Validación', firstValidationError, 'error');
                return;
            }

            const formData = new FormData(strategyForm);
            let url = '/api/save_strategy';
            let method = 'POST';

            if (editingTradeId) {
                url = `/api/update_strategy/${editingTradeId}`;
                method = 'PUT';
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
                console.error(`Error ${editingTradeId ? 'updating' : 'saving'} strategy:`, error);
                showPopup('Error de Red', 'No se pudo conectar con el servidor.', 'error');
            });
        };
    }

    // --- Pop-up Modal Logic ---
    function showPopup(title, message, type = 'success') {
        // ... (showPopup implementation from previous steps, ensure it's here)
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

    function hidePopup() {
        // ... (hidePopup implementation from previous steps, ensure it's here)
        if (!popupModal) return;
        popupModal.classList.remove('visible');
        setTimeout(() => {
            if (!popupModal.classList.contains('visible')) {
                popupModal.style.display = 'none';
            }
        }, 300);
    }

    if (closePopupBtn) closePopupBtn.addEventListener('click', hidePopup);
    if (popupModal) {
        popupModal.addEventListener('click', function(event) {
            if (event.target === popupModal) hidePopup();
        });
    }

    // --- Displaying Saved Strategies & Sidebar ---
    function populateExpirationNav(strategies) {
        // ... (implementation from previous steps) ...
        if (!expirationNav) return;
        expirationNav.innerHTML = '';
        const expirationDates = strategies
            .map(s => s.primary_expiration_date_str ? s.primary_expiration_date_str.substring(0, 7) : 'Sin Vencimiento')
            .filter((value, index, self) => self.indexOf(value) === index);
        expirationDates.sort((a, b) => {
            if (a === 'Sin Vencimiento') return 1;
            if (b === 'Sin Vencimiento') return -1;
            return new Date(a + '-01') - new Date(b + '-01');
        });
        const allLink = document.createElement('a');
        allLink.href = '#';
        allLink.textContent = 'Mostrar Todas';
        allLink.classList.add('expiration-link', 'active');
        allLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('#expiration-nav .expiration-link.active').forEach(el => el.classList.remove('active'));
            allLink.classList.add('active');
            renderStrategies(allFetchedStrategies);
        });
        expirationNav.appendChild(allLink);
        expirationDates.forEach(dateStr => {
            const link = document.createElement('a');
            link.href = '#';
            link.classList.add('expiration-link');
            if (dateStr === 'Sin Vencimiento') {
                link.textContent = 'Sin Vencimiento';
            } else {
                try {
                    link.textContent = new Date(dateStr + '-01').toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
                } catch (e) { link.textContent = dateStr; }
            }
            link.dataset.filterDate = dateStr;
            link.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('#expiration-nav .expiration-link.active').forEach(el => el.classList.remove('active'));
                link.classList.add('active');
                const filtered = allFetchedStrategies.filter(s => {
                    const strategyExp = s.primary_expiration_date_str ? s.primary_expiration_date_str.substring(0, 7) : 'Sin Vencimiento';
                    return strategyExp === dateStr;
                });
                renderStrategies(filtered, dateStr);
            });
            expirationNav.appendChild(link);
        });
    }

    function renderStrategies(strategiesToRender, currentFilterDate = null) {
        // ... (implementation from previous steps, including Edit button) ...
        savedStrategiesContainer.innerHTML = '';
        if (!strategiesToRender || strategiesToRender.length === 0) {
            savedStrategiesContainer.innerHTML = '<p>No hay estrategias para mostrar' + (currentFilterDate && currentFilterDate !== 'Mostrar Todas' ? ` para ${currentFilterDate}.` : '.') + '</p>';
            return;
        }
        const strategiesByMonth = strategiesToRender.reduce((acc, strategy) => {
            let monthYear = 'Sin Vencimiento Asignado';
            if (strategy.primary_expiration_date_str) monthYear = strategy.primary_expiration_date_str.substring(0, 7);
            if (!acc[monthYear]) acc[monthYear] = [];
            acc[monthYear].push(strategy);
            return acc;
        }, {});
        const sortedMonths = Object.keys(strategiesByMonth).sort((a, b) => {
            if (a === 'Sin Vencimiento Asignado') return 1;
            if (b === 'Sin Vencimiento Asignado') return -1;
            try { return new Date(a + '-01') - new Date(b + '-01'); }
            catch (e) { return 0; }
        });
        sortedMonths.forEach(monthYear => {
            const monthDiv = document.createElement('div');
            monthDiv.classList.add('expiration-month-group');
            const monthHeader = document.createElement('h3');
            let headerText = monthYear;
            if (monthYear !== 'Sin Vencimiento Asignado') {
                try {
                    headerText = new Date(monthYear + '-01').toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
                } catch (e) { /* keep monthYear as is */ }
            }
            monthHeader.textContent = headerText;
            monthDiv.appendChild(monthHeader);
            strategiesByMonth[monthYear].forEach(strategy => {
                const card = document.createElement('div');
                card.classList.add('strategy-card');
                const entryDateLocale = strategy.entry_date ? new Date(strategy.entry_date).toLocaleString('es-ES') : 'N/A';
                const maxRiskDisplay = strategy.max_risk !== null && strategy.max_risk !== undefined ? Number(strategy.max_risk).toFixed(2) : 'N/A';
                const maxProfitDisplay = strategy.max_profit !== null && strategy.max_profit !== undefined ? Number(strategy.max_profit).toFixed(2) : 'N/A';
                card.innerHTML = `
                    <h4>${strategy.ticker || 'N/A'} - ${strategy.detected_strategy || 'N/A'}</h4>
                    <p><strong>Fecha Entrada:</strong> ${entryDateLocale}</p>
                    <p><strong>Riesgo Máx:</strong> ${maxRiskDisplay}</p>
                    <p><strong>Beneficio Máx:</strong> ${maxProfitDisplay}</p>
                    <div class="card-actions">
                        <button class="view-details-btn">Ver Detalles</button>
                        <button class="edit-strategy-btn" data-trade-id="${strategy.id}">Editar</button>
                        <button class="delete-strategy-btn" data-trade-id="${strategy.id}">Eliminar</button>
                    </div>
                    <div class="strategy-details">
                        <h5>Detalle de Legs:</h5>
                        <table class="legs-table">
                            <thead><tr><th>Acción</th><th>Cant.</th><th>Tipo</th><th>Vencimiento</th><th>Strike</th><th>Prima</th></tr></thead>
                            <tbody>
                                ${strategy.legs.map(leg => `
                                    <tr><td>${leg.action}</td><td>${leg.quantity}</td><td>${leg.option_type}</td><td>${leg.expiration_date ? new Date(leg.expiration_date).toLocaleDateString('es-ES') : 'N/A'}</td><td>${leg.strike}</td><td>${Number(leg.premium).toFixed(2)}</td></tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <h5>Notas:</h5><p>${strategy.notes || 'N/A'}</p>
                        <h5>Imágenes:</h5><div class="strategy-images">${(strategy.images && strategy.images.length > 0) ? strategy.images.map(img => `<a href="${img.url}" target="_blank"><img src="${img.url}" alt="${img.filename}" width="100"></a>`).join('') : 'N/A'}</div>
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
            if (strategiesByMonth[monthYear].length > 0) savedStrategiesContainer.appendChild(monthDiv);
        });
    }

    function fetchAndDisplayStrategies() {
        // ... (implementation from previous steps, including updating active filter correctly) ...
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
                        const filtered = allFetchedStrategies.filter(s => {
                             const strategyExp = s.primary_expiration_date_str ? s.primary_expiration_date_str.substring(0, 7) : 'Sin Vencimiento';
                             return strategyExp === filterDate;
                        });
                        renderStrategies(filtered, filterDate);
                    } else { // "Mostrar Todas" or no filter initially
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

    // Initial Load and Event Listeners for Edit/Delete using event delegation
    fetchAndDisplayStrategies();

    if (savedStrategiesContainer) {
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
            }
        });
    }
});
