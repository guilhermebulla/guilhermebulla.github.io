/* ===== REPERTORIO.JS — Lógica da página de repertório ===== */
/* Separado de repertorio.html em 09/08/2026 */
/* Dependências: repertorio.html (DOM) + repertorio.json */

let allSongs = [];
let filteredSongs = [];
let uniqueArtists = [];
let displayLimit = 100;
let artistStates = {};
let songStates = {};
const searchInput = document.getElementById('searchInput');
const artistSearch = document.getElementById('artistSearch');
const artistList = document.getElementById('artistList');
const styleFilters = document.getElementById('styleFilters');
const langFilters = document.getElementById('langFilters');
const clearFiltersBtn = document.getElementById('clearFilters');
const counter = document.getElementById('counter');
const results = document.getElementById('results');
const downloadBtn = document.getElementById('downloadBtn');
const stickyDownload = document.getElementById('stickyDownload');
const filterSummary = document.getElementById('filterSummary');

async function loadRepertorio() {
    try {
        const response = await fetch('repertorio.json');
        if (!response.ok) throw new Error('Arquivo não encontrado');
        const buffer = await response.arrayBuffer();
        const text = new TextDecoder('utf-8').decode(buffer);
        allSongs = JSON.parse(text);
        const artistSet = new Set(allSongs.map(s => s.artista));
        uniqueArtists = [...artistSet].sort((a, b) =>
            a.localeCompare(b, 'pt-BR')
        );
        uniqueArtists.forEach(a => { artistStates[a] = 'neutral'; });
        renderStylePills();
        renderLangPills();
        renderArtistList(uniqueArtists);
        applyFilters();
    } catch (error) {
        counter.textContent = 'Erro ao carregar';
        console.error('Erro:', error);
    }
}

function renderStylePills() {
    const tagSet = new Set();
    allSongs.forEach(song => {
        const estilos = Array.isArray(song.estilo)
            ? song.estilo
            : (typeof song.estilo === 'string'
                ? song.estilo.split(',').map(s => s.trim())
                : []);
        estilos.forEach(e => tagSet.add(e));
    });
    const sortedTags = [...tagSet].sort((a, b) =>
        a.localeCompare(b, 'pt-BR')
    );
    styleFilters.innerHTML = sortedTags.map(tag =>
        '<label class="style-pill">' +
            '<input type="checkbox" value="' + escapeHtml(tag) + '">' +
            '<span>' + escapeHtml(tag) + '</span>' +
        '</label>'
    ).join('');
}

function renderLangPills() {
    const langSet = new Set();
    allSongs.forEach(song => {
        const idiomas = Array.isArray(song.idioma)
            ? song.idioma
            : (typeof song.idioma === 'string'
                ? song.idioma.split(',').map(s => s.trim())
                : []);
        idiomas.forEach(l => { if (l) langSet.add(l); });
    });
    if (langSet.size === 0) {
        document.getElementById('langSection').style.display = 'none';
        return;
    }
    const langFlags = {
        'Português': '🇧🇷',
        'Inglês': '🇺🇸',
        'Espanhol': '🇪🇸',
        'Francês': '🇫🇷'
    };
    const sortedLangs = [...langSet].sort((a, b) =>
        a.localeCompare(b, 'pt-BR')
    );
    langFilters.innerHTML = sortedLangs.map(lang => {
        const flag = langFlags[lang] || '🌐';
        return '<label class="style-pill">' +
            '<input type="checkbox" value="' + escapeHtml(lang) + '">' +
            '<span>' + flag + ' ' + escapeHtml(lang) + '</span>' +
        '</label>';
    }).join('');
}

