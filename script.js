// === MENU MOBILE ===
function initMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const overlay = document.querySelector('.menu-overlay');
    function closeMenu() {
        navLinks.classList.remove('active');
        mobileMenuBtn.classList.remove('open');
        mobileMenuBtn.textContent = '☰';
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        if (overlay) overlay.classList.remove('active');
    }
    function toggleMenu() {
        navLinks.classList.toggle('active');
        const isOpen = navLinks.classList.contains('active');
        mobileMenuBtn.classList.toggle('open', isOpen);
        mobileMenuBtn.textContent = isOpen ? '✕' : '☰';
        mobileMenuBtn.setAttribute('aria-expanded', isOpen);
        if (overlay) overlay.classList.toggle('active', isOpen);
    }
    mobileMenuBtn.addEventListener('click', toggleMenu);
    navLinks.querySelectorAll('a').forEach(function(link) {
        link.addEventListener('click', closeMenu);
    });
    if (overlay) {
        overlay.addEventListener('click', closeMenu);
    }
}

// === CARROSSEL DE DEPOIMENTOS ===
function initDepoimentosCarousel() {
    const track = document.querySelector('.carousel-track');
    if (!track) return;
    const viewport = track.parentElement;
    const cards = track.querySelectorAll('.depoimento-card');
    const prevBtn = document.querySelector('.carousel-arrow-prev');
    const nextBtn = document.querySelector('.carousel-arrow-next');
    const dotsContainer = document.querySelector('.carousel-dots');
    if (!cards.length) return;
    let current = 0;
    dotsContainer.innerHTML = '';
    cards.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'carousel-dot';
        dot.setAttribute('aria-label', 'Ir para o depoimento ' + (i + 1));
        dot.addEventListener('click', function() { goTo(i); });
        dotsContainer.appendChild(dot);
    });
    viewport.setAttribute('tabindex', '0');
    viewport.setAttribute('role', 'region');
    viewport.setAttribute('aria-label', 'Carrossel de depoimentos');
    function update() {
        var cardWidth = cards[0].offsetWidth;
        var gap = 24;
        var viewportWidth = viewport.offsetWidth;
        var offset = -(current * (cardWidth + gap)) + (viewportWidth - cardWidth) / 2;
        track.style.transform = 'translateX(' + offset + 'px)';
        cards.forEach(function(card, i) {
            card.classList.toggle('active', i === current);
        });
        document.querySelectorAll('.carousel-dot').forEach(function(dot, i) {
            dot.classList.toggle('active', i === current);
        });
        prevBtn.classList.toggle('visible', current > 0);
        nextBtn.classList.toggle('visible', current < cards.length - 1);
    }
    function goTo(i) {
        current = Math.max(0, Math.min(i, cards.length - 1));
        update();
    }
    prevBtn.addEventListener('click', function() { goTo(current - 1); });
    nextBtn.addEventListener('click', function() { goTo(current + 1); });
    viewport.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') { goTo(current - 1); }
        else if (e.key === 'ArrowRight') { goTo(current + 1); }
    });
    window.addEventListener('resize', update);
    let touchStartX = 0;
    let touchEndX = 0;
    viewport.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    viewport.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        const delta = touchEndX - touchStartX;
        if (Math.abs(delta) > 50) {
            if (delta > 0) { goTo(current - 1); }
            else { goTo(current + 1); }
        }
    }, { passive: true });
    update();
}

// === CTA FLUTUANTE (MOBILE) + PULSO DO HEADER (DESKTOP) ===
function initStickyCTA() {
    const heroCTA = document.querySelector('.hero-buttons .btn-primary');
    const stickyCTA = document.querySelector('.sticky-cta');
    const navCTA = document.querySelector('.nav-cta');
    const contatoSection = document.querySelector('#contato');
    if (!heroCTA) return;
    const heroObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                if (stickyCTA) stickyCTA.classList.remove('visible');
                if (navCTA) navCTA.classList.remove('pulsing');
            } else {
                if (stickyCTA) stickyCTA.classList.add('visible');
                if (navCTA) navCTA.classList.add('pulsing');
            }
        });
    }, { threshold: 0 });
    heroObserver.observe(heroCTA);
    if (contatoSection) {
        const contatoObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    if (stickyCTA) stickyCTA.classList.remove('visible');
                }
            });
        }, { threshold: 0.15 });
        contatoObserver.observe(contatoSection);
    }
}

// === ACTIVE NAV HIGHLIGHTING ===
function initNavHighlight() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');
    if (!sections.length || !navLinks.length) return;
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navLinks.forEach(function(link) {
                    link.classList.toggle('active', link.getAttribute('href') === '#' + id);
                });
            }
        });
    }, { rootMargin: '-20% 0px -70% 0px' });
    sections.forEach(function(section) { observer.observe(section); });
}

