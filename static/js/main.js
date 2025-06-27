document.addEventListener('DOMContentLoaded', function() {
    const entryDateField = document.getElementById('entryDate');
    if (entryDateField) {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        entryDateField.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    const legsContainer = document.getElementById('legsContainer');
    const addLegBtn = document.getElementById('addLegBtn');
    let legCounter = 1; // Starts at 1 because we have one leg (index 0) in HTML

    function initializeDatepicker(element) {
        if(element) {
            flatpickr(element, {
                dateFormat: "Y-m-d", // ISO format, matches input type="date" value
                altInput: true, // Show a user-friendly format but submit standard
                altFormat: "d M, Y", // Example: 23 Mar, 2024
                // Possible future: locale: "es" (requires importing locale file)
            });
        }
    }

    function updateLegNumbers() {
        const legRows = legsContainer.querySelectorAll('.leg-row');
        legRows.forEach((legRow, index) => {
            legRow.querySelector('h3').textContent = `Leg ${index + 1}`;
            const removeBtn = legRow.querySelector('.remove-leg-btn');
            if (removeBtn) {
                 removeBtn.style.display = legRows.length > 1 ? 'inline-block' : 'none';
            }
        });
    }

    function setupButtonToggle(legRow) {
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

    function addLeg() {
        const newLegRow = document.createElement('div');
        newLegRow.classList.add('leg-row');
        newLegRow.id = `leg-${legCounter}`;
        // Note: Name attributes use legCounter for uniqueness before form submission
        newLegRow.innerHTML = `
            <h3>Leg ${legCounter + 1}</h3>
            <div>
                <label>Acción:</label>
                <button type="button" class="action-btn buy" data-action="BUY">COMPRA (Buy to Open)</button>
                <button type="button" class="action-btn sell" data-action="SELL">VENTA (Sell to Open)</button>
                <input type="hidden" name="legs[${legCounter}][action]" class="leg-action-input" required>
            </div>
            <div>
                <label for="legs[${legCounter}][quantity]">Cantidad:</label>
                <input type="number" name="legs[${legCounter}][quantity]" min="1" value="1" required>
            </div>
            <div>
                <label>Tipo:</label>
                <button type="button" class="option-type-btn call" data-type="CALL">CALL</button>
                <button type="button" class="option-type-btn put" data-type="PUT">PUT</button>
                <input type="hidden" name="legs[${legCounter}][option_type]" class="leg-option-type-input" required>
            </div>
            <div>
                <label for="legs[${legCounter}][expirationDate]">Fecha de Vencimiento:</label>
                <input type="date" name="legs[${legCounter}][expirationDate]" required>
            </div>
            <div>
                <label for="legs[${legCounter}][strike]">Strike:</label>
                <input type="number" step="any" name="legs[${legCounter}][strike]" required>
            </div>
            <div>
                <label for="legs[${legCounter}][premium]">Prima (por contrato):</label>
                <input type="number" step="any" name="legs[${legCounter}][premium]" required>
            </div>
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
                updateLegNumbers();
            });
        }

        legCounter++;
        updateLegNumbers();
    }

    if (addLegBtn) {
        addLegBtn.addEventListener('click', addLeg);
    }

    const initialLeg = document.getElementById('leg-0');
    if (initialLeg) {
        setupButtonToggle(initialLeg);
        const initialDateInput = initialLeg.querySelector('input[type="date"]');
        if (initialDateInput) initializeDatepicker(initialDateInput);
    }
    updateLegNumbers();

    const strategyForm = document.getElementById('strategyForm');
    if (strategyForm) {
        strategyForm.addEventListener('submit', function(event) {
            event.preventDefault();

            let allLegsValid = true;
            const legRows = legsContainer.querySelectorAll('.leg-row');
            legRows.forEach((legRow, index) => {
                const actionInput = legRow.querySelector('.leg-action-input');
                const optionTypeInput = legRow.querySelector('.leg-option-type-input');
                if (!actionInput.value) {
                    alert(`Por favor seleccione una Acción (Compra/Venta) para el Leg ${index + 1}.`);
                    allLegsValid = false;
                }
                if (allLegsValid && !optionTypeInput.value) {
                    alert(`Por favor seleccione un Tipo (Call/Put) para el Leg ${index + 1}.`);
                    allLegsValid = false;
                }
            });

            if (!allLegsValid) {
                return;
            }

            const formData = new FormData(strategyForm);
            fetch('/api/save_strategy', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                console.log('Save Strategy Response:', data);
                alert(data.message || 'Estrategia procesada.');
                if (data.success) {
                    strategyForm.reset();
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = (now.getMonth() + 1).toString().padStart(2, '0');
                    const day = now.getDate().toString().padStart(2, '0');
                    const hours = now.getHours().toString().padStart(2, '0');
                    const minutes = now.getMinutes().toString().padStart(2, '0');
                    if(entryDateField) entryDateField.value = `${year}-${month}-${day}T${hours}:${minutes}`;

                    const firstLegRow = document.getElementById('leg-0');
                    if (firstLegRow) {
                        firstLegRow.querySelectorAll('.action-btn.selected, .option-type-btn.selected').forEach(btn => {
                            btn.classList.remove('selected');
                        });
                        const firstActionInput = firstLegRow.querySelector('.leg-action-input');
                        if(firstActionInput) firstActionInput.value = '';
                        const firstOptionTypeInput = firstLegRow.querySelector('.leg-option-type-input');
                        if(firstOptionTypeInput) firstOptionTypeInput.value = '';
                    }
                    const legRowsToRemove = legsContainer.querySelectorAll('.leg-row:not(#leg-0)');
                    legRowsToRemove.forEach(row => row.remove());
                    legCounter = 1;
                    updateLegNumbers();

                    fetchAndDisplayStrategies();
                }
            })
            .catch((error) => {
                console.error('Error saving strategy:', error);
                alert('Error al guardar la estrategia. Ver la consola para detalles.');
            });
        });
    }

    // --- Displaying Saved Strategies ---
    const savedStrategiesContainer = document.getElementById('savedStrategiesContainer');
    const expirationNav = document.getElementById('expiration-nav');
    let allFetchedStrategies = []; // Store all strategies to allow client-side filtering

    function populateExpirationNav(strategies) {
        if (!expirationNav) return;
        expirationNav.innerHTML = ''; // Clear current nav

        const expirationDates = strategies
            .map(s => s.primary_expiration_date_str ? s.primary_expiration_date_str.substring(0, 7) : 'Sin Vencimiento')
            .filter((value, index, self) => self.indexOf(value) === index); // Unique dates/tags

        expirationDates.sort((a, b) => {
            if (a === 'Sin Vencimiento') return 1;
            if (b === 'Sin Vencimiento') return -1;
            return new Date(a + '-01') - new Date(b + '-01');
        });

        const allLink = document.createElement('a');
        allLink.href = '#';
        allLink.textContent = 'Mostrar Todas';
        allLink.classList.add('expiration-link', 'active'); // Active by default
        allLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.expiration-link.active').forEach(el => el.classList.remove('active'));
            allLink.classList.add('active');
            renderStrategies(allFetchedStrategies); // Render all
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
                document.querySelectorAll('.expiration-link.active').forEach(el => el.classList.remove('active'));
                link.classList.add('active');
                const filtered = allFetchedStrategies.filter(s => {
                    const strategyExp = s.primary_expiration_date_str ? s.primary_expiration_date_str.substring(0, 7) : 'Sin Vencimiento';
                    return strategyExp === dateStr;
                });
                renderStrategies(filtered, dateStr); // Pass the filter date to render for context if needed
            });
            expirationNav.appendChild(link);
        });
    }

    // Modified renderStrategies to accept an optional filter (though grouping is now primary)
    function renderStrategies(strategiesToRender, currentFilterDate = null) {
        savedStrategiesContainer.innerHTML = '';

        if (!strategiesToRender || strategiesToRender.length === 0) {
            savedStrategiesContainer.innerHTML = '<p>No hay estrategias para mostrar' + (currentFilterDate ? ` para ${currentFilterDate}.` : '.') + '</p>';
            return;
        }

        // Grouping by month is still useful even if pre-filtered, to maintain structure
        const strategiesByMonth = strategiesToRender.reduce((acc, strategy) => {
            let monthYear = 'Sin Vencimiento Asignado';
            if (strategy.primary_expiration_date_str) {
                monthYear = strategy.primary_expiration_date_str.substring(0, 7);
            }
            if (!acc[monthYear]) {
                acc[monthYear] = [];
            }
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
            // If a filter is active, only show the group for that filter
            if (currentFilterDate && currentFilterDate !== 'Sin Vencimiento' && monthYear !== currentFilterDate && currentFilterDate !== 'Mostrar Todas') { // 'Mostrar Todas' is not a date
                 // If currentFilterDate is not null, it means we are filtering.
                 // The strategiesToRender are already filtered, so this check is redundant if filtering happens before calling render.
                 // However, if renderStrategies is called with all strategies and a filter, this is needed.
                 // The current logic: populateExpirationNav filters `allFetchedStrategies` THEN calls render. So this check is not strictly needed.
            }

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
                    <button class="view-details-btn">Ver Detalles</button>
                    <div class="strategy-details"> {/* REMOVED style="display:none;" */}
                        <h5>Detalle de Legs:</h5>
                        <table class="legs-table">
                            <thead>
                                <tr><th>Acción</th><th>Cant.</th><th>Tipo</th><th>Vencimiento</th><th>Strike</th><th>Prima</th></tr>
                            </thead>
                            <tbody>
                                ${strategy.legs.map(leg => `
                                    <tr>
                                        <td>${leg.action}</td>
                                        <td>${leg.quantity}</td>
                                        <td>${leg.option_type}</td>
                                        <td>${leg.expiration_date ? new Date(leg.expiration_date).toLocaleDateString('es-ES') : 'N/A'}</td>
                                        <td>${leg.strike}</td>
                                        <td>${Number(leg.premium).toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <h5>Notas:</h5>
                        <p>${strategy.notes || 'N/A'}</p>
                        <h5>Imágenes:</h5>
                        <div class="strategy-images">
                            ${(strategy.images && strategy.images.length > 0) ? strategy.images.map(img => `<a href="${img.url}" target="_blank"><img src="${img.url}" alt="${img.filename}" width="100" style="margin-right: 5px;"></a>`).join('') : 'N/A'}
                        </div>
                    </div>
                `;
                monthDiv.appendChild(card);

                const detailsBtn = card.querySelector('.view-details-btn');
                if(detailsBtn) {
                    detailsBtn.addEventListener('click', function() {
                        const detailsDiv = card.querySelector('.strategy-details');
                        if (detailsDiv) {
                            detailsDiv.classList.toggle('expanded');
                            // Adjust padding/margin if they were part of the transition from 0
                            if (detailsDiv.classList.contains('expanded')) {
                                // These are set by default, but if they were 0 when collapsed:
                                // detailsDiv.style.paddingTop = '15px';
                                // detailsDiv.style.marginTop = '15px';
                                this.textContent = 'Ocultar Detalles';
                            } else {
                                // If collapsing and padding/margin were part of transition:
                                // detailsDiv.style.paddingTop = '0';
                                // detailsDiv.style.marginTop = '0';
                                this.textContent = 'Ver Detalles';
                            }
                        }
                    });
                }
            });
            if (strategiesByMonth[monthYear].length > 0) { // Only append monthDiv if it has strategies
                 savedStrategiesContainer.appendChild(monthDiv);
            }
        });
    }

    function fetchAndDisplayStrategies() {
        fetch('/api/get_strategies')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    allFetchedStrategies = data.strategies; // Store all strategies
                    populateExpirationNav(allFetchedStrategies);
                    renderStrategies(allFetchedStrategies); // Initial render of all strategies
                } else {
                    if(savedStrategiesContainer) savedStrategiesContainer.innerHTML = `<p>Error al cargar estrategias: ${data.message}</p>`;
                    console.error('Error fetching strategies:', data.message);
                }
            })
            .catch(error => {
                if(savedStrategiesContainer) savedStrategiesContainer.innerHTML = `<p>Error de red al cargar estrategias.</p>`;
                console.error('Network error fetching strategies:', error);
            });
    }

    fetchAndDisplayStrategies(); // Initial load

    // --- Pop-up Modal Logic ---
    const popupModal = document.getElementById('popupModal');
    const closePopupBtn = document.getElementById('closePopupBtn');
    const popupIconEl = document.getElementById('popupIcon');
    const popupTitleEl = document.getElementById('popupTitle');
    const popupMessageEl = document.getElementById('popupMessage');

    function showPopup(title, message, type = 'success') {
        if (!popupModal || !popupTitleEl || !popupMessageEl || !popupIconEl) return;

        popupTitleEl.textContent = title;
        popupMessageEl.textContent = message;

        popupIconEl.innerHTML = ''; // Clear previous icon
        popupIconEl.className = 'popup-icon'; // Reset classes

        if (type === 'success') {
            popupIconEl.classList.add('success');
            popupIconEl.innerHTML = '&#10004;'; // Checkmark
        } else if (type === 'error') {
            popupIconEl.classList.add('error');
            popupIconEl.innerHTML = '&#10008;'; // X mark or similar
        }
        // Could add more types like 'warning', 'info'

        popupModal.style.display = 'flex'; // Use flex to center, then trigger transition
        setTimeout(() => { // Timeout to allow display:flex to apply before opacity transition
            popupModal.classList.add('visible');
        }, 20);
    }

    function hidePopup() {
        if (!popupModal) return;
        popupModal.classList.remove('visible');
        // The CSS transition will handle hiding it after opacity animation (visibility: hidden)
        // If issues, can use: setTimeout(() => { popupModal.style.display = 'none'; }, 300); // Match transition duration
    }

    if (closePopupBtn) {
        closePopupBtn.addEventListener('click', hidePopup);
    }
    if (popupModal) { // Close on overlay click
        popupModal.addEventListener('click', function(event) {
            if (event.target === popupModal) {
                hidePopup();
            }
        });
    }

    // Update form submission to use the new popup
    if (strategyForm) {
        // The previous event listener for submit is being overwritten here by re-defining it.
        // This is simpler than trying to find and modify the old one.
        strategyForm.onsubmit = function(event) { // Changed to onsubmit for simpler replacement
            event.preventDefault();

            let firstValidationError = null;
            const legRows = legsContainer.querySelectorAll('.leg-row');
            for (let i = 0; i < legRows.length; i++) { // Use a for loop to allow early exit
                const legRow = legRows[i];
                const index = i; // Or get index from an attribute if preferred
                const actionInput = legRow.querySelector('.leg-action-input');
                const optionTypeInput = legRow.querySelector('.leg-option-type-input');

                if (!actionInput.value) {
                    firstValidationError = `Por favor seleccione una Acción (Compra/Venta) para el Leg ${index + 1}.`;
                    break;
                }
                if (!optionTypeInput.value) {
                    firstValidationError = `Por favor seleccione un Tipo (Call/Put) para el Leg ${index + 1}.`;
                    break;
                }
            }

            if (firstValidationError) {
                showPopup('Error de Validación', firstValidationError, 'error');
                return;
            }

            const formData = new FormData(strategyForm);
            fetch('/api/save_strategy', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                console.log('Save Strategy Response:', data);
                if (data.success) {
                    showPopup('¡Éxito!', data.message || 'Estrategia guardada correctamente.', 'success');
                    strategyForm.reset();
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = (now.getMonth() + 1).toString().padStart(2, '0');
                    const day = now.getDate().toString().padStart(2, '0');
                    const hours = now.getHours().toString().padStart(2, '0');
                    const minutes = now.getMinutes().toString().padStart(2, '0');
                    if(entryDateField) entryDateField.value = `${year}-${month}-${day}T${hours}:${minutes}`;

                    const firstLegRow = document.getElementById('leg-0');
                    if (firstLegRow) {
                        firstLegRow.querySelectorAll('.action-btn.selected, .option-type-btn.selected').forEach(btn => {
                            btn.classList.remove('selected');
                        });
                        const firstActionInput = firstLegRow.querySelector('.leg-action-input');
                        if(firstActionInput) firstActionInput.value = '';
                        const firstOptionTypeInput = firstLegRow.querySelector('.leg-option-type-input');
                        if(firstOptionTypeInput) firstOptionTypeInput.value = '';
                        // Re-initialize datepicker for the first leg's date input
                        const initialDateInput = firstLegRow.querySelector('input[type="date"].flatpickr-input');
                        if (initialDateInput && initialDateInput._flatpickr) { // Check if flatpickr is initialized
                            initialDateInput._flatpickr.clear(); // Clear flatpickr date
                        } else if (initialDateInput) { // If not flatpickr, just clear value
                            initialDateInput.value = '';
                        }

                    }
                    const legRowsToRemove = legsContainer.querySelectorAll('.leg-row:not(#leg-0)');
                    legRowsToRemove.forEach(row => row.remove());
                    legCounter = 1;
                    updateLegNumbers();

                    fetchAndDisplayStrategies();
                } else {
                    showPopup('Error', data.message || 'Ocurrió un error al guardar la estrategia.', 'error');
                }
            })
            .catch((error) => {
                console.error('Error saving strategy:', error);
                showPopup('Error de Red', 'No se pudo conectar con el servidor. Inténtalo de nuevo.', 'error');
            });
        };
    }
});
