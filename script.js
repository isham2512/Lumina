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

    // Openverse — open Creative Commons image search, no API key required
    // Docs: https://api.openverse.org/v1/

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
            const img = item.querySelector('img');
            if (img) {
                img.addEventListener('error', () => {
                    item.classList.add('hidden');
                    updateVisibleItems();
                });
                // If it already failed to load before script initialization
                if (img.complete && img.naturalWidth === 0) {
                    item.classList.add('hidden');
                }
            }
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
        const noResultsEl = document.getElementById('no-results');

        try {
            // Openverse API — Creative Commons images, completely free, no key needed
            const encodedQuery = encodeURIComponent(query);
            const apiUrl = `https://api.openverse.org/v1/images/?q=${encodedQuery}&page_size=20`;

            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error(`Openverse API error: ${response.status}`);
            }

            const data = await response.json();

            loader.classList.add('hidden');

            if (!data || !data.results || data.results.length === 0) {
                noResultsEl.classList.remove('hidden');
                noResultsEl.querySelector('h2').textContent = 'No images found online';
                noResultsEl.querySelector('p').textContent = `We couldn't find any images for "${query}".`;
                return;
            }

            data.results.forEach((item) => {
                // Skip items without a usable image URL
                if (!item.url && !item.thumbnail) return;

                const figure = document.createElement('figure');
                figure.className = 'gallery-item online-item';
                figure.dataset.category = 'Web Result';
                figure.dataset.title = item.title || query;

                const imgSrc = item.thumbnail || item.url;

                const img = document.createElement('img');
                img.src = imgSrc;
                img.alt = figure.dataset.title;
                img.loading = 'lazy';

                // If image fails to load, remove it from gallery to avoid broken UI
                img.addEventListener('error', () => {
                    figure.remove();
                    updateVisibleItems();
                });

                const figcaption = document.createElement('figcaption');
                figcaption.className = 'item-info';
                figcaption.innerHTML = `
                    <h3 class="item-title">${figure.dataset.title}</h3>
                    <span class="item-category">Web Result</span>
                `;

                figure.appendChild(img);
                figure.appendChild(figcaption);

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
            noResultsEl.classList.remove('hidden');
            noResultsEl.querySelector('h2').textContent = 'Search failed';
            noResultsEl.querySelector('p').textContent = 'Could not load images. Please check your connection and try again.';
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
        if (currentImageIndex === -1) return;

        updateLightboxContent();
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
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


    function initBackgroundCanvas() {
        const canvas = document.getElementById('bg-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        let particles = [];
        const particleCount = 50;
        let animationFrameId;

        // Theme tracking state
        let currentThemeName = htmlEl.getAttribute('data-theme') || 'light';

        // Color transitions (Zinc-950 light mode, Zinc-100 dark mode)
        const themeColors = {
            light: { r: 9, g: 9, b: 11 },
            dark: { r: 244, g: 244, b: 245 }
        };

        let currentColor = { ...themeColors[currentThemeName] };
        let targetColor = { ...themeColors[currentThemeName] };

        // Mouse setting
        let mouse = { x: null, y: null, radius: 180 };

        // Interactive entities
        let sun = { x: 0, y: 0, radius: 280 };
        let galaxyCenter = { x: 0, y: 0 };
        let galaxyStars = [];
        const galaxyStarsCount = 220;

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            if (sun.x === 0) {
                sun.x = canvas.width * 0.75;
                sun.y = canvas.height * 0.25;
                galaxyCenter.x = canvas.width * 0.5;
                galaxyCenter.y = canvas.height * 0.5;
            }

            initParticles();
            initGalaxyStars();
        }

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = (Math.random() - 0.5) * 0.3;
                this.vy = (Math.random() - 0.5) * 0.3;
                this.radius = Math.random() * 1.5 + 0.8;
                this.alpha = Math.random() * 0.08 + 0.03;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
                if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

                // Mouse interaction - gentle repulsion
                if (mouse.x !== null) {
                    const dx = this.x - mouse.x;
                    const dy = this.y - mouse.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < mouse.radius) {
                        const force = (mouse.radius - dist) / mouse.radius;
                        this.x += (dx / dist) * force * 0.7;
                        this.y += (dy / dist) * force * 0.7;
                    }
                }
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${Math.round(currentColor.r)}, ${Math.round(currentColor.g)}, ${Math.round(currentColor.b)}, ${this.alpha})`;
                ctx.fill();
            }
        }

        function initParticles() {
            particles = [];
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle());
            }
        }

        function initGalaxyStars() {
            galaxyStars = [];
            for (let i = 0; i < galaxyStarsCount; i++) {
                const armIndex = i % 3; // 3 spiral arms
                const dist = Math.pow(Math.random(), 1.8) * 240 + 8; // bias toward core
                galaxyStars.push({
                    dist: dist,
                    angle: Math.random() * Math.PI * 2,
                    armOffset: (armIndex * Math.PI * 2) / 3,
                    speed: (0.0008 + (3 / (dist + 30)) * 0.012) * (0.8 + Math.random() * 0.4), // slow, majestic speed
                    radius: Math.random() * 1.2 + 0.4,
                    alpha: Math.random() * 0.28 + 0.06, // dim star brightness to prevent distraction
                    offsetX: 0,
                    offsetY: 0
                });
            }
        }

        function drawLines() {
            for (let i = 0; i < particles.length; i++) {
                const p1 = particles[i];
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const dist = Math.hypot(dx, dy);

                    if (dist < 110) {
                        const alpha = (1 - dist / 110) * 0.02;
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `rgba(${Math.round(currentColor.r)}, ${Math.round(currentColor.g)}, ${Math.round(currentColor.b)}, ${alpha})`;
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    }
                }

                // Mouse connection line
                if (mouse.x !== null) {
                    const dx = p1.x - mouse.x;
                    const dy = p1.y - mouse.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < mouse.radius) {
                        const alpha = (1 - dist / mouse.radius) * 0.04;
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(mouse.x, mouse.y);
                        ctx.strokeStyle = `rgba(${Math.round(currentColor.r)}, ${Math.round(currentColor.g)}, ${Math.round(currentColor.b)}, ${alpha})`;
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    }
                }
            }
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Interpolate color values smoothly
            currentColor.r += (targetColor.r - currentColor.r) * 0.08;
            currentColor.g += (targetColor.g - currentColor.g) * 0.08;
            currentColor.b += (targetColor.b - currentColor.b) * 0.08;

            if (currentThemeName === 'light') {
                // LIGHT SUN
                let targetSun = {
                    x: mouse.x !== null ? mouse.x : canvas.width * 0.75,
                    y: mouse.y !== null ? mouse.y : canvas.height * 0.25
                };
                if (mouse.x === null) {
                    const time = Date.now() * 0.0004;
                    targetSun.x = canvas.width * 0.75 + Math.cos(time) * 50;
                    targetSun.y = canvas.height * 0.25 + Math.sin(time) * 25;
                }
                sun.x += (targetSun.x - sun.x) * 0.035;
                sun.y += (targetSun.y - sun.y) * 0.035;

                ctx.save();
                let grad = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, sun.radius);
                grad.addColorStop(0, 'rgba(253, 224, 71, 0.15)'); // soft warm gold sun glow
                grad.addColorStop(0.4, 'rgba(254, 240, 138, 0.04)');
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(sun.x, sun.y, sun.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

            } else {
                // SPIRAL MILKY WAY GALAXY
                const time = Date.now() * 0.00015;
                const targetGalaxyX = canvas.width * 0.5 + Math.cos(time) * 40;
                const targetGalaxyY = canvas.height * 0.5 + Math.sin(time) * 20;

                galaxyCenter.x += (targetGalaxyX - galaxyCenter.x) * 0.05;
                galaxyCenter.y += (targetGalaxyY - galaxyCenter.y) * 0.05;

                // Galactic Core Glow
                ctx.save();
                let coreGrad = ctx.createRadialGradient(galaxyCenter.x, galaxyCenter.y, 0, galaxyCenter.x, galaxyCenter.y, 140);
                coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
                coreGrad.addColorStop(0.4, 'rgba(244, 244, 245, 0.02)');
                coreGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = coreGrad;
                ctx.beginPath();
                ctx.arc(galaxyCenter.x, galaxyCenter.y, 140, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // Galaxy Stars
                galaxyStars.forEach(star => {
                    // Update rotation angle
                    star.angle += star.speed;

                    // Spiral base position
                    let spiral = star.dist * 0.014;
                    let baseX = galaxyCenter.x + Math.cos(star.angle + spiral + star.armOffset) * star.dist;
                    let baseY = galaxyCenter.y + Math.sin(star.angle + spiral + star.armOffset) * star.dist;

                    // Mouse interaction: scatter when hovered
                    if (mouse.x !== null) {
                        let currentX = baseX + star.offsetX;
                        let currentY = baseY + star.offsetY;

                        let dx = currentX - mouse.x;
                        let dy = currentY - mouse.y;
                        let dist = Math.hypot(dx, dy);

                        if (dist < 120) {
                            let force = (120 - dist) / 120 * 2.8;
                            star.offsetX += (dx / dist) * force;
                            star.offsetY += (dy / dist) * force;
                        }
                    }

                    // Return stars smoothly back to spiral arm orbit
                    star.offsetX *= 0.94;
                    star.offsetY *= 0.94;

                    let finalX = baseX + star.offsetX;
                    let finalY = baseY + star.offsetY;

                    ctx.beginPath();
                    ctx.arc(finalX, finalY, star.radius, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(244, 244, 245, ${star.alpha})`;
                    ctx.fill();
                });
            }

            // Render constellation mesh in foreground overlay
            particles.forEach(p => {
                p.update();
                p.draw();
            });

            drawLines();
            animationFrameId = requestAnimationFrame(animate);
        }

        window.updateCanvasTheme = function (theme) {
            currentThemeName = theme;
            targetColor = { ...themeColors[theme] };
        };

        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });
        window.addEventListener('mouseleave', () => {
            mouse.x = null;
            mouse.y = null;
        });

        resizeCanvas();
        animate();
    }

    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        htmlEl.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
        if (window.updateCanvasTheme) {
            window.updateCanvasTheme(savedTheme);
        }
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = htmlEl.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        htmlEl.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
        if (window.updateCanvasTheme) {
            window.updateCanvasTheme(newTheme);
        }
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

    initBackgroundCanvas();
    initTheme();
    initGallery();
});