// === BUSCA NO REPERTÓRIO ===
let repData = [];
function esc(t) {
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
}
function getEstilos(item) {
    if (Array.isArray(item.estilo)) return item.estilo;
    if (typeof item.estilo === 'string') return item.estilo.split(',').map(s => s.trim());
    return [];
}
function extrairEstilos() {
    const s = new Set();
    repData.forEach(item => getEstilos(item).forEach(e => s.add(e)));
    return Array.from(s).sort();
}
function generarFiltros() {
    const container = document.getElementById('repStyleFilters');
    if (!container) return;
    container.innerHTML = '';
    extrairEstilos().forEach(estilo => {
        const chip = document.createElement('span');
        chip.className = 'rep-chip';
        chip.dataset.estilo = estilo;
        chip.textContent = estilo;
        chip.addEventListener('click', function() {
            this.classList.toggle('active');
            aplicarFiltros();
        });
        container.appendChild(chip);
    });
    document.querySelectorAll('.rep-lang-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            this.classList.toggle('active');
            aplicarFiltros();
        });
    });
    const input = document.getElementById('repSearchInput');
    if (input) input.addEventListener('input', aplicarFiltros);
}
function aplicarFiltros() {
    if (!repData.length) return;
    const termo = document.getElementById('repSearchInput').value.trim().toLowerCase();
    const estilosAtivos = Array.from(document.querySelectorAll('.rep-chip.active')).map(el => el.dataset.estilo);
    const idiomasAtivos = Array.from(document.querySelectorAll('.rep-lang-chip.active')).map(el => el.dataset.lang);
    let result = repData;
    if (termo) result = result.filter(item => (item.musica||'').toLowerCase().includes(termo) || (item.artista||'').toLowerCase().includes(termo));
    if (estilosAtivos.length) result = result.filter(item => getEstilos(item).some(e => estilosAtivos.includes(e)));
    if (idiomasAtivos.length) result = result.filter(item => idiomasAtivos.includes(item.idioma));
    document.getElementById('repCounter').textContent = result.length + ' de ~' + repData.length + ' músicas encontradas';
    renderizar(result);
}
function renderizar(lista) {
    const container = document.getElementById('repResults');
    if (!container) return;
    if (!lista.length) {
        container.innerHTML = '<div class="rep-no-results">Nenhuma música encontrada com esses filtros.</div>';
        return;
    }
    const max = 50;
    const exibir = lista.slice(0, max);
    let html = '';
    exibir.forEach(item => {
        const tags = getEstilos(item).map(e => '<span class="rep-result-tag">' + esc(e) + '</span>').join('');
        html += '<div class="rep-result-item">' +
            '<div class="rep-result-info">' +
                '<span class="rep-result-musica">' + esc(item.musica) + '</span>' +
                '<span class="rep-result-artista">' + esc(item.artista) + '</span>' +
            '</div>' +
            '<div class="rep-result-tags">' + tags + '</div>' +
        '</div>';
    });
    if (lista.length > max) {
        html += '<div class="rep-no-results">Mostrando ' + max + ' de ' + lista.length + ' resultados. Refine a busca.</div>';
    }
    container.innerHTML = html;
}
async function carregarRepertorio() {
    try {
        let resp = await fetch('repertorio.json');
        if (resp.ok) {
            repData = await resp.json();
        } else {
            throw new Error('no json');
        }
    } catch(e) {
        try {
            resp = await fetch('JSON-setlist.txt');
            const text = await resp.text();
            repData = [];
            let i = 0;
            while (i < text.length) {
                if (text[i] !== '[') { i++; continue; }
                let start = i;
                let depth = 0;
                while (i < text.length) {
                    if (text[i] === '[') depth++;
                    else if (text[i] === ']') depth--;
                    if (depth === 0) break;
                    i++;
                }
                if (depth === 0) {
                    try {
                        const arr = JSON.parse(text.substring(start, i + 1));
                        if (Array.isArray(arr)) repData.push(...arr);
                    } catch(pe) {}
                }
                i++;
            }
        } catch(err) {
            const c = document.getElementById('repCounter');
            const r = document.getElementById('repResults');
            if (c) c.textContent = 'Erro ao carregar repertório.';
            if (r) r.innerHTML = '<div class="rep-no-results">Não foi possível carregar os dados.</div>';
            return;
        }
    }
    if (repData && repData.length) { generarFiltros(); aplicarFiltros(); }
}

// === VOLTAR AO TOPO ===
function initBackToTop() {
    const btn = document.querySelector('.back-to-top');
    if (!btn) return;
    const hero = document.querySelector('#inicio');
    if (!hero) return;
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (!entry.isIntersecting) {
                btn.style.display = 'flex';
                requestAnimationFrame(function() { btn.classList.add('visible'); });
            } else {
                btn.classList.remove('visible');
                setTimeout(function() { btn.style.display = 'none'; }, 300);
            }
        });
    }, { threshold: 0 });
    observer.observe(hero);
    btn.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// === TOGGLE BUSCA AVANÇADA ===
function initRepSearchToggle() {
    const toggle = document.getElementById('repSearchToggle');
    const content = document.getElementById('repSearchCollapsible');
    if (!toggle || !content) return;
    toggle.addEventListener('click', function() {
        const isOpen = content.classList.toggle('open');
        toggle.classList.toggle('open', isOpen);
        toggle.setAttribute('aria-expanded', isOpen);
    });
}

// === INICIALIZAÇÃO ÚNICA ===
document.addEventListener('DOMContentLoaded', function() {
    initMobileMenu();
    initDepoimentosCarousel();
    initStickyCTA();
    initNavHighlight();
    initBackToTop();
    initRepSearchToggle();
    carregarRepertorio();
});