function renderArtistList(artists) {
    if (artists.length === 0) {
        artistList.innerHTML = '<div class="artist-placeholder">Nenhum artista encontrado.</div>';
        return;
    }
    artistList.innerHTML = artists.map(artist => {
        const state = artistStates[artist] || 'neutral';
        const favClass = state === 'favorite' ? ' active-fav' : '';
        const vetoClass = state === 'vetoed' ? ' active-veto' : '';
        return (
            '<div class="artist-item">' +
                '<span class="artist-name">' + escapeHtml(artist) + '</span>' +
                '<div class="artist-toggles">' +
                    '<button class="artist-toggle' + favClass + '" ' +
                        'data-artist="' + escapeHtml(artist) + '" data-action="favorite" ' +
                        'title="Favoritar — sempre inclui">✅</button>' +
                    '<button class="artist-toggle' + vetoClass + '" ' +
                        'data-artist="' + escapeHtml(artist) + '" data-action="veto" ' +
                        'title="Vetar — sempre exclui">🚫</button>' +
                '</div>' +
            '</div>'
        );
    }).join('');
}

function songMatchesStyles(song, selectedTags) {
    if (selectedTags.length === 0) return true;
    const estilos = Array.isArray(song.estilo)
        ? song.estilo
        : (typeof song.estilo === 'string'
            ? song.estilo.split(',').map(s => s.trim())
            : []);
    return selectedTags.some(tag => estilos.includes(tag));
}

function songMatchesLangs(song, selectedLangs) {
    if (selectedLangs.length === 0) return true;
    const idiomas = Array.isArray(song.idioma)
        ? song.idioma
        : (typeof song.idioma === 'string'
            ? song.idioma.split(',').map(s => s.trim())
            : []);
    return selectedLangs.some(lang => idiomas.includes(lang));
}

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedStyles = Array.from(
        document.querySelectorAll('#styleFilters input[type="checkbox"]:checked')
    ).map(cb => cb.value);
    const selectedLangs = Array.from(
        document.querySelectorAll('#langFilters input[type="checkbox"]:checked')
    ).map(cb => cb.value);
    filteredSongs = allSongs.filter(song => {
        const artistState = artistStates[song.artista] || 'neutral';
        if (artistState === 'vetoed') return false;
        if (artistState !== 'favorite') {
            if (!songMatchesStyles(song, selectedStyles)) return false;
            if (!songMatchesLangs(song, selectedLangs)) return false;
        }
        if (searchTerm) {
            const inSong = song.musica.toLowerCase().includes(searchTerm);
            const inArtist = song.artista.toLowerCase().includes(searchTerm);
            if (!inSong && !inArtist) return false;
        }
        return true;
    });
    filteredSongs.sort((a, b) => {
        const artistCmp = a.artista.localeCompare(b.artista, 'pt-BR');
        if (artistCmp !== 0) return artistCmp;
        return a.musica.localeCompare(b.musica, 'pt-BR');
    });
    displayLimit = 100;
    renderResults();
    updateSectionBadges();
    updateFilterSummary();
}

function renderResults() {
    if (filteredSongs.length === 0) {
        results.innerHTML = '<div class="results-empty">Nenhuma música encontrada.</div>';
        counter.textContent = '0 de ' + allSongs.length;
        downloadBtn.disabled = true;
        stickyDownload.disabled = true;
        return;
    }
    counter.textContent = filteredSongs.length + ' de ' + allSongs.length;
    downloadBtn.disabled = false;
    stickyDownload.disabled = false;
    const visible = filteredSongs.slice(0, displayLimit);
    let html = visible.map(song => {
        const estilos = Array.isArray(song.estilo)
            ? song.estilo
            : (typeof song.estilo === 'string'
                ? song.estilo.split(',').map(s => s.trim())
                : []);
        const tags = estilos.map(e =>
            '<span class="result-tag">' + escapeHtml(e) + '</span>'
        ).join('');
        const key = song.artista + '|' + song.musica;
        const songState = songStates[key] || 'neutral';
        const prefClass = songState === 'pref' ? ' active-pref' : '';
        const avoidClass = songState === 'avoid' ? ' active-avoid' : '';
        let cardStyle = '';
        if (songState === 'pref') {
            cardStyle = ' style="border-color: var(--green);"';
        } else if (songState === 'avoid') {
            cardStyle = ' style="opacity: 0.35; border-color: var(--red);"';
        }
        return (
            '<div class="result-card"' + cardStyle + '>' +
                '<div class="result-info">' +
                    '<div class="result-song">' + escapeHtml(song.musica) + '</div>' +
                    '<div class="result-artist">' + escapeHtml(song.artista) + '</div>' +
                    '<div class="result-tags">' + tags + '</div>' +
                '</div>' +
                '<div class="song-signals">' +
                    '<button class="song-signal' + prefClass + '" ' +
                        'data-artist="' + escapeHtml(song.artista) + '" ' +
                        'data-song="' + escapeHtml(song.musica) + '" data-action="pref" ' +
                        'title="Preferir">✅</button>' +
                    '<button class="song-signal' + avoidClass + '" ' +
                        'data-artist="' + escapeHtml(song.artista) + '" ' +
                        'data-song="' + escapeHtml(song.musica) + '" data-action="avoid" ' +
                        'title="Evitar">🚫</button>' +
                '</div>' +
            '</div>'
        );
    }).join('');
    if (filteredSongs.length > displayLimit) {
        const remaining = filteredSongs.length - displayLimit;
        html += (
            '<div class="results-empty" id="showMore" ' +
            'style="cursor:pointer;grid-column:1/-1;padding:1.5rem;color:var(--gold);">' +
            'Mostrar mais (' + remaining + ' restantes)' +
            '</div>'
        );
    }
    results.innerHTML = html;
    const showMoreBtn = document.getElementById('showMore');
    if (showMoreBtn) {
        showMoreBtn.addEventListener('click', () => {
            displayLimit += 100;
            renderResults();
        });
    }
}

