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
    let legCounter = 1;

    function updateLegNumbers() {
        const legRows = legsContainer.querySelectorAll('.leg-row');
        legRows.forEach((legRow, index) => {
            legRow.querySelector('h3').textContent = `Leg ${index + 1}`;
            const removeBtn = legRow.querySelector('.remove-leg-btn');
            if (removeBtn) { // Ensure button exists
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
                if (allLegsValid && !optionTypeInput.value) { // Check only if previous was valid
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
                    // Reset entry date
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = (now.getMonth() + 1).toString().padStart(2, '0');
                    const day = now.getDate().toString().padStart(2, '0');
                    const hours = now.getHours().toString().padStart(2, '0');
                    const minutes = now.getMinutes().toString().padStart(2, '0');
                    if(entryDateField) entryDateField.value = `${year}-${month}-${day}T${hours}:${minutes}`;

                    // Clear selected buttons in the first leg
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
                    // Remove extra legs, leaving only the first one
                    const legRowsToRemove = legsContainer.querySelectorAll('.leg-row:not(#leg-0)');
                    legRowsToRemove.forEach(row => row.remove());
                    legCounter = 1; // Reset counter
                    updateLegNumbers(); // Update numbering and remove button visibility

                    fetchAndDisplayStrategies(); // Refresh the list of strategies
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

    function renderStrategies(strategies) {
        savedStrategiesContainer.innerHTML = '';

        if (!strategies || strategies.length === 0) {
            savedStrategiesContainer.innerHTML = '<p>Aún no hay estrategias guardadas.</p>';
            return;
        }

        const strategiesByMonth = strategies.reduce((acc, strategy) => {
            let monthYear = 'Sin Vencimiento Asignado'; // Default if no primary_expiration_date_str
            if (strategy.primary_expiration_date_str) {
                monthYear = strategy.primary_expiration_date_str.substring(0, 7); // YYYY-MM
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
            try { // Handle potential invalid date strings for sorting
                return new Date(a + '-01') - new Date(b + '-01');
            } catch (e) { return 0; }
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
                    <button class="view-details-btn">Ver Detalles</button>
                    <div class="strategy-details" style="display:none;">
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
                            detailsDiv.style.display = detailsDiv.style.display === 'none' ? 'block' : 'none';
                            this.textContent = detailsDiv.style.display === 'none' ? 'Ver Detalles' : 'Ocultar Detalles';
                        }
                    });
                }
            });
            savedStrategiesContainer.appendChild(monthDiv);
        });
    }

    function fetchAndDisplayStrategies() {
        fetch('/api/get_strategies')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    renderStrategies(data.strategies);
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
});
