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
        if (typeof checkAndShowNotifications === 'function') {
            checkAndShowNotifications();
        }
        if (typeof scheduleAndroidNotificationTriggers === 'function') {
            scheduleAndroidNotificationTriggers();
        }
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
                const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
                const utcLoop = Date.UTC(year, month, day);
                const diffDaysLoop = Math.floor((utcLoop - utcToday) / (1000 * 60 * 60 * 24));
                
                if (diffDaysLoop === 0) {
                    cell.classList.add('cell-note-today');
                } else if (diffDaysLoop === 1) {
                    cell.classList.add('cell-note-tomorrow');
                    cell.innerHTML += `<div class="note-indicator"></div>`;
                } else {
                    cell.innerHTML += `<div class="note-indicator"></div>`;
                }
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

            // Kliknięcie i przytrzymanie (zaznaczanie wielu / notatki)
            let pressTimer = null;
            let isLongPress = false;

            function startPress(e) {
                if (e.target.tagName === 'INPUT' || e.target.classList.contains('check-toggle')) return;
                isLongPress = false;
                pressTimer = setTimeout(() => {
                    isLongPress = true;
                    toggleDaySelection(cell, day);
                    // Vibrate na wspieranych urządzeniach dla feedbacku
                    if (navigator.vibrate) navigator.vibrate(50);
                }, 500);
            }

            function cancelPress() {
                if (pressTimer !== null) {
                    clearTimeout(pressTimer);
                    pressTimer = null;
                }
            }

            cell.addEventListener('touchstart', startPress, { passive: true });
            cell.addEventListener('touchmove', cancelPress, { passive: true });
            cell.addEventListener('touchend', cancelPress);
            cell.addEventListener('touchcancel', cancelPress);
            
            // Mouse support for desktop testing
            cell.addEventListener('mousedown', startPress);
            cell.addEventListener('mousemove', cancelPress);
            cell.addEventListener('mouseup', cancelPress);
            cell.addEventListener('mouseleave', cancelPress);

            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (e.target.tagName !== 'INPUT' && !e.target.classList.contains('check-toggle')) {
                     // toggleDaySelection(cell, day); // Optional: keep for right-click on desktop
                }
            });

            // Główne kliknięcie (zabezpieczone przed odpaleniem po long-pressie)
            cell.addEventListener('click', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.classList.contains('check-toggle')) return;
                if (isLongPress) {
                    isLongPress = false;
                    return; // Zignoruj kliknięcie, jeśli to było długie przytrzymanie
                }
                
                if (selectedDays.size > 0) {
                    toggleDaySelection(cell, day);
                } else {
                    document.querySelectorAll('.day-cell.selected-for-note').forEach(c => c.classList.remove('selected-for-note'));
                    cell.classList.add('selected-for-note');
                    noteDayHidden.value = day;
                    selectedNoteDayLabel.textContent = `Wybrano: ${day} ${monthNames[month]}`;
                }
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

        const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
        const dayNamesFull = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];

        for (let day = 1; day <= daysInMonth; day++) {
            // Wyświetlanie notatki, jeśli istnieje
            const data = workData[monthKey][day];
            if (data && data.note) {
                const dateObj = new Date(year, month, day);
                const dayOfWeekName = dayNamesFull[dateObj.getDay()];
                const utcNote = Date.UTC(year, month, day);
                const diffDays = Math.floor((utcToday - utcNote) / (1000 * 60 * 60 * 24));

                // 2+ dni temu - znika (nie renderujemy z list)
                if (diffDays >= 2) continue;

                const noteDiv = document.createElement('div');
                noteDiv.className = 'note-item';
                
                let dayTag = `${day} ${monthNames[month]} (${dayOfWeekName})`;

                // Priorytety na podstawie różnicy dni lub przypięcia
                if (data.notePinned) {
                    noteDiv.classList.add('note-pinned');
                } else if (diffDays === 0) {
                    noteDiv.classList.add('note-today');
                    dayTag = `TO DZIŚ - ${dayOfWeekName} (${day} ${monthNames[month]}) ❗`;
                } else if (diffDays === -1) {
                    noteDiv.classList.add('note-tomorrow');
                    dayTag = `JUTRO - ${dayOfWeekName} (${day} ${monthNames[month]}) 🔔`;
                } else if (diffDays === 1) {
                    noteDiv.classList.add('note-yesterday');
                    dayTag = `WCZORAJ - ${dayOfWeekName} (${day} ${monthNames[month]})`;
                }

                noteDiv.innerHTML = `
                    <div class="note-content" style="cursor:pointer;" title="Kliknij, aby edytować"><strong>${dayTag}:</strong> <span class="note-text-span">${data.note}</span></div>
                    <div class="note-actions">
                        <button class="note-action-btn pin-btn ${data.notePinned ? 'active' : ''}" data-day="${day}">📌</button>
                        <button class="note-action-btn delete-btn" data-day="${day}">✕</button>
                    </div>
                `;
                
                noteDiv.querySelector('.delete-btn').addEventListener('click', (e) => {
                    const d = e.target.dataset.day;
                    workData[monthKey][d].note = '';
                    workData[monthKey][d].notePinned = false;
                    saveData();
                    renderCalendar();
                });

                noteDiv.querySelector('.pin-btn').addEventListener('click', (e) => {
                    const d = e.target.dataset.day;
                    workData[monthKey][d].notePinned = !workData[monthKey][d].notePinned;
                    saveData();
                    renderCalendar();
                });

                noteDiv.querySelector('.note-content').addEventListener('click', () => {
                    noteDayHidden.value = day;
                    selectedNoteDayLabel.textContent = `Edycja: ${day} ${monthNames[month]}`;
                    noteTextInput.value = data.note;
                    noteTextInput.focus();
                    document.querySelectorAll('.day-cell.selected-for-note').forEach(c => c.classList.remove('selected-for-note'));
                    const cell = document.querySelector(`.day-cell[data-day="${day}"]`);
                    if (cell) cell.classList.add('selected-for-note');
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

    const fillMonthBtn = document.getElementById('fill-month-btn');
    const fillMonthModal = document.getElementById('fill-month-modal');
    const confirmFillBtn = document.getElementById('confirm-fill-btn');
    const cancelFillBtn = document.getElementById('cancel-fill-btn');
    const fillMonthHoursInput = document.getElementById('fill-month-hours');
    
    if (fillMonthBtn && fillMonthModal) {
        fillMonthBtn.addEventListener('click', () => {
            fillMonthModal.classList.remove('hidden');
        });

        cancelFillBtn.addEventListener('click', () => {
            fillMonthModal.classList.add('hidden');
        });

        confirmFillBtn.addEventListener('click', () => {
            const h = parseFloat(fillMonthHoursInput.value);
            if (!isNaN(h) && h >= 0) {
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth();
                const monthKey = getMonthKey(year, month);
                if (!workData[monthKey]) workData[monthKey] = {};
                
                // Zbieramy wybrane dni tygodnia (0 - niedziela, 1 - poniedziałek, itd.)
                const selectedDaysOfWeek = Array.from(document.querySelectorAll('.fill-day-cb:checked')).map(cb => parseInt(cb.value));
                
                if (selectedDaysOfWeek.length === 0) {
                    alert("Wybierz przynajmniej jeden dzień tygodnia.");
                    return;
                }

                const daysInMonth = new Date(year, month + 1, 0).getDate();
                for (let d = 1; d <= daysInMonth; d++) {
                    const date = new Date(year, month, d);
                    const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
                    
                    if (selectedDaysOfWeek.includes(dayOfWeek)) {
                        if (!workData[monthKey][d]) workData[monthKey][d] = { hours: '', worked: false };
                        workData[monthKey][d].hours = h > 0 ? h : '';
                    }
                }
                saveData();
                renderCalendar();
                fillMonthModal.classList.add('hidden');
            } else {
                alert("Wpisz poprawną ilość godzin.");
            }
        });
    }

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
                const checkToggle = cell.querySelector('.check-toggle');
                if (val !== '') {
                    cell.querySelector('.hours-input').value = val;
                    cell.querySelector('.hours-suffix').style.display = 'inline';
                    
                    if (val > 0) {
                        cell.classList.add('has-hours');
                        if (checkToggle) checkToggle.style.display = 'flex';
                    } else {
                        cell.classList.remove('has-hours');
                        if (checkToggle) checkToggle.style.display = 'none';
                    }
                }
                if (markAsWorked) {
                    cell.classList.add('worked');
                    cell.classList.remove('has-hours');
                    if (checkToggle) checkToggle.textContent = '✓';
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

    // Sprawdź czy to urządzenie Apple (iOS)
    const isIos = () => {
        const userAgent = window.navigator.userAgent.toLowerCase();
        return /iphone|ipad|ipod/.test(userAgent);
    };
    
    // Sprawdź czy aplikacja jest już w trybie standalone (zainstalowana)
    const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);

    // Zawsze pokazujemy przycisk na telefonach (chyba że już zainstalowane na iOS)
    if (!isInStandaloneMode()) {
        installBtn.classList.remove('hidden');
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.classList.remove('hidden');
    });

    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            deferredPrompt = null;
        } else if (isIos()) {
            alert('Aby zainstalować na iPhonie:\n1. Kliknij ikonę udostępniania na dole ekranu (Kwadrat ze strzałką w górę)\n2. Wybierz "Do ekranu początkowego" (Add to Home Screen)');
        } else {
            alert('Aby zainstalować aplikację:\nKliknij menu przeglądarki (trzy kropki) i wybierz "Dodaj do ekranu głównego" lub "Zainstaluj aplikację".');
        }
    });

    window.addEventListener('appinstalled', () => {
        installBtn.classList.add('hidden');
    });

    const updateBtn = document.getElementById('update-btn');

    async function forcePWAUpdate() {
        if (!('serviceWorker' in navigator)) {
            window.location.reload(true);
            return;
        }

        try {
            // Wyczyść wszystkie pamięci podręczne (caches)
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(key => caches.delete(key)));
            }

            // Wyrejestruj Service Workery
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
                await registration.unregister();
            }

            // Przeładuj stronę
            window.location.reload(true);
        } catch (err) {
            console.error('Błąd wymuszania aktualizacji:', err);
            window.location.reload(true);
        }
    }

    if (updateBtn) {
        updateBtn.addEventListener('click', () => {
            if (confirm('Czy chcesz wymusić aktualizację aplikacji do najnowszej wersji?')) {
                forcePWAUpdate();
            }
        });
    }

    if ('serviceWorker' in navigator) {
        let refreshing = false;

        // Automatyczne odświeżenie strony po aktywacji nowego Service Workera
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });

        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => {
                    console.log('Service Worker zarejestrowany', reg);

                    // Sprawdź czy jest nowa wersja sw.js
                    reg.update();

                    // Sprawdzaj aktualizacje przy powrocie do aplikacji/karty
                    document.addEventListener('visibilitychange', () => {
                        if (document.visibilityState === 'visible') {
                            reg.update();
                        }
                    });

                    // Po wykryciu nowego SW wyślij SKIP_WAITING
                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                                }
                            });
                        }
                    });
                })
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
            toggleViewBtn.textContent = 'Wróć';
        } else {
            renderCalendar();
            monthSelector.classList.remove('hidden');
            yearSelector.classList.add('hidden');
            monthHeaderStats.classList.remove('hidden');
            mainCalendarView.classList.remove('hidden');
            yearViewContainer.classList.add('hidden');
            toggleViewBtn.textContent = 'Widok Roku';
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

    // Swipe logic for mobile
    let touchStartX = 0;
    let touchEndX = 0;

    mainCalendarView.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, {passive: true});

    mainCalendarView.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, {passive: true});

    function handleSwipe() {
        if (touchEndX < touchStartX - 50) {
            // Swipe left -> next month
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        }
        if (touchEndX > touchStartX + 50) {
            // Swipe right -> prev month
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        }
    }

    // --- POWIADOMIENIA ---
    function initNotifications() {
        if (!("Notification" in window)) return;
        
        document.body.addEventListener('click', () => {
            if (Notification.permission === "default") {
                Notification.requestPermission().then(() => {
                    checkAndShowNotifications();
                    scheduleAndroidNotificationTriggers();
                });
            }
        }, { once: true });
        
        checkAndShowNotifications();
        scheduleAndroidNotificationTriggers();
        
        // Sprawdzaj co minutę (dla otwartej aplikacji)
        setInterval(checkAndShowNotifications, 60000);
    }

    function scheduleAndroidNotificationTriggers() {
        if (!("Notification" in window) || Notification.permission !== "granted") return;
        if (!('serviceWorker' in navigator)) return;
        if (typeof TimestampTrigger === 'undefined') return;

        navigator.serviceWorker.ready.then(registration => {
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth();
            const monthKey = getMonthKey(year, month);
            const monthData = workData[monthKey] || {};

            const dayNamesFull = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];

            for (const dayStr in monthData) {
                const day = parseInt(dayStr);
                const data = monthData[day];
                if (data && data.note) {
                    const noteDate = new Date(year, month, day);
                    const dayOfWeekName = dayNamesFull[noteDate.getDay()];
                    
                    const todayNotifyTime = new Date(year, month, day, 4, 0, 0).getTime();
                    const tomorrowNotifyTime = new Date(year, month, day - 1, 18, 0, 0).getTime();

                    const now = Date.now();

                    if (todayNotifyTime > now) {
                        try {
                            registration.showNotification(`TO DZIŚ (${dayOfWeekName}) ❗`, {
                                body: data.note,
                                icon: 'icon.svg',
                                vibrate: [200, 100, 200],
                                tag: `note_today_${year}_${month}_${day}`,
                                showTrigger: new TimestampTrigger(todayNotifyTime)
                            });
                        } catch(e) {}
                    }

                    if (tomorrowNotifyTime > now) {
                        try {
                            registration.showNotification(`JUTRO (${dayOfWeekName}) 🔔`, {
                                body: data.note,
                                icon: 'icon.svg',
                                vibrate: [200, 100, 200],
                                tag: `note_tomorrow_${year}_${month}_${day}`,
                                showTrigger: new TimestampTrigger(tomorrowNotifyTime)
                            });
                        } catch(e) {}
                    }
                }
            }
        });
    }

    function checkAndShowNotifications() {
        if (!("Notification" in window) || Notification.permission !== "granted") return;
        
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const day = today.getDate();
        
        // Unikalny klucz dla dzisiejszej daty - maksymalnie 1 raz dziennie przy otwarciu!
        const dailyShownKey = `daily_shown_${year}_${month}_${day}`;
        if (localStorage.getItem(dailyShownKey)) {
            return; // Dziś już wyświetlono powiadomienie dziennikowe
        }

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dayNamesFull = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];

        let notificationFired = false;

        const checkDay = (date, isTomorrow) => {
            if (notificationFired) return;

            const dYear = date.getFullYear();
            const dMonth = date.getMonth();
            const dDay = date.getDate();
            const monthKey = getMonthKey(dYear, dMonth);
            const dayOfWeekName = dayNamesFull[date.getDay()];
            
            if (workData[monthKey] && workData[monthKey][dDay] && workData[monthKey][dDay].note) {
                const noteText = workData[monthKey][dDay].note;
                const title = isTomorrow ? `JUTRO (${dayOfWeekName}) 🔔` : `TO DZIŚ (${dayOfWeekName}) ❗`;
                
                if (navigator.serviceWorker && navigator.serviceWorker.ready) {
                    navigator.serviceWorker.ready.then(registration => {
                        try {
                            registration.showNotification(title, {
                                body: noteText,
                                icon: 'icon.svg',
                                vibrate: [200, 100, 200],
                                tag: 'daily-calendar-note'
                            }).catch(err => {
                                new Notification(title, { body: noteText, icon: 'icon.svg' });
                            });
                        } catch(e) {
                            new Notification(title, { body: noteText, icon: 'icon.svg' });
                        }
                    });
                } else {
                    new Notification(title, { body: noteText, icon: 'icon.svg' });
                }

                localStorage.setItem(dailyShownKey, 'true');
                notificationFired = true;
            }
        };

        checkDay(today, false);
        if (!notificationFired) {
            checkDay(tomorrow, true);
        }
    }

    initNotifications();

    // Initial render
    renderCalendar();
});