function updateSectionBadges() {
    // Estilos
    const styleCount = document.querySelectorAll('#styleFilters input[type="checkbox"]:checked').length;
    const styleBadge = document.getElementById('styleBadge');
    const styleSection = document.getElementById('styleSection');
    if (styleCount > 0) {
        styleBadge.textContent = '(' + styleCount + ')';
        styleSection.classList.add('has-filters');
    } else {
        styleBadge.textContent = '';
        styleSection.classList.remove('has-filters');
    }
    // Idiomas
    const langCount = document.querySelectorAll('#langFilters input[type="checkbox"]:checked').length;
    const langBadge = document.getElementById('langBadge');
    const langSection = document.getElementById('langSection');
    if (langCount > 0) {
        langBadge.textContent = '(' + langCount + ')';
        langSection.classList.add('has-filters');
    } else {
        langBadge.textContent = '';
        langSection.classList.remove('has-filters');
    }
    // Artistas
    const favCount = Object.values(artistStates).filter(s => s === 'favorite').length;
    const vetoCount = Object.values(artistStates).filter(s => s === 'vetoed').length;
    const artistBadge = document.getElementById('artistBadge');
    const artistSection = document.getElementById('artistSection');
    if (favCount > 0 || vetoCount > 0) {
        artistBadge.textContent = '(★' + favCount + ' 🚫' + vetoCount + ')';
        artistSection.classList.add('has-filters');
    } else {
        artistBadge.textContent = '';
        artistSection.classList.remove('has-filters');
    }
}

function updateFilterSummary() {
    const parts = [];
    const styleCount = document.querySelectorAll('#styleFilters input[type="checkbox"]:checked').length;
    if (styleCount > 0) parts.push(styleCount + (styleCount === 1 ? ' estilo' : ' estilos'));
    const langCount = document.querySelectorAll('#langFilters input[type="checkbox"]:checked').length;
    if (langCount > 0) parts.push(langCount + (langCount === 1 ? ' idioma' : ' idiomas'));
    const favCount = Object.values(artistStates).filter(s => s === 'favorite').length;
    const vetoCount = Object.values(artistStates).filter(s => s === 'vetoed').length;
    if (favCount > 0) parts.push(favCount + (favCount === 1 ? ' favoritado' : ' favoritados'));
    if (vetoCount > 0) parts.push(vetoCount + (vetoCount === 1 ? ' vetado' : ' vetados'));
    const searchTerm = searchInput.value.toLowerCase().trim();
    if (searchTerm) parts.push('busca: "' + searchTerm + '"');
    if (parts.length > 0) {
        filterSummary.textContent = 'Filtrando: ' + parts.join(' • ');
        filterSummary.classList.add('visible');
    } else {
        filterSummary.classList.remove('visible');
    }
}

