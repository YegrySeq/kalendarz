document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggle-btn');
    const statusBorder = document.getElementById('status-border');
    const urlInput = document.getElementById('url-input');
    const goBtn = document.getElementById('go-btn');
    const readerView = document.getElementById('manga-reader-view');
    const infoText = document.getElementById('info-text');
    const loadingIndicator = document.getElementById('loading');

    let isActive = false;
    let observer = null;

    // Inicjalizacja Intersection Observer do śledzenia widocznych stron
    function setupObserver() {
        if (observer) observer.disconnect();
        
        observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && isActive) {
                    const wrapper = entry.target;
                    // Jeśli nie było jeszcze tłumaczone
                    if (!wrapper.dataset.translated && !wrapper.dataset.translating) {
                        translatePage(wrapper);
                    }
                }
            });
        }, { threshold: 0.1 });
        
        const wrappers = document.querySelectorAll('.page-wrapper');
        wrappers.forEach(w => observer.observe(w));
    }

    // Obsługa przycisku Start/Stop
    toggleBtn.addEventListener('click', () => {
        isActive = !isActive;
        if (isActive) {
            toggleBtn.textContent = '■ Stop';
            toggleBtn.classList.remove('start');
            toggleBtn.classList.add('stop');
            statusBorder.classList.remove('inactive');
            statusBorder.classList.add('active');
            
            // Wymuś sprawdzenie widocznych stron po włączeniu
            const wrappers = document.querySelectorAll('.page-wrapper');
            wrappers.forEach(w => {
                const rect = w.getBoundingClientRect();
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                    if (!w.dataset.translated && !w.dataset.translating) {
                        translatePage(w);
                    }
                }
            });

        } else {
            toggleBtn.textContent = '▶ Start';
            toggleBtn.classList.remove('stop');
            toggleBtn.classList.add('start');
            statusBorder.classList.remove('active');
            statusBorder.classList.add('inactive');
            
            // Opcjonalnie: można ukryć tłumaczenia
            // document.querySelectorAll('.overlays-container').forEach(c => c.innerHTML = '');
            // document.querySelectorAll('.page-wrapper').forEach(w => w.dataset.translated = '');
        }
    });

    // Ładowanie adresu URL (Strony WWW)
    goBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) return;

        infoText.style.display = 'none';
        readerView.innerHTML = '';
        loadingIndicator.style.display = 'block';
        loadingIndicator.textContent = 'Pobieranie strony...';

        try {
            // Używamy corsproxy, aby pobrać HTML strony (omijając CORS)
            const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
            const response = await fetch(proxyUrl);
            const htmlString = await response.text();

            // Parsowanie HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, 'text/html');

            // Szukanie obrazków (szukamy img, a także popularnych atrybutów lazy loading)
            const images = doc.querySelectorAll('img');
            const imageUrls = [];

            images.forEach(img => {
                let src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('src');
                if (src && !src.startsWith('data:image')) { // Ignoruj małe inline base64 (często ikony)
                    // Napraw względne URL-e
                    if (src.startsWith('//')) {
                        src = 'https:' + src;
                    } else if (src.startsWith('/')) {
                        const urlObj = new URL(url);
                        src = urlObj.origin + src;
                    } else if (!src.startsWith('http')) {
                        const urlObj = new URL(url);
                        src = urlObj.origin + '/' + src;
                    }
                    imageUrls.push(src);
                }
            });

            // Filtrowanie - często obrazki mangi to te największe lub w serii, ale w prostym PWA wyświetlimy po prostu wszystkie większe obrazki, użytkownik sam przeskroluje.
            // Generowanie DOM dla obrazków
            imageUrls.forEach(src => {
                const wrapper = document.createElement('div');
                wrapper.className = 'page-wrapper';

                const img = document.createElement('img');
                img.className = 'manga-page';
                img.crossOrigin = 'anonymous'; // Ważne dla Tesseract.js (dostęp do canvas)
                
                // Przepuszczamy obrazki również przez proxy, jeśli docelowy serwer blokuje hotlinking
                img.src = 'https://corsproxy.io/?' + encodeURIComponent(src);

                const overlays = document.createElement('div');
                overlays.className = 'overlays-container';

                wrapper.appendChild(img);
                wrapper.appendChild(overlays);
                readerView.appendChild(wrapper);
            });

            setupObserver();

        } catch (error) {
            console.error('Błąd pobierania strony:', error);
            alert('Nie udało się pobrać strony. Spróbuj innego linku lub odśwież.');
        } finally {
            loadingIndicator.style.display = 'none';
        }
    });

    async function translatePage(wrapper) {
        wrapper.dataset.translating = "true";
        const img = wrapper.querySelector('img');
        const overlaysContainer = wrapper.querySelector('.overlays-container');
        
        loadingIndicator.style.display = 'block';
        loadingIndicator.textContent = 'Przetwarzanie OCR...';

        try {
            // Tesseract.js
            const result = await Tesseract.recognize(
                img,
                'eng', // Język domyślny, docelowo można dodać wybór
                { logger: m => console.log(m) }
            );

            const blocks = result.data.blocks || [];
            
            for (const block of blocks) {
                if (block.text.trim().length < 2) continue;

                // Tłumaczenie
                const translatedText = await fetchTranslation(block.text);

                // Skalowanie pozycji z oryginału na aktualny wymiar obrazka na ekranie
                const scaleX = img.clientWidth / img.naturalWidth;
                const scaleY = img.clientHeight / img.naturalHeight;

                const { x0, y0, x1, y1 } = block.bbox;
                const left = x0 * scaleX;
                const top = y0 * scaleY;
                const width = (x1 - x0) * scaleX;
                const height = (y1 - y0) * scaleY;

                const div = document.createElement('div');
                div.className = 'text-overlay';
                div.style.left = `${left}px`;
                div.style.top = `${top}px`;
                div.style.width = `${width}px`;
                div.style.height = `${height}px`;
                div.textContent = translatedText;
                overlaysContainer.appendChild(div);
            }
            
            wrapper.dataset.translated = "true";

        } catch (error) {
            console.error('Błąd OCR dla strony:', error);
        } finally {
            delete wrapper.dataset.translating;
            loadingIndicator.style.display = 'none';
        }
    }

    async function fetchTranslation(text) {
        try {
            const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|pl`);
            const data = await res.json();
            return data.responseData.translatedText;
        } catch (e) {
            console.error('Błąd tłumaczenia:', e);
            return text;
        }
    }
});
