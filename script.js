document.addEventListener('DOMContentLoaded', () => {

    const searchInput = document.getElementById('searchInput');
    const noResults = document.getElementById('no-results');
    const themeToggle = document.getElementById('themeToggle');
    const htmlEl = document.documentElement;


    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxCategory = document.getElementById('lightbox-category');
    const lightboxCounter = document.getElementById('lightbox-counter');
    const closeBtn = document.getElementById('lightbox-close');
    const downloadBtn = document.getElementById('lightbox-download');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');


    let currentSearch = '';
    let visibleItems = [];
    let currentImageIndex = 0;


    const observerOptions = {
        root: null,
        rootMargin: '50px',
        threshold: 0.1
    };

    const galleryObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                setTimeout(() => {
                    entry.target.style.transitionDelay = '0s';
                }, 700);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    function observeItems() {
        const items = document.querySelectorAll('.gallery-item:not(.hidden)');
        let delayIndex = 0;
        items.forEach(item => {
            if (!item.classList.contains('is-visible')) {
                item.style.transitionDelay = `${(delayIndex % 4) * 0.1}s`;
                galleryObserver.observe(item);
                delayIndex++;
            }
        });
    }

    function initGallery() {
        const items = document.querySelectorAll('.gallery-item');


        items.forEach(item => {
            item.addEventListener('click', () => {
                openLightbox(item);
            });
        });

        updateVisibleItems();
        observeItems();
    }

    let fetchOnlineTimeout;


    function applyFilters() {
        const items = document.querySelectorAll('.gallery-item:not(.online-item)');
        let visibleCount = 0;
        const searchLower = currentSearch.toLowerCase().trim();

        items.forEach(item => {
            const category = item.dataset.category.toLowerCase();
            const title = item.dataset.title.toLowerCase();

            const matchesSearch = title.includes(searchLower) || category.includes(searchLower);

            if (matchesSearch) {
                item.classList.remove('hidden');
                item.classList.remove('is-visible');
                visibleCount++;
            } else {
                item.classList.add('hidden');
                item.classList.remove('is-visible');
            }
        });


        clearOnlineImages();
        clearTimeout(fetchOnlineTimeout);


        if (visibleCount === 0) {
            if (searchLower !== '') {
                noResults.classList.add('hidden');
                document.getElementById('online-loader').classList.remove('hidden');

                fetchOnlineTimeout = setTimeout(() => {
                    fetchOnlineImages(searchLower);
                }, 800);
            } else {
                noResults.classList.remove('hidden');
                document.getElementById('online-loader').classList.add('hidden');
            }
        } else {
            noResults.classList.add('hidden');
            document.getElementById('online-loader').classList.add('hidden');
        }

        updateVisibleItems();
        observeItems();
    }

    function clearOnlineImages() {
        const onlineItems = document.querySelectorAll('.online-item');
        onlineItems.forEach(item => item.remove());
    }

    async function fetchOnlineImages(query) {
        const galleryGrid = document.getElementById('galleryGrid');
        const loader = document.getElementById('online-loader');
        const noResults = document.getElementById('no-results');

        try {

            const encodedQuery = encodeURIComponent(query);
            const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodedQuery}&gsrlimit=15&prop=pageimages&piprop=thumbnail&pithumbsize=800&format=json&origin=*`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            loader.classList.add('hidden');

            if (!data || !data.query || !data.query.pages) {
                noResults.classList.remove('hidden');
                noResults.querySelector('h2').textContent = 'No images found online';
                noResults.querySelector('p').textContent = `We couldn't find any exact images for "${query}".`;
                return;
            }

            const pages = Object.values(data.query.pages);
            const pagesWithImages = pages.filter(page => page.thumbnail && page.thumbnail.source);

            if (pagesWithImages.length === 0) {
                noResults.classList.remove('hidden');
                noResults.querySelector('h2').textContent = 'No images found online';
                noResults.querySelector('p').textContent = `We couldn't find any exact images for "${query}".`;
                return;
            }


            pagesWithImages.slice(0, 8).forEach((page, i) => {
                const figure = document.createElement('figure');
                figure.className = 'gallery-item online-item';
                figure.dataset.category = 'Wikipedia Result';
                figure.dataset.title = page.title;

                const imgSrc = page.thumbnail.source;

                figure.innerHTML = `
                    <img src="${imgSrc}" alt="${page.title}" loading="lazy">
                    <figcaption class="item-info">
                        <h3 class="item-title">${page.title}</h3>
                        <span class="item-category">Web Result</span>
                    </figcaption>
                `;


                figure.addEventListener('click', () => {
                    openLightbox(figure);
                });

                galleryGrid.appendChild(figure);
            });


            updateVisibleItems();
            observeItems();

        } catch (error) {
            console.error('Error fetching online images:', error);
            loader.classList.add('hidden');
            noResults.classList.remove('hidden');
            noResults.querySelector('h2').textContent = 'Search failed';
            noResults.querySelector('p').textContent = 'An error occurred while searching online.';
        }
    }

    function updateVisibleItems() {
        visibleItems = Array.from(document.querySelectorAll('.gallery-item:not(.hidden)'));
    }



    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        applyFilters();
    });

    function openLightbox(item) {
        currentImageIndex = visibleItems.indexOf(item);
        if (currentImageIndex === -1) return; // Guard clause

        updateLightboxContent();
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent body scrolling
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';


        setTimeout(() => {
            if (!lightbox.classList.contains('active')) {
                lightboxImg.src = '';
            }
        }, 400);
    }

    function updateLightboxContent() {
        const item = visibleItems[currentImageIndex];
        if (!item) return;

        const img = item.querySelector('img');


        lightboxImg.style.opacity = '0';
        lightboxImg.style.transform = 'scale(0.95)';

        setTimeout(() => {
            lightboxImg.src = img.src;
            lightboxImg.alt = img.alt;
            lightboxTitle.textContent = item.dataset.title;
            lightboxCategory.textContent = item.dataset.category;
            lightboxCounter.textContent = `${currentImageIndex + 1} / ${visibleItems.length}`;

            lightboxImg.onload = () => {
                lightboxImg.style.opacity = '1';
                lightboxImg.style.transform = 'scale(1)';
            };
        }, 200);


        prevBtn.style.visibility = currentImageIndex === 0 ? 'hidden' : 'visible';
        prevBtn.style.opacity = currentImageIndex === 0 ? '0' : '1';

        nextBtn.style.visibility = currentImageIndex === visibleItems.length - 1 ? 'hidden' : 'visible';
        nextBtn.style.opacity = currentImageIndex === visibleItems.length - 1 ? '0' : '1';
    }

    function navigateLightbox(direction) {
        if (direction === 'prev' && currentImageIndex > 0) {
            currentImageIndex--;
            updateLightboxContent();
        } else if (direction === 'next' && currentImageIndex < visibleItems.length - 1) {
            currentImageIndex++;
            updateLightboxContent();
        }
    }

    closeBtn.addEventListener('click', closeLightbox);

    downloadBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const imgSrc = lightboxImg.src;
        if (!imgSrc) return;

        try {

            const response = await fetch(imgSrc);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `lumina-gallery-${Date.now()}.jpg`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.warn('CORS prevented seamless download. Opening in new tab...', error);
            window.open(imgSrc, '_blank');
        }
    });

    prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateLightbox('prev');
    });

    nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateLightbox('next');
    });

    lightbox.addEventListener('click', (e) => {
        if (e.target.classList.contains('lightbox-backdrop') || e.target.classList.contains('lightbox-img-wrapper')) {
            closeLightbox();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;

        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') navigateLightbox('prev');
        if (e.key === 'ArrowRight') navigateLightbox('next');
    });


    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        htmlEl.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = htmlEl.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        htmlEl.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    function updateThemeIcon(theme) {
        const sun = document.querySelector('.sun-icon');
        const moon = document.querySelector('.moon-icon');

        if (theme === 'dark') {
            sun.style.display = 'block';
            moon.style.display = 'none';
        } else {
            sun.style.display = 'none';
            moon.style.display = 'block';
        }
    }


    initTheme();
    initGallery();
});