function clearSectionFilters(section) {
    if (section === 'styles') {
        document.querySelectorAll('#styleFilters input[type="checkbox"]').forEach(cb => cb.checked = false);
    } else if (section === 'langs') {
        document.querySelectorAll('#langFilters input[type="checkbox"]').forEach(cb => cb.checked = false);
    } else if (section === 'artists') {
        artistSearch.value = '';
        uniqueArtists.forEach(a => { artistStates[a] = 'neutral'; });
        renderArtistList(uniqueArtists);
    }
    applyFilters();
}

function generatePDF() {
    const pdfSongs = filteredSongs.filter(song => {
        const key = song.artista + '|' + song.musica;
        return songStates[key] !== 'avoid';
    });
    if (pdfSongs.length === 0) {
        alert('Não há músicas para incluir no PDF. Ajuste seus filtros.');
        return;
    }
    const sorted = [...pdfSongs].sort((a, b) => {
        const artistCmp = a.artista.localeCompare(b.artista, 'pt-BR');
        if (artistCmp !== 0) return artistCmp;
        return a.musica.localeCompare(b.musica, 'pt-BR');
    });
    const letterGroups = {};
    sorted.forEach(song => {
        let firstChar = song.artista.charAt(0).toUpperCase();
        const normalized = firstChar.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        let letter = /[A-Z]/.test(normalized) ? normalized : '#';
        if (!letterGroups[letter]) letterGroups[letter] = [];
        letterGroups[letter].push(song);
    });
    let bodyHtml = '';
    Object.keys(letterGroups).sort().forEach(letter => {
        const songs = letterGroups[letter];
        const artistGroups = {};
        songs.forEach(song => {
            if (!artistGroups[song.artista]) artistGroups[song.artista] = [];
            artistGroups[song.artista].push(song);
        });
        const sortedArtists = Object.keys(artistGroups).sort((a, b) =>
            a.localeCompare(b, 'pt-BR')
        );
        bodyHtml += '<div class="letter-group">';
        bodyHtml += '<span class="watermark">' + escapeHtml(letter) + '</span>';
        sortedArtists.forEach(artist => {
            bodyHtml += '<div class="artist-block">';
            bodyHtml += '<div class="artist-name">' + escapeHtml(artist) + '</div>';
            const artistSongs = artistGroups[artist].sort((a, b) =>
                a.musica.localeCompare(b.musica, 'pt-BR')
            );
            artistSongs.forEach(song => {
                bodyHtml += '<div class="song-line">— ' + escapeHtml(song.musica) + '</div>';
            });
            bodyHtml += '</div>';
        });
        bodyHtml += '<div style="clear:both;"></div>';
        bodyHtml += '</div>';
    });
    const printHtml =
        '<!DOCTYPE html>' +
        '<html lang="pt-BR">' +
        '<head>' +
            '<meta charset="UTF-8">' +
            '<title>Repertório — BullaAcoustic</title>' +
            '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">' +
            '<style>' +
                '@page { margin: 1.5cm 1.5cm 2cm 1.5cm; }' +
                'body { font-family: "Inter", sans-serif; color: #333; line-height: 1.15; margin: 0; padding: 0; }' +
                '.header { text-align: center; margin-bottom: 1.2rem; border-bottom: 1px solid #d4a853; padding-bottom: 0.5rem; }' +
                '.header h1 { font-family: "Playfair Display", serif; font-size: 22pt; color: #d4a853; margin: 0; font-weight: 700; }' +
                '.header .subtitle { font-family: "Inter", sans-serif; font-size: 10pt; color: #555555; margin-top: 3px; }' +
                '.content { column-count: 2; column-gap: 25px; }' +
                '.letter-group { margin-bottom: 6px; }' +
                '.watermark { float: left; font-family: "Playfair Display", serif; font-size: 42pt; font-weight: bold; color: #f0e8d5; line-height: 1; margin: -5px 8px -15px 0; }' +
                '.artist-block { margin-bottom: 4px; break-inside: avoid; }' +
                '.artist-name { font-weight: bold; font-size: 10.5pt; color: #333; }' +
                '.song-line { font-size: 9.5pt; color: #444; line-height: 1.15; padding-left: 2px; }' +
                '.footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 7.5pt; color: #999; padding: 5px 0; border-top: 1px solid #eee; }' +
            '</style>' +
        '</head>' +
        '<body>' +
            '<div class="header">' +
                '<h1>REPERTÓRIO</h1>' +
                '<div class="subtitle">BullaAcoustic · Guilherme Bulla — Voz &amp; Violão</div>' +
            '</div>' +
            '<div class="content">' +
                bodyHtml +
            '</div>' +
            '<div class="footer">BullaAcoustic · guilhermebulla.github.io · WhatsApp (51) 98444.0402 · @guilhermebulla</div>' +
            '<scr' + 'ipt>' +
                'window.onload = function() {' +
                    'setTimeout(function() { window.print(); }, 600);' +
                '};' +
            '<\/scr' + 'ipt>' +
        '</body>' +
        '</html>';
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Permita pop-ups para baixar o PDF.');
        return;
    }
    printWindow.document.write(printHtml);
    printWindow.document.close();
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ===== EVENT LISTENERS =====
let searchDebounce;
searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(applyFilters, 300);
});

