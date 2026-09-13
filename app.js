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

    const mainHeader = document.getElementById('main-header');
    const monthSelector = document.getElementById('month-selector');
    const yearSelector = document.getElementById('year-selector');
    const monthHeaderStats = document.getElementById('month-header-stats');
    const mainCalendarView = document.getElementById('main-calendar-view');
    const yearViewContainer = document.getElementById('year-view-container');
    const toggleViewBtn = document.getElementById('toggle-view-btn');
    
    const yearLabel = document.getElementById('current-year-label');
    const prevYearBtn = document.getElementById('prev-year');
    const nextYearBtn = document.getElementById('next-year');
    const yearGrid = document.getElementById('year-grid');
    const yearTotalMoneyEl = document.getElementById('year-total-money');
    const yearTotalHoursEl = document.getElementById('year-total-hours');

    // Notatki
    const noteDayHidden = document.getElementById('note-day-hidden');
    const selectedNoteDayLabel = document.getElementById('selected-note-day-label');
    const noteTextInput = document.getElementById('note-text');
    const addNoteBtn = document.getElementById('add-note-btn');
    const notesList = document.getElementById('notes-list');

    let currentYearView = new Date().getFullYear();
    let isYearView = false;
    let currentDate = new Date();
    let selectedDays = new Set();
    
    // Dark mode removed


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

        const today = new Date();
        const isCurrentMonth = (today.getFullYear() === year && today.getMonth() === month);

        // Dni kalendarza
        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('div');
            cell.className = 'day-cell';
            cell.dataset.day = day;
            
            const currentDateLoop = new Date(year, month, day);
            const dayOfWeek = currentDateLoop.getDay();
            
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                cell.classList.add('weekend');
            }
            
            if (isCurrentMonth && today.getDate() === day) {
                cell.classList.add('today');
            }
            
            const data = workData[monthKey][day] || { hours: '', worked: false };
            
            if (data.worked) cell.classList.add('worked');
            else if (data.hours && data.hours > 0) cell.classList.add('has-hours');

            cell.innerHTML = `
                <div class="check-toggle" style="display: ${data.hours && data.hours > 0 ? 'flex' : 'none'}">${data.worked ? '✓' : ''}</div>
                <div class="day-header">${day}</div>
                <div style="display: flex; align-items: center; justify-content: center; width: 100%;">
                    <input type="number" class="hours-input" placeholder="-" value="${data.hours}" min="0" step="0.5">
                    <span class="hours-suffix" style="display: ${data.hours ? 'inline' : 'none'}; font-size: 11px; font-weight: 600; color: var(--text-color); margin-left: 2px; pointer-events: none;">h</span>
                </div>
            `;
            
            if (data.note) {
                cell.innerHTML += `<div class="note-indicator"></div>`;
            }

            const checkToggle = cell.querySelector('.check-toggle');
            
            // Proste odfajkowanie po kliknięciu w kółko
            checkToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!workData[monthKey][day]) workData[monthKey][day] = { hours: '', worked: false };
                workData[monthKey][day].worked = !workData[monthKey][day].worked;
                
                if (workData[monthKey][day].worked) {
                    cell.classList.add('worked');
                    cell.classList.remove('has-hours');
                    checkToggle.textContent = '✓';
                } else {
                    cell.classList.remove('worked');
                    cell.classList.add('has-hours');
                    checkToggle.textContent = '';
                }
                saveData();
                calculateTotal();
            });

            // Kliknięcie w komórkę wybiera ją do notatki (lub zaznacza jeśli bulk aktywny)
            cell.addEventListener('click', (e) => {
                if (e.target.tagName === 'INPUT') return;
                
                if (selectedDays.size > 0) {
                    toggleDaySelection(cell, day);
                } else {
                    noteDayHidden.value = day;
                    selectedNoteDayLabel.textContent = `Wybrano: ${day} ${monthNames[month]}`;
                }
            });

            // Zaznaczanie wielu - długie przytrzymanie (mobilnie contextmenu)
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                toggleDaySelection(cell, day);
            });


            // Obsługa zmiany godzin
            const input = cell.querySelector('.hours-input');
            const suffix = cell.querySelector('.hours-suffix');
            input.addEventListener('input', (e) => {
                const val = e.target.value;
                if (!workData[monthKey][day]) workData[monthKey][day] = { hours: '', worked: false };
                workData[monthKey][day].hours = val;
                
                if (val) suffix.style.display = 'inline';
                else suffix.style.display = 'none';

                if (val && val > 0) {
                    checkToggle.style.display = 'flex';
                } else {
                    checkToggle.style.display = 'none';
                }

                // Automatyczna zmiana koloru przy wpisywaniu
                if (!workData[monthKey][day].worked) {
                    if (val && val > 0) cell.classList.add('has-hours');
                    else cell.classList.remove('has-hours');
                }
                
                saveData();
            });

            calendarGrid.appendChild(cell);
        }

        // Renderowanie listy notatek
        notesList.innerHTML = '';
        selectedNoteDayLabel.textContent = 'Zaznacz dzień na kalendarzu';

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        for (let day = 1; day <= daysInMonth; day++) {
            // Wyświetlanie notatki, jeśli istnieje
            const data = workData[monthKey][day];
            if (data && data.note) {
                const noteDiv = document.createElement('div');
                noteDiv.className = 'note-item';
                
                // Priorytety na podstawie daty dzisiejszej/jutrzejszej
                if (isCurrentMonth && day === today.getDate()) {
                    noteDiv.classList.add('note-today');
                } else if (today.getFullYear() === year && today.getMonth() === month && day === tomorrow.getDate()) {
                    noteDiv.classList.add('note-tomorrow');
                } else if (tomorrow.getMonth() !== today.getMonth() && today.getFullYear() === year && month === tomorrow.getMonth() && day === tomorrow.getDate()) {
                    // Jeśli jutro jest w następnym miesiącu i aktualnie patrzymy na następny miesiąc
                    noteDiv.classList.add('note-tomorrow');
                }

                noteDiv.innerHTML = `
                    <div><strong>${day} ${monthNames[month]}:</strong> ${data.note}</div>
                    <button class="delete-note" data-day="${day}">✕</button>
                `;
                
                noteDiv.querySelector('.delete-note').addEventListener('click', (e) => {
                    const d = e.target.dataset.day;
                    workData[monthKey][d].note = '';
                    saveData();
                    renderCalendar();
                });
                
                notesList.appendChild(noteDiv);
            }
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
        
        const totalHoursLabel = document.getElementById('total-hours-label');
        if (totalHoursLabel) {
            totalHoursLabel.textContent = `(${totalHours}h)`;
        }
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

    // Event notatek
    addNoteBtn.addEventListener('click', () => {
        const day = noteDayHidden.value;
        const text = noteTextInput.value.trim();
        if (text === '' || !day) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthKey = getMonthKey(year, month);

        if (!workData[monthKey][day]) {
            workData[monthKey][day] = { hours: '', worked: false };
        }
        workData[monthKey][day].note = text;
        
        noteTextInput.value = '';
        selectedNoteDayLabel.textContent = 'Zaznacz dzień na kalendarzu';
        saveData();
        renderCalendar();
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
                if (val !== '') {
                    cell.querySelector('.hours-input').value = val;
                    cell.querySelector('.hours-suffix').style.display = 'inline';
                    if (val > 0) cell.classList.add('has-hours');
                    else cell.classList.remove('has-hours');
                }
                if (markAsWorked) {
                    cell.classList.add('worked');
                    cell.classList.remove('has-hours');
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

    // --- Widok Roku ---
    function renderYearView() {
        yearGrid.innerHTML = '';
        yearLabel.textContent = currentYearView;
        let totalYearHours = 0;

        for (let m = 0; m < 12; m++) {
            const monthKey = getMonthKey(currentYearView, m);
            const monthData = workData[monthKey] || {};
            let monthHours = 0;

            for (const day in monthData) {
                if (monthData[day].worked && monthData[day].hours) {
                    monthHours += parseFloat(monthData[day].hours);
                }
            }

            totalYearHours += monthHours;
            const monthMoney = (monthHours * hourlyRate).toFixed(2);

            const card = document.createElement('div');
            card.className = 'month-card';
            
            const realToday = new Date();
            if (realToday.getFullYear() === currentYearView && realToday.getMonth() === m) {
                card.classList.add('current-month');
            }

            card.innerHTML = `
                <h3>${monthNames[m]}</h3>
                <div class="month-hours">${monthHours}h</div>
                <div class="month-money">${monthMoney} zł</div>
            `;
            
            // Po kliknięciu w miesiąc przejdź do widoku miesiąca
            card.addEventListener('click', () => {
                currentDate.setFullYear(currentYearView);
                currentDate.setMonth(m);
                toggleView(false);
            });

            yearGrid.appendChild(card);
        }

        yearTotalHoursEl.textContent = `(${totalYearHours}h)`;
        yearTotalMoneyEl.textContent = (totalYearHours * hourlyRate).toFixed(2) + ' zł';
    }

    function toggleView(forceYear = null) {
        if (forceYear !== null) {
            isYearView = forceYear;
        } else {
            isYearView = !isYearView;
        }

        if (isYearView) {
            currentYearView = currentDate.getFullYear();
            renderYearView();
            monthSelector.classList.add('hidden');
            yearSelector.classList.remove('hidden');
            monthHeaderStats.classList.add('hidden');
            mainCalendarView.classList.add('hidden');
            yearViewContainer.classList.remove('hidden');
            toggleViewBtn.textContent = '📅 Wróć';
        } else {
            renderCalendar();
            monthSelector.classList.remove('hidden');
            yearSelector.classList.add('hidden');
            monthHeaderStats.classList.remove('hidden');
            mainCalendarView.classList.remove('hidden');
            yearViewContainer.classList.add('hidden');
            toggleViewBtn.textContent = '📅 Widok Roku';
        }
    }

    toggleViewBtn.addEventListener('click', () => toggleView());

    prevYearBtn.addEventListener('click', () => {
        currentYearView--;
        renderYearView();
    });

    nextYearBtn.addEventListener('click', () => {
        currentYearView++;
        renderYearView();
    });

    // W saveData dodaj odświeżanie widoku rocznego, jeśli jest aktywny
    const originalSaveData = saveData;
    saveData = function() {
        originalSaveData();
        if (isYearView) renderYearView();
    }

    // Initial render
    renderCalendar();
});
