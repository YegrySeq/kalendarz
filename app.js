document.addEventListener('DOMContentLoaded', () => {
    const calendarGrid = document.getElementById('calendar-grid');
    const monthLabel = document.getElementById('current-month-label');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const hourlyRateInput = document.getElementById('hourly-rate');
    const totalMoneyEl = document.getElementById('total-money');
    
    const bulkActionBar = document.getElementById('bulk-action-bar');
    const selectedCountEl = document.getElementById('selected-count');
    const bulkHoursInput = document.getElementById('bulk-hours');
    const applyBulkBtn = document.getElementById('apply-bulk');
    const cancelBulkBtn = document.getElementById('cancel-bulk');

    let currentDate = new Date();
    let selectedDays = new Set();
    
    // Inicjalizacja danych z localStorage
    let workData = JSON.parse(localStorage.getItem('workCalendarData')) || {};
    let hourlyRate = parseFloat(localStorage.getItem('hourlyRate')) || 30;
    hourlyRateInput.value = hourlyRate;

    const monthNames = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", 
                        "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];

    function saveData() {
        localStorage.setItem('workCalendarData', JSON.stringify(workData));
        localStorage.setItem('hourlyRate', hourlyRate);
        calculateTotal();
    }

    function getMonthKey(year, month) {
        return `${year}-${month.toString().padStart(2, '0')}`;
    }

    function renderCalendar() {
        calendarGrid.innerHTML = '';
        selectedDays.clear();
        updateBulkBar();
        
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        monthLabel.textContent = `${monthNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Dostosowanie do poniedziałku jako pierwszego dnia (0 = niedziela, 1 = pon)
        let emptyDays = firstDay === 0 ? 6 : firstDay - 1;

        const monthKey = getMonthKey(year, month);
        if (!workData[monthKey]) {
            workData[monthKey] = {};
        }

        // Puste komórki
        for (let i = 0; i < emptyDays; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'day-cell empty';
            calendarGrid.appendChild(emptyCell);
        }

        // Dni kalendarza
        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('div');
            cell.className = 'day-cell';
            cell.dataset.day = day;
            
            const data = workData[monthKey][day] || { hours: '', worked: false };
            
            if (data.worked) cell.classList.add('worked');

            cell.innerHTML = `
                <div class="day-header">
                    <span>${day}</span>
                </div>
                <input type="number" class="hours-input" placeholder="0 h" value="${data.hours}" min="0" step="0.5">
                <button class="worked-btn">${data.worked ? '✓ Gotowe' : 'Oznacz'}</button>
            `;

            // Obsługa kliknięcia (zaznaczanie)
            cell.addEventListener('click', (e) => {
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
                    toggleDaySelection(cell, day);
                }
            });

            // Obsługa zmiany godzin
            const input = cell.querySelector('.hours-input');
            input.addEventListener('input', (e) => {
                const val = e.target.value;
                if (!workData[monthKey][day]) workData[monthKey][day] = { hours: '', worked: false };
                workData[monthKey][day].hours = val;
                saveData();
            });

            // Obsługa przycisku "Gotowe"
            const btn = cell.querySelector('.worked-btn');
            btn.addEventListener('click', () => {
                if (!workData[monthKey][day]) workData[monthKey][day] = { hours: input.value, worked: false };
                workData[monthKey][day].worked = !workData[monthKey][day].worked;
                
                if (workData[monthKey][day].worked) {
                    cell.classList.add('worked');
                    btn.textContent = '✓ Gotowe';
                } else {
                    cell.classList.remove('worked');
                    btn.textContent = 'Oznacz';
                }
                saveData();
            });

            calendarGrid.appendChild(cell);
        }

        calculateTotal();
    }

    function toggleDaySelection(cell, day) {
        if (selectedDays.has(day)) {
            selectedDays.delete(day);
            cell.classList.remove('selected');
        } else {
            selectedDays.add(day);
            cell.classList.add('selected');
        }
        updateBulkBar();
    }

    function updateBulkBar() {
        if (selectedDays.size > 0) {
            bulkActionBar.classList.add('visible');
            selectedCountEl.textContent = `Zaznaczono: ${selectedDays.size} dni`;
        } else {
            bulkActionBar.classList.remove('visible');
        }
    }

    function calculateTotal() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthKey = getMonthKey(year, month);
        
        let totalHours = 0;
        const monthData = workData[monthKey] || {};
        
        for (const day in monthData) {
            if (monthData[day].worked && monthData[day].hours) {
                totalHours += parseFloat(monthData[day].hours);
            }
        }
        
        const total = totalHours * hourlyRate;
        totalMoneyEl.textContent = total.toFixed(2) + ' zł';
    }

    // Eventy nawigacji i ustawień
    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    hourlyRateInput.addEventListener('input', (e) => {
        hourlyRate = parseFloat(e.target.value) || 0;
        saveData();
    });

    const applyBulkDoneBtn = document.getElementById('apply-bulk-done');
    const presetBtns = document.querySelectorAll('.preset-btn');

    presetBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            bulkHoursInput.value = e.target.dataset.val;
        });
    });

    function applyBulkAction(markAsWorked = false) {
        const val = bulkHoursInput.value;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthKey = getMonthKey(year, month);

        selectedDays.forEach(day => {
            if (!workData[monthKey][day]) workData[monthKey][day] = { hours: '', worked: false };
            if (val !== '') workData[monthKey][day].hours = val;
            if (markAsWorked) workData[monthKey][day].worked = true;
            
            // Aktualizacja widoku bez pełnego renderCalendar by było szybciej
            const cell = document.querySelector(`.day-cell[data-day="${day}"]`);
            if (cell) {
                if (val !== '') cell.querySelector('.hours-input').value = val;
                if (markAsWorked) {
                    cell.classList.add('worked');
                    cell.querySelector('.worked-btn').textContent = '✓ Gotowe';
                }
                cell.classList.remove('selected');
            }
        });
        
        selectedDays.clear();
        bulkHoursInput.value = '';
        updateBulkBar();
        saveData();
    }

    applyBulkBtn.addEventListener('click', () => applyBulkAction(false));
    applyBulkDoneBtn.addEventListener('click', () => applyBulkAction(true));

    cancelBulkBtn.addEventListener('click', () => {
        document.querySelectorAll('.day-cell.selected').forEach(cell => cell.classList.remove('selected'));
        selectedDays.clear();
        updateBulkBar();
    });

    // PWA - Logika Instalacji i Service Worker
    const installBtn = document.getElementById('install-btn');
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
        // Zapobiegaj domyślnemu wyświetlaniu mini-infobara (na starszych przeglądarkach)
        e.preventDefault();
        // Zapisz zdarzenie, aby móc je wywołać po kliknięciu
        deferredPrompt = e;
        // Pokaż przycisk instalacji
        installBtn.classList.remove('hidden');
    });

    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            // Wyświetl właściwy prompt instalacji PWA
            deferredPrompt.prompt();
            // Czekaj na wybór użytkownika
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            // Ukryj przycisk po obsłużeniu
            deferredPrompt = null;
            installBtn.classList.add('hidden');
        }
    });

    window.addEventListener('appinstalled', () => {
        console.log('Aplikacja została pomyślnie zainstalowana');
        installBtn.classList.add('hidden');
    });

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('Service Worker zarejestrowany', reg))
                .catch(err => console.error('Błąd rejestracji SW:', err));
        });
    }

    // Eksport i Import Danych (Backup)
    const exportBtn = document.getElementById('export-btn');
    const importFileInput = document.getElementById('import-file');

    exportBtn.addEventListener('click', () => {
        const dataToExport = {
            workData: workData,
            hourlyRate: hourlyRate
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "kalendarz_pracy_backup.json");
        document.body.appendChild(downloadAnchorNode); // dla Firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (importedData && importedData.workData) {
                    workData = importedData.workData;
                    if (importedData.hourlyRate) hourlyRate = importedData.hourlyRate;
                    
                    hourlyRateInput.value = hourlyRate;
                    saveData();
                    renderCalendar();
                    alert("Dane zostały pomyślnie wgrane!");
                } else {
                    alert("Plik nie zawiera poprawnych danych kalendarza.");
                }
            } catch (err) {
                console.error(err);
                alert("Błąd podczas czytania pliku.");
            }
        };
        reader.readAsText(file);
        // Resetowanie inputa
        importFileInput.value = "";
    });

    // Initial render
    renderCalendar();
});