// Toggle collapsível
document.querySelectorAll('.filter-section-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const content = document.getElementById(targetId);
        content.classList.toggle('open');
        const expanded = content.classList.contains('open');
        btn.setAttribute('aria-expanded', expanded);
    });
});

// Limpar por seção
document.querySelectorAll('.filter-section-clear').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearSectionFilters(btn.dataset.clear);
    });
});

// Filtro de estilos
document.getElementById('styleFilters').addEventListener('change', applyFilters);

// Filtro de idiomas
document.getElementById('langFilters').addEventListener('change', applyFilters);

// Busca de artista
artistSearch.addEventListener('input', () => {
    const term = artistSearch.value.toLowerCase().trim();
    const filtered = uniqueArtists.filter(a =>
        a.toLowerCase().includes(term)
    );
    renderArtistList(filtered);
});

// Fav/veto artista
artistList.addEventListener('click', (e) => {
    const btn = e.target.closest('.artist-toggle');
    if (!btn) return;
    const artist = btn.dataset.artist;
    const action = btn.dataset.action;
    if (action === 'favorite') {
        artistStates[artist] = artistStates[artist] === 'favorite' ? 'neutral' : 'favorite';
    } else if (action === 'veto') {
        artistStates[artist] = artistStates[artist] === 'vetoed' ? 'neutral' : 'vetoed';
    }
    const term = artistSearch.value.toLowerCase().trim();
    const currentList = uniqueArtists.filter(a =>
        a.toLowerCase().includes(term)
    );
    renderArtistList(currentList);
    applyFilters();
});

// Pref/avoid música
results.addEventListener('click', (e) => {
    const btn = e.target.closest('.song-signal');
    if (!btn) return;
    const artist = btn.dataset.artist;
    const songName = btn.dataset.song;
    const action = btn.dataset.action;
    const key = artist + '|' + songName;
    if (action === 'pref') {
        songStates[key] = songStates[key] === 'pref' ? 'neutral' : 'pref';
    } else if (action === 'avoid') {
        songStates[key] = songStates[key] === 'avoid' ? 'neutral' : 'avoid';
    }
    renderResults();
});

// Download
downloadBtn.addEventListener('click', generatePDF);
stickyDownload.addEventListener('click', generatePDF);

// Limpar tudo
clearFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    artistSearch.value = '';
    document.querySelectorAll('#styleFilters input[type="checkbox"]')
        .forEach(cb => cb.checked = false);
    document.querySelectorAll('#langFilters input[type="checkbox"]')
        .forEach(cb => cb.checked = false);
    uniqueArtists.forEach(a => { artistStates[a] = 'neutral'; });
    songStates = {};
    renderArtistList(uniqueArtists);
    applyFilters();
});

// Sticky download visibility
const filterPanel = document.querySelector('.filter-panel');
if (filterPanel) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                stickyDownload.classList.add('visible');
            } else {
                stickyDownload.classList.remove('visible');
            }
        });
    }, { threshold: 0 });
    observer.observe(filterPanel);
}

document.addEventListener('DOMContentLoaded', loadRepertorio);
