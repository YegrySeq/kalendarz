document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggle-btn');
    const statusBorder = document.getElementById('status-border');
    const urlInput = document.getElementById('url-input');
    const goBtn = document.getElementById('go-btn');
    const mangaImage = document.getElementById('manga-image');
    const infoText = document.getElementById('info-text');
    const overlaysContainer = document.getElementById('overlays');
    const loadingIndicator = document.getElementById('loading');

    let isActive = false;

    // Obsługa przycisku Start/Stop
    toggleBtn.addEventListener('click', async () => {
        isActive = !isActive;
        if (isActive) {
            toggleBtn.textContent = '■ Stop';
            toggleBtn.classList.remove('start');
            toggleBtn.classList.add('stop');
            statusBorder.classList.remove('inactive');
            statusBorder.classList.add('active');
            
            // Jeśli mamy już załadowany obraz, przetłumacz go
            if (mangaImage.src && mangaImage.src !== window.location.href) {
                await translateImage();
            }
        } else {
            toggleBtn.textContent = '▶ Start';
            toggleBtn.classList.remove('stop');
            toggleBtn.classList.add('start');
            statusBorder.classList.remove('active');
            statusBorder.classList.add('inactive');
            overlaysContainer.innerHTML = ''; // Usuń tłumaczenia
        }
    });

    // Ładowanie obrazka
    goBtn.addEventListener('click', () => {
        const url = urlInput.value.trim();
        if (url) {
            // Używamy corsproxy, aby obejść blokady CORS dla obrazków
            const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
            mangaImage.src = proxyUrl;
            mangaImage.style.display = 'block';
            infoText.style.display = 'none';
            overlaysContainer.innerHTML = ''; // czyszczenie nakładek

            if (isActive) {
                mangaImage.onload = () => {
                    translateImage();
                };
            }
        }
    });

    async function translateImage() {
        loadingIndicator.style.display = 'block';
        overlaysContainer.innerHTML = '';

        try {
            // Użycie Tesseract.js do rozpoznania tekstu
            // Język domyślny: angielski (eng). Do japońskiego należałoby zmienić na 'jpn' lub wykrywać.
            const result = await Tesseract.recognize(
                mangaImage,
                'eng',
                { logger: m => console.log(m) }
            );

            const blocks = result.data.blocks;
            
            for (const block of blocks) {
                if (block.text.trim().length < 2) continue; // ignoruj pojedyncze śmieciowe znaki

                // Tłumaczenie tekstu bloku
                const translatedText = await fetchTranslation(block.text);

                // Skalowanie bounding boxa z oryginalnego obrazka na wyświetlany rozmiar
                const scaleX = mangaImage.clientWidth / mangaImage.naturalWidth;
                const scaleY = mangaImage.clientHeight / mangaImage.naturalHeight;

                const { x0, y0, x1, y1 } = block.bbox;
                const left = x0 * scaleX;
                const top = y0 * scaleY;
                const width = (x1 - x0) * scaleX;
                const height = (y1 - y0) * scaleY;

                // Utworzenie nakładki
                createOverlay(translatedText, left, top, width, height);
            }
        } catch (error) {
            console.error('Błąd OCR:', error);
            alert('Wystąpił błąd podczas rozpoznawania tekstu.');
        } finally {
            loadingIndicator.style.display = 'none';
        }
    }

    async function fetchTranslation(text) {
        try {
            // Darmowe API MyMemory (limitowane, ale wystarczające do prototypu)
            const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|pl`);
            const data = await res.json();
            return data.responseData.translatedText;
        } catch (e) {
            console.error('Błąd tłumaczenia:', e);
            return text; // Zwróć oryginał w razie błędu
        }
    }

    function createOverlay(text, x, y, w, h) {
        const div = document.createElement('div');
        div.className = 'text-overlay';
        div.style.left = `${x}px`;
        div.style.top = `${y}px`;
        div.style.width = `${w}px`;
        div.style.height = `${h}px`;
        div.textContent = text;
        overlaysContainer.appendChild(div);
    }
});

// Rejestracja Service Workera
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker zarejestrowany', reg))
            .catch(err => console.log('Błąd rejestracji SW', err));
    });
}
