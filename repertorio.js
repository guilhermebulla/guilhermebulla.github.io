/* ===== REPERTORIO.JS v6.0 — LocalStorage + Animated stats + / shortcut + URL hash + Empty state ===== */
// ===== STATE =====
let allSongs = [];
let filteredSongs = [];
let uniqueArtists = [];
let displayLimit = 100;
let songStates = {};
let sortColumn = 'artista';
let sortDir = 'asc';
let autocompleteItems = [];
let autocompleteIndex = -1;
let autocompleteLetterMode = false;
let suppressBlurHide = false;
let expandedCard = null;
let urlHashReady = false;
let starredFilterActive = false;
let selectedArtist = null;
const STORAGE_KEY = 'bulla_starred_songs';
const FLAG_BR = '<svg width="14" height="10" viewBox="0 0 14 10" class="flag-icon"><rect width="14" height="10" fill="#009b3a"/><path d="M7 1.5L13 5L7 8.5L1 5Z" fill="#fedf00"/><circle cx="7" cy="5" r="1.8" fill="#002776"/></svg>';
const FLAG_US = '<svg width="14" height="10" viewBox="0 0 14 10" class="flag-icon"><rect width="14" height="10" fill="#bf0a30"/><rect y="1.4" width="14" height="1.4" fill="#fff"/><rect y="4.2" width="14" height="1.4" fill="#fff"/><rect y="7" width="14" height="1.4" fill="#fff"/><rect width="6" height="5.6" fill="#002868"/></svg>';
const FLAG_ES = '<svg width="14" height="10" viewBox="0 0 14 10" class="flag-icon"><rect width="14" height="10" fill="#aa151b"/><rect y="2.8" width="14" height="4.4" fill="#f1bf00"/></svg>';
const FLAG_FR = '<svg width="14" height="10" viewBox="0 0 14 10" class="flag-icon"><rect width="4.67" height="10" fill="#0055a4"/><rect x="4.67" width="4.66" height="10" fill="#fff"/><rect x="9.33" width="4.67" height="10" fill="#ef4135"/></svg>';
const LANG_FLAGS = { 'Português': FLAG_BR, 'Inglês': FLAG_US, 'Espanhol': FLAG_ES, 'Francês': FLAG_FR };
// ===== DOM =====
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const searchHint = document.getElementById('searchHint');
const autocompleteDropdown = document.getElementById('autocompleteDropdown');
const filterToggle = document.getElementById('filterToggle');
const filterPanel = document.getElementById('filterPanel');
const filterToggleBadge = document.getElementById('filterToggleBadge');
const styleFilters = document.getElementById('styleFilters');
const langFilters = document.getElementById('langFilters');
const decadeFilters = document.getElementById('decadeFilters');
const artistSearch = document.getElementById('artistSearch');
const artistClear = document.getElementById('artistClear');
const artistList = document.getElementById('artistList');
const clearFiltersBtn = document.getElementById('clearFilters');
const results = document.getElementById('results');
const sortToggle = document.getElementById('sortToggle');
const sortDropdown = document.getElementById('sortDropdown');
const statCards = document.querySelectorAll('.stat-card');
// ===== LOCALSTORAGE (estrelas persistentes) =====
function loadStarred() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) songStates = JSON.parse(stored);
    } catch(e) {}
}
function saveStarred() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(songStates));
    } catch(e) {}
}
// ===== ANIMATED STATS (count up/down) =====
function animateStat(el, target) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        el.textContent = target;
        return;
    }
    if (el._animId) cancelAnimationFrame(el._animId);
    const current = parseInt(el.textContent) || 0;
    if (current === target) { el.textContent = target; return; }
    const duration = 400;
    const start = performance.now();
    function step(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(current + (target - current) * eased);
        el.textContent = value;
        if (progress < 1) {
            el._animId = requestAnimationFrame(step);
        } else {
            el._animId = null;
        }
    }
    el._animId = requestAnimationFrame(step);
}
// ===== URL HASH (filtros compartilháveis) =====
function updateUrlHash() {
    if (!urlHashReady) return;
    const params = [];
    const searchTerm = searchInput.value.trim();
    if (searchTerm) params.push('busca=' + encodeURIComponent(searchTerm));
    const styles = Array.from(document.querySelectorAll('#styleFilters input:checked')).map(cb => cb.value);
    if (styles.length) params.push('estilo=' + encodeURIComponent(styles.join(',')));
    const langs = Array.from(document.querySelectorAll('#langFilters input:checked')).map(cb => cb.value);
    if (langs.length) params.push('idioma=' + encodeURIComponent(langs.join(',')));
    const decades = Array.from(document.querySelectorAll('#decadeFilters input:checked')).map(cb => cb.value);
    if (decades.length) params.push('decada=' + encodeURIComponent(decades.join(',')));
    const hash = params.length ? '#' + params.join('&') : '';
    history.replaceState(null, '', hash || window.location.pathname);
}
function applyUrlHash() {
    const hash = window.location.hash.slice(1);
    if (!hash) return false;
    const params = new URLSearchParams(hash);
    const busca = params.get('busca');
    if (busca) {
        searchInput.value = busca;
        searchClear.classList.add('visible');
        searchHint.classList.add('hidden');
    }
    const estilo = params.get('estilo');
    if (estilo) {
        estilo.split(',').forEach(e => {
            const cb = document.querySelector('#styleFilters input[value="' + e + '"]');
            if (cb) cb.checked = true;
        });
    }
    const idioma = params.get('idioma');
    if (idioma) {
        idioma.split(',').forEach(l => {
            const cb = document.querySelector('#langFilters input[value="' + l + '"]');
            if (cb) cb.checked = true;
        });
    }
    const decada = params.get('decada');
    if (decada) {
        decada.split(',').forEach(d => {
            const cb = document.querySelector('#decadeFilters input[value="' + d + '"]');
            if (cb) cb.checked = true;
        });
    }
    return true;
}
// ===== INIT =====
async function loadRepertorio() {
    try {
        loadStarred();
        const response = await fetch('repertorio.json');
        if (!response.ok) throw new Error('Arquivo não encontrado');
        const buffer = await response.arrayBuffer();
        const text = new TextDecoder('utf-8').decode(buffer);
        allSongs = JSON.parse(text);
        const artistSet = new Set(allSongs.map(s => s.artista));
        uniqueArtists = [...artistSet].sort((a, b) => a.localeCompare(b, 'pt-BR'));
        renderStylePills();
        renderLangPills();
        renderDecadePills();
        renderArtistList(uniqueArtists);
        applyUrlHash();
        urlHashReady = true;
        applyFilters();
    } catch (error) {
        console.error('Erro ao carregar repertório:', error);
        results.innerHTML = '<div class="results-empty">' +
            '<p>Não foi possível carregar o repertório. Verifique sua conexão e recarregue a página.</p>' +
            '<button class="results-empty-clear" onclick="location.reload()">Recarregar</button>' +
        '</div>';
    }
}
// ===== HELPERS =====
function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function normalizeText(text) {
    return (text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
function getDecade(ano) {
    const year = parseInt(ano);
    if (isNaN(year)) return null;
    const decade = Math.floor(year / 10) * 10;
    return decade + 's';
}
function parseEstilos(song) {
    if (Array.isArray(song.estilo)) return song.estilo;
    if (typeof song.estilo === 'string') return song.estilo.split(',').map(s => s.trim());
    return [];
}
function parseIdiomas(song) {
    if (Array.isArray(song.idioma)) return song.idioma;
    if (typeof song.idioma === 'string') return song.idioma.split(',').map(s => s.trim());
    return [];
}
// ===== EMPTY STATE HTML =====
function getEmptyStateHtml() {
    return '<div class="results-empty">' +
        '<svg class="empty-icon" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="11" cy="11" r="8"></circle>' +
        '<line x1="21" y1="21" x2="16.65" y2="16.65"></line>' +
        '<line x1="8" y1="11" x2="14" y2="11"></line>' +
        '</svg>' +
        '<p>Nenhuma música encontrada com os filtros atuais.</p>' +
        '<button class="results-empty-clear" id="emptyClearFilters">Limpar filtros</button>' +
    '</div>';
}
// ===== RENDER PILLS =====
function renderStylePills() {
    const tagSet = new Set();
    allSongs.forEach(song => parseEstilos(song).forEach(e => tagSet.add(e)));
    styleFilters.innerHTML = [...tagSet].sort((a, b) => a.localeCompare(b, 'pt-BR')).map(tag =>
        '<label class="style-pill"><input type="checkbox" value="' + escapeHtml(tag) + '"><span>' + escapeHtml(tag) + '</span></label>'
    ).join('');
}
function renderLangPills() {
    const langSet = new Set();
    allSongs.forEach(song => parseIdiomas(song).forEach(l => { if (l) langSet.add(l); }));
    langFilters.innerHTML = [...langSet].sort((a, b) => a.localeCompare(b, 'pt-BR')).map(lang => {
        const flag = LANG_FLAGS[lang] || '🌐';
        return '<label class="style-pill"><input type="checkbox" value="' + escapeHtml(lang) + '"><span>' + flag + ' ' + escapeHtml(lang) + '</span></label>';
    }).join('');
}
function renderDecadePills() {
    const decadeSet = new Set();
    allSongs.forEach(song => { const d = getDecade(song.ano); if (d) decadeSet.add(d); });
    decadeFilters.innerHTML = [...decadeSet].sort().map(decade =>
        '<label class="style-pill"><input type="checkbox" value="' + escapeHtml(decade) + '"><span>' + escapeHtml(decade) + '</span></label>'
    ).join('');
}
// ===== ARTIST LIST =====
function renderArtistList(artists) {
    if (artists.length === 0) {
        artistList.innerHTML = '<div class="artist-placeholder">Nenhum artista encontrado.</div>';
        return;
    }
    artistList.innerHTML = artists.map(artist => {
        const starState = getArtistStarState(artist);
        const starClass = starState === 'all' ? 'starred' : starState === 'partial' ? 'partial' : '';
        const songCount = allSongs.filter(s => s.artista === artist).length;
        const selectedClass = selectedArtist === artist ? ' selected' : '';
        return '<div class="artist-item' + selectedClass + '">' +
            '<span class="artist-name" data-artist="' + escapeHtml(artist) + '" role="button" tabindex="0">' + escapeHtml(artist) + '</span>' +
            '<span class="artist-count">' + songCount + '</span>' +
            '<button class="artist-star-btn ' + starClass + '" data-artist="' + escapeHtml(artist) + '" title="Estrelar todas">★</button>' +
        '</div>';
    }).join('');
}
function getArtistStarState(artist) {
    const songs = allSongs.filter(s => s.artista === artist);
    if (songs.length === 0) return 'none';
    const starred = songs.filter(s => songStates[artist + '|' + s.musica] === 'starred').length;
    if (starred === songs.length) return 'all';
    if (starred === 0) return 'none';
    return 'partial';
}
// ===== AUTOCOMPLETE =====
let autocompleteDebounce;
searchInput.addEventListener('input', () => {
    const hasText = searchInput.value.length > 0;
    searchClear.classList.toggle('visible', hasText);
    searchHint.classList.toggle('hidden', hasText);
    clearTimeout(autocompleteDebounce);
    const term = searchInput.value;
    autocompleteDebounce = setTimeout(() => {
        autocompleteLetterMode = false;
        showAutocomplete(term);
        applyFilters();
    }, 150);
});
searchInput.addEventListener('focus', () => {
    if (searchInput.value.length > 0 && !autocompleteLetterMode) showAutocomplete(searchInput.value);
});
searchInput.addEventListener('blur', () => {
    if (suppressBlurHide) { suppressBlurHide = false; return; }
    setTimeout(() => { autocompleteDropdown.classList.remove('visible'); }, 200);
});
searchInput.addEventListener('keydown', (e) => {
    if (!autocompleteDropdown.classList.contains('visible')) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); autocompleteIndex = Math.min(autocompleteIndex + 1, autocompleteItems.length - 1); updateAutocompleteFocus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); autocompleteIndex = Math.max(autocompleteIndex - 1, -1); updateAutocompleteFocus(); }
    else if (e.key === 'Enter' && autocompleteIndex >= 0) { e.preventDefault(); selectAutocomplete(autocompleteItems[autocompleteIndex]); }
    else if (e.key === 'Escape') { autocompleteDropdown.classList.remove('visible'); }
});
searchClear.addEventListener('click', () => {
    if (starredFilterActive) {
        starredFilterActive = false;
        searchInput.readOnly = false;
        collapseAllCards();
    }
    searchInput.value = '';
    searchClear.classList.remove('visible');
    searchHint.classList.remove('hidden');
    autocompleteDropdown.classList.remove('visible');
    autocompleteLetterMode = false;
    applyFilters();
    searchInput.focus();
});
function showAutocomplete(term) {
    term = term.trim();
    if (term.length === 0) { autocompleteDropdown.classList.remove('visible'); return; }
    const termNorm = normalizeText(term);
    let html = '';
    if (term.length === 1 && /[a-zà-ú]/i.test(term)) {
        const letter = term.toUpperCase();
        const letterNorm = normalizeText(letter);
        const artistsWithLetter = uniqueArtists.filter(a => normalizeText(a.charAt(0)) === letterNorm);
        if (artistsWithLetter.length > 0) {
            html += '<div class="autocomplete-section"><div class="autocomplete-section-label">Atalho</div>';
            html += '<div class="autocomplete-item" data-type="letter" data-letter="' + escapeHtml(letter) + '">';
            html += '🎤 Artistas com a letra "' + escapeHtml(letter) + '" (' + artistsWithLetter.length + ')</div></div>';
        }
    }
    if (autocompleteLetterMode && autocompleteLetterMode.length === 1) {
        const letterNorm = normalizeText(autocompleteLetterMode);
        const artists = uniqueArtists.filter(a => normalizeText(a.charAt(0)) === letterNorm).slice(0, 20);
        html += '<div class="autocomplete-section"><div class="autocomplete-section-label">Artistas com "' + escapeHtml(autocompleteLetterMode.toUpperCase()) + '"</div>';
        html += '<div class="autocomplete-back" id="autocompleteBack">← Voltar</div>';
        artists.forEach(a => {
            const count = allSongs.filter(s => s.artista === a).length;
            html += '<div class="autocomplete-item" data-type="artist" data-value="' + escapeHtml(a) + '">' + escapeHtml(a) + ' <span class="item-artist">(' + count + ')</span></div>';
        });
        html += '</div>';
        autocompleteItems = [{ type: 'back' }, ...artists.map(a => ({ type: 'artist', value: a }))];
    } else {
        const matchingArtists = uniqueArtists.filter(a => normalizeText(a).includes(termNorm)).slice(0, 8);
        if (matchingArtists.length > 0) {
            html += '<div class="autocomplete-section"><div class="autocomplete-section-label">Artistas</div>';
            matchingArtists.forEach(a => {
                const count = allSongs.filter(s => s.artista === a).length;
                html += '<div class="autocomplete-item" data-type="artist" data-value="' + escapeHtml(a) + '">' + escapeHtml(a) + ' <span class="item-artist">(' + count + ')</span></div>';
            });
            html += '</div>';
        }
        const matchingSongs = allSongs.filter(s => normalizeText(s.musica).includes(termNorm) && !matchingArtists.includes(s.artista)).slice(0, 8);
        if (matchingSongs.length > 0) {
            html += '<div class="autocomplete-section"><div class="autocomplete-section-label">Músicas</div>';
            matchingSongs.forEach(s => {
                html += '<div class="autocomplete-item" data-type="song" data-value="' + escapeHtml(s.musica) + '" data-artist="' + escapeHtml(s.artista) + '">';
                html += '<span class="item-song">' + escapeHtml(s.musica) + '</span> <span class="item-artist">— ' + escapeHtml(s.artista) + '</span></div>';
            });
            html += '</div>';
        }
        autocompleteItems = [...matchingArtists.map(a => ({ type: 'artist', value: a })), ...matchingSongs.map(s => ({ type: 'song', value: s.musica, artist: s.artista }))];
    }
    if (html === '') { autocompleteDropdown.classList.remove('visible'); return; }
    autocompleteDropdown.innerHTML = html;
    autocompleteDropdown.classList.add('visible');
    autocompleteIndex = -1;
    autocompleteDropdown.querySelectorAll('.autocomplete-item, .autocomplete-back').forEach(el => {
        el.addEventListener('mousedown', (e) => {
            e.preventDefault();
            if (el.classList.contains('autocomplete-back')) { autocompleteLetterMode = false; showAutocomplete(searchInput.value); return; }
            selectAutocomplete({ type: el.dataset.type, value: el.dataset.value, artist: el.dataset.artist, letter: el.dataset.letter });
        });
    });
}
function updateAutocompleteFocus() {
    autocompleteDropdown.querySelectorAll('.autocomplete-item').forEach((el, i) => {
        el.classList.toggle('focused', i === autocompleteIndex);
    });
    if (autocompleteIndex >= 0) {
        const el = autocompleteDropdown.querySelectorAll('.autocomplete-item')[autocompleteIndex];
        if (el) el.scrollIntoView({ block: 'nearest' });
    }
}
function selectAutocomplete(item) {
    if (!item) return;
    if (item.type === 'letter') { autocompleteLetterMode = item.letter; suppressBlurHide = true; showAutocomplete(item.letter); searchInput.blur(); return; }
    if (item.type === 'artist') { searchInput.value = item.value; }
    else if (item.type === 'song') { searchInput.value = item.value; }
    searchClear.classList.add('visible');
    searchHint.classList.add('hidden');
    autocompleteDropdown.classList.remove('visible');
    autocompleteLetterMode = false;
    applyFilters();
}
// ===== FILTERS =====
function songMatchesStyles(song, tags) { return tags.length === 0 || tags.some(t => parseEstilos(song).includes(t)); }
function songMatchesLangs(song, langs) { return langs.length === 0 || langs.some(l => parseIdiomas(song).includes(l)); }
function songMatchesDecades(song, decades) {
    if (decades.length === 0) return true;
    const d = getDecade(song.ano);
    return d && decades.includes(d);
}
function applyFilters() {
    const searchTerm = normalizeText(searchInput.value);
    const selectedStyles = Array.from(document.querySelectorAll('#styleFilters input:checked')).map(cb => cb.value);
    const selectedLangs = Array.from(document.querySelectorAll('#langFilters input:checked')).map(cb => cb.value);
    const selectedDecades = Array.from(document.querySelectorAll('#decadeFilters input:checked')).map(cb => cb.value);
    filteredSongs = allSongs.filter(song => {
        if (starredFilterActive && songStates[song.artista + '|' + song.musica] !== 'starred') return false;
        if (selectedArtist && song.artista !== selectedArtist) return false;
        if (!songMatchesStyles(song, selectedStyles)) return false;
        if (!songMatchesLangs(song, selectedLangs)) return false;
        if (!songMatchesDecades(song, selectedDecades)) return false;
        if (searchTerm && !starredFilterActive) {
            if (!normalizeText(song.musica).includes(searchTerm) && !normalizeText(song.artista).includes(searchTerm)) return false;
        }
        return true;
    });
    displayLimit = 100;
    renderResults();
    updateStats();
    updateFilterToggleBadge();
    updateFilterGroupClearButtons();
    updateUrlHash();
}
// ===== SORT =====
function sortSongs(songs, column, dir) {
    const factor = dir === 'asc' ? 1 : -1;
    return [...songs].sort((a, b) => {
        let valA, valB;
        if (column === 'ano') { valA = parseInt(a.ano) || 0; valB = parseInt(b.ano) || 0; return (valA - valB) * factor; }
        if (column === 'estilo') { valA = parseEstilos(a)[0] || ''; valB = parseEstilos(b)[0] || ''; }
        else if (column === 'musica') { valA = a.musica; valB = b.musica; }
        else { valA = a.artista; valB = b.artista; }
        return valA.localeCompare(valB, 'pt-BR') * factor;
    });
}
// ===== RENDER RESULTS (dispatcher) =====
function renderResults() {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile && sortColumn === 'artista') {
        renderMobileGrouped();
    } else {
        renderTable();
    }
}
// ===== RENDER TABLE (desktop + mobile flat) =====
function renderTable() {
    if (filteredSongs.length === 0) {
        results.innerHTML = getEmptyStateHtml();
        return;
    }
    const sorted = sortSongs(filteredSongs, sortColumn, sortDir);
    const visible = sorted.slice(0, displayLimit);
    let html = '<div class="results-table-header">' +
        '<div></div>' +
        '<div class="sortable" data-sort="musica">Música<span class="sort-arrow"></span></div>' +
        '<div class="sortable" data-sort="artista">Artista<span class="sort-arrow"></span></div>' +
        '<div>Estilos</div><div>Idioma</div>' +
        '<div class="sortable" data-sort="ano">Ano<span class="sort-arrow"></span></div>' +
    '</div><div class="results-body">';
    html += visible.map(song => {
        const key = song.artista + '|' + song.musica;
        const isStarred = songStates[key] === 'starred';
        const starClass = isStarred ? 'starred' : '';
        const starChar = isStarred ? '★' : '☆';
        const tags = parseEstilos(song).map(e => '<span>' + escapeHtml(e) + '</span>').join('');
        const idiomas = parseIdiomas(song);
        const langDisplay = idiomas.map(l => LANG_FLAGS[l] || l).join(' ');
        return '<div class="result-row">' +
            '<button class="star-btn ' + starClass + '" data-artist="' + escapeHtml(song.artista) + '" data-song="' + escapeHtml(song.musica) + '">' + starChar + '</button>' +
            '<span class="cell-musica">' + escapeHtml(song.musica) + '</span>' +
            '<span class="cell-artista">' + escapeHtml(song.artista) + '</span>' +
            '<span class="cell-estilos">' + tags + '</span>' +
            '<span class="cell-idioma">' + langDisplay + '</span>' +
            '<span class="cell-ano">' + escapeHtml(song.ano || '') + '</span>' +
        '</div>';
    }).join('');
    if (sorted.length > displayLimit) {
        html += '<div class="show-more" id="showMore">Mostrar mais (' + (sorted.length - displayLimit) + ' restantes)</div>';
    }
    html += '</div>';
    results.innerHTML = html;
    document.querySelectorAll('.sortable').forEach(el => {
        el.classList.remove('sorted-asc', 'sorted-desc');
        const arrow = el.querySelector('.sort-arrow');
        if (el.dataset.sort === sortColumn) {
            el.classList.add(sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
            if (arrow) arrow.textContent = sortDir === 'asc' ? '↑' : '↓';
        } else { if (arrow) arrow.textContent = ''; }
        el.addEventListener('click', () => {
            if (sortColumn === el.dataset.sort) { sortDir = sortDir === 'asc' ? 'desc' : 'asc'; }
            else { sortColumn = el.dataset.sort; sortDir = 'asc'; }
            renderResults();
        });
    });
    const showMoreBtn = document.getElementById('showMore');
    if (showMoreBtn) showMoreBtn.addEventListener('click', () => { displayLimit += 100; renderResults(); });
}
// ===== RENDER MOBILE GROUPED (by artist) =====
function renderMobileGrouped() {
    if (filteredSongs.length === 0) {
        results.innerHTML = getEmptyStateHtml();
        return;
    }
    const sorted = sortSongs(filteredSongs, 'artista', sortDir);
    const visible = sorted.slice(0, displayLimit);
    const artistGroups = {};
    visible.forEach(song => {
        if (!artistGroups[song.artista]) artistGroups[song.artista] = [];
        artistGroups[song.artista].push(song);
    });
    let html = '<div class="results-body mobile-grouped">';
    Object.keys(artistGroups).forEach(artist => {
        const songs = artistGroups[artist];
        const starState = getArtistStarState(artist);
        const starClass = starState === 'all' ? 'starred' : starState === 'partial' ? 'partial' : '';
        const starChar = starState === 'all' ? '★' : '☆';
        html += '<div class="mobile-artist-group">';
        html += '<div class="mobile-artist-header">';
        html += '<button class="star-btn ' + starClass + '" data-artist="' + escapeHtml(artist) + '">' + starChar + '</button>';
        html += '<span class="mobile-artist-name">' + escapeHtml(artist) + '</span>';
        html += '<span class="mobile-artist-count">' + songs.length + '</span>';
        html += '</div>';
        songs.forEach(song => {
            const key = song.artista + '|' + song.musica;
            const isStarred = songStates[key] === 'starred';
            const songStarClass = isStarred ? 'starred' : '';
            const songStarChar = isStarred ? '★' : '☆';
            html += '<div class="mobile-song-row">';
            html += '<button class="star-btn ' + songStarClass + '" data-artist="' + escapeHtml(song.artista) + '" data-song="' + escapeHtml(song.musica) + '">' + songStarChar + '</button>';
            html += '<span class="mobile-song-name">' + escapeHtml(song.musica) + '</span>';
            html += '</div>';
        });
        html += '</div>';
    });
    if (sorted.length > displayLimit) {
        html += '<div class="show-more" id="showMore">Mostrar mais (' + (sorted.length - displayLimit) + ' restantes)</div>';
    }
    html += '</div>';
    results.innerHTML = html;
    const showMoreBtn = document.getElementById('showMore');
    if (showMoreBtn) showMoreBtn.addEventListener('click', () => { displayLimit += 100; renderResults(); });
}
// ===== STAR TOGGLES =====
results.addEventListener('click', (e) => {
    if (e.target.closest('#emptyClearFilters')) {
        clearFiltersBtn.click();
        return;
    }
    const btn = e.target.closest('.star-btn');
    if (!btn) return;
    const artist = btn.dataset.artist;
    const song = btn.dataset.song;
    if (song) {
        const key = artist + '|' + song;
        songStates[key] = songStates[key] === 'starred' ? 'neutral' : 'starred';
        saveStarred();
        renderResults();
        renderArtistList(getFilteredArtists());
        updateStats();
    } else if (artist) {
        toggleArtistStar(artist);
    }
});
function toggleArtistStar(artist) {
    const songs = allSongs.filter(s => s.artista === artist);
    const allStarred = songs.every(s => songStates[artist + '|' + s.musica] === 'starred');
    songs.forEach(s => { songStates[artist + '|' + s.musica] = allStarred ? 'neutral' : 'starred'; });
    saveStarred();
    renderArtistList(getFilteredArtists());
    renderResults();
    updateStats();
}
function getFilteredArtists() {
    const term = normalizeText(artistSearch.value);
    return term ? uniqueArtists.filter(a => normalizeText(a).includes(term)) : uniqueArtists;
}
artistList.addEventListener('click', (e) => {
    const starBtn = e.target.closest('.artist-star-btn');
    if (starBtn) {
        toggleArtistStar(starBtn.dataset.artist);
        return;
    }
    const nameEl = e.target.closest('.artist-name');
    if (nameEl) {
        const artist = nameEl.dataset.artist;
        selectedArtist = (selectedArtist === artist) ? null : artist;
        renderArtistList(getFilteredArtists());
        applyFilters();
    }
});
artistList.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        const nameEl = e.target.closest('.artist-name');
        if (nameEl) {
            e.preventDefault();
            const artist = nameEl.dataset.artist;
            selectedArtist = (selectedArtist === artist) ? null : artist;
            renderArtistList(getFilteredArtists());
            applyFilters();
        }
    }
});
artistSearch.addEventListener('input', () => {
    artistClear.classList.toggle('visible', artistSearch.value.length > 0);
    renderArtistList(getFilteredArtists());
});
artistClear.addEventListener('click', () => {
    artistSearch.value = '';
    artistClear.classList.remove('visible');
    renderArtistList(uniqueArtists);
    updateFilterGroupClearButtons();
    artistSearch.focus();
});
// ===== STATS =====
function updateStats() {
    const starredCount = Object.values(songStates).filter(s => s === 'starred').length;
    animateStat(document.getElementById('statTotal'), allSongs.length);
    animateStat(document.getElementById('statFiltered'), filteredSongs.length);
    animateStat(document.getElementById('statStarred'), starredCount);
    statCards.forEach(card => {
        const scope = card.dataset.scope;
        if (scope === 'total') {
            card.classList.toggle('disabled', allSongs.length === 0);
        } else if (scope === 'filtered') {
            card.classList.toggle('disabled', filteredSongs.length === 0);
        } else if (scope === 'starred') {
            card.classList.toggle('disabled', starredCount === 0);
        }
    });
    const totalText = document.querySelector('[data-scope="total"] .stat-bar-text');
    const filteredText = document.querySelector('[data-scope="filtered"] .stat-bar-text');
    const starredText = document.querySelector('[data-scope="starred"] .stat-bar-text');
    if (totalText) totalText.textContent = 'PDF completo (' + allSongs.length + ' músicas)';
    if (filteredText) filteredText.textContent = 'PDF editado (' + filteredSongs.length + ' músicas)';
    if (starredText) starredText.textContent = 'PDF favoritas (' + starredCount + ' músicas)';
}
function updateFilterToggleBadge() {
    let total = document.querySelectorAll('#styleFilters input:checked, #langFilters input:checked, #decadeFilters input:checked').length;
    if (selectedArtist) total++;
    if (starredFilterActive) total++;
    if (total > 0) { filterToggleBadge.textContent = total; filterToggleBadge.classList.add('visible'); }
    else { filterToggleBadge.classList.remove('visible'); }
}
function updateFilterGroupClearButtons() {
    const sections = [
        { id: 'langFilters', type: 'checkbox' },
        { id: 'styleFilters', type: 'checkbox' },
        { id: 'decadeFilters', type: 'checkbox' },
        { id: 'artistSearch', type: 'text' }
    ];
    sections.forEach(section => {
        const btn = document.querySelector('.filter-group-clear[data-target="' + section.id + '"]');
        if (!btn) return;
        let hasActive = false;
        if (section.type === 'checkbox') {
            hasActive = document.querySelectorAll('#' + section.id + ' input:checked').length > 0;
        } else {
            hasActive = document.getElementById(section.id).value.length > 0;
        }
        btn.classList.toggle('visible', hasActive);
    });
}
// ===== STAT CARD INTERACTIONS =====
function collapseCard(card) {
    if (!card) return;
    card.classList.remove('expanded');
    if (expandedCard === card) {
        if (card.dataset.scope === 'starred' && starredFilterActive) {
            starredFilterActive = false;
            searchInput.value = '';
            searchInput.readOnly = false;
            searchClear.classList.remove('visible');
            searchHint.classList.remove('hidden');
            applyFilters();
        }
        expandedCard = null;
    }
}
function collapseAllCards() {
    statCards.forEach(collapseCard);
}
statCards.forEach(card => {
    card.addEventListener('click', (e) => {
        e.stopPropagation();
        if (card.classList.contains('disabled')) return;
        if (card.classList.contains('expanded')) {
            const scope = card.dataset.scope;
            collapseCard(card);
            generatePDF(scope);
        } else {
            collapseAllCards();
            card.classList.add('expanded');
            expandedCard = card;
            if (card.dataset.scope === 'starred') {
                starredFilterActive = true;
                searchInput.value = '★ Favoritas';
                searchInput.readOnly = true;
                searchClear.classList.add('visible');
                searchHint.classList.add('hidden');
                applyFilters();
            }
        }
    });
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            card.click();
        } else if (e.key === 'Escape' && card.classList.contains('expanded')) {
            collapseCard(card);
        }
    });
});
document.addEventListener('click', (e) => {
    if (expandedCard && !expandedCard.contains(e.target)) {
        collapseCard(expandedCard);
    }
    if (sortDropdown.classList.contains('visible') && !sortToggle.contains(e.target) && !sortDropdown.contains(e.target)) {
        sortDropdown.classList.remove('visible');
        sortToggle.classList.remove('active');
        sortToggle.setAttribute('aria-expanded', 'false');
    }
});
// ===== SORT TOGGLE =====
sortToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = sortDropdown.classList.toggle('visible');
    sortToggle.classList.toggle('active', isVisible);
    sortToggle.setAttribute('aria-expanded', isVisible ? 'true' : 'false');
});
sortDropdown.addEventListener('click', (e) => {
    const option = e.target.closest('.sort-option');
    if (!option) return;
    // Reset labels da opção não-selecionada
    sortDropdown.querySelectorAll('.sort-option').forEach(o => {
        o.textContent = o.dataset.sort === 'artista' ? 'Artista (A-Z)' : 'Música (A-Z)';
    });
    if (sortColumn === option.dataset.sort) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = option.dataset.sort;
        sortDir = 'asc';
    }
    sortDropdown.querySelectorAll('.sort-option').forEach(o => o.classList.remove('active'));
    option.classList.add('active');
    option.textContent = option.dataset.sort === 'artista'
        ? (sortDir === 'asc' ? 'Artista (A-Z)' : 'Artista (Z-A)')
        : (sortDir === 'asc' ? 'Música (A-Z)' : 'Música (Z-A)');
    sortDropdown.classList.remove('visible');
    sortToggle.classList.remove('active');
    sortToggle.setAttribute('aria-expanded', 'false');
    renderResults();
});
// ===== PER-SECTION CLEAR =====
document.querySelectorAll('.filter-group-clear').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = btn.dataset.target;
        if (target === 'artistSearch') {
            artistSearch.value = '';
            artistClear.classList.remove('visible');
            renderArtistList(uniqueArtists);
        } else {
            document.querySelectorAll('#' + target + ' input').forEach(cb => cb.checked = false);
        }
        applyFilters();
    });
});
// ===== UI EVENTS =====
filterToggle.addEventListener('click', () => { filterPanel.classList.toggle('visible'); filterToggle.classList.toggle('active'); });
clearFiltersBtn.addEventListener('click', () => {
    searchInput.value = ''; artistSearch.value = '';
    searchClear.classList.remove('visible'); searchHint.classList.remove('hidden');
    artistClear.classList.remove('visible');
    document.querySelectorAll('#styleFilters input, #langFilters input, #decadeFilters input').forEach(cb => cb.checked = false);
    autocompleteLetterMode = false;
    selectedArtist = null;
    starredFilterActive = false;
    searchInput.readOnly = false;
    sortColumn = 'artista'; sortDir = 'asc';
    sortDropdown.querySelectorAll('.sort-option').forEach(o => o.classList.remove('active'));
    const defaultSort = sortDropdown.querySelector('[data-sort="artista"]');
    if (defaultSort) defaultSort.classList.add('active');
    autocompleteDropdown.classList.remove('visible');
    document.querySelectorAll('.filter-group-clear').forEach(btn => btn.classList.remove('visible'));
    collapseAllCards();
    history.replaceState(null, '', window.location.pathname);
    renderArtistList(uniqueArtists); applyFilters();
});
styleFilters.addEventListener('change', applyFilters);
langFilters.addEventListener('change', applyFilters);
decadeFilters.addEventListener('change', applyFilters);
// ===== KEYBOARD SHORTCUT (/ para focar busca, Esc para fechar painéis) =====
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && filterPanel.classList.contains('visible')) {
        filterPanel.classList.remove('visible');
        filterToggle.classList.remove('active');
        filterToggle.focus();
        return;
    }
    if (e.key === '/' && document.activeElement !== searchInput && document.activeElement !== artistSearch) {
        const tag = document.activeElement.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
            e.preventDefault();
            searchInput.focus();
            searchHint.classList.add('hidden');
        }
    }
});
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderResults, 200);
});
// ===== PDF GENERATION =====
function generatePDF(scope) {
    let songs;
    if (scope === 'total') {
        songs = [...allSongs];
    } else if (scope === 'starred') {
        songs = allSongs.filter(s => songStates[s.artista + '|' + s.musica] === 'starred');
    } else {
        songs = [...filteredSongs];
    }
    if (songs.length === 0) { alert('Não há músicas para incluir no PDF.'); return; }
    const sorted = [...songs].sort((a, b) => {
        const c = a.artista.localeCompare(b.artista, 'pt-BR');
        return c !== 0 ? c : a.musica.localeCompare(b.musica, 'pt-BR');
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
        const songsInLetter = letterGroups[letter];
        const artistGroups = {};
        songsInLetter.forEach(song => { if (!artistGroups[song.artista]) artistGroups[song.artista] = []; artistGroups[song.artista].push(song); });
        const sortedArtists = Object.keys(artistGroups).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        bodyHtml += '<div class="letter-group"><div class="letter-divider">' + escapeHtml(letter) + '</div>';
        sortedArtists.forEach(artist => {
            bodyHtml += '<div class="artist-block"><div class="artist-name">' + escapeHtml(artist) + '</div>';
            artistGroups[artist].sort((a, b) => a.musica.localeCompare(b.musica, 'pt-BR')).forEach(song => {
                const prefix = songStates[artist + '|' + song.musica] === 'starred' ? '★ ' : '— ';
                bodyHtml += '<div class="song-line">' + prefix + escapeHtml(song.musica) + '</div>';
            });
            bodyHtml += '</div>';
        });
        bodyHtml += '</div>';
    });
    const subtitleMap = {
        'total': 'BullaAcoustic · Guilherme Bulla — Voz &amp; Violão',
        'filtered': 'BullaAcoustic · Guilherme Bulla — Repertório personalizado',
        'starred': 'BullaAcoustic · Guilherme Bulla — Repertório favoritas'
    };
    const subtitle = subtitleMap[scope] || subtitleMap['filtered'];
    const footerText = 'BullaAcoustic · guilhermebulla.github.io · WhatsApp (51) 98444.0402 · @guilhermebulla';
    const printHtml =
        '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Repertório — BullaAcoustic</title>' +
        '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">' +
        '<style>' +
        '@page{margin:0;size:A4}' +
        '*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
        'body{font-family:"Inter",sans-serif;color:#333;line-height:1.3;margin:0;padding:0}' +
        '.header{text-align:center;margin-bottom:1rem;border-bottom:1px solid #d4a853;padding-bottom:0.5rem}' +
        '.header h1{font-family:"Playfair Display",serif;font-size:24pt;color:#d4a853;margin:0;font-weight:700}' +
        '.header .subtitle{font-size:11pt;color:#555;margin-top:3px}' +
        // ALTERAÇÃO 1: min-height 295mm → 277mm
        '.pdf-page{padding:1.5cm 1.5cm 1.8cm;page-break-after:always;position:relative;min-height:277mm}' +
        '.pdf-page:last-child{page-break-after:auto}' +
        '.content{column-count:2;column-gap:28px;column-rule:1px solid #d4a853}' +
        '.letter-group{margin-bottom:6px}' +
        '.letter-divider{background:linear-gradient(to right,#f5f0e0 0%,#f5f0e0 35%,rgba(245,240,224,0.5) 70%,transparent 100%);border-left:4px solid #d4a853;padding:4px 10px;margin:6px 0 4px;font-family:"Playfair Display",serif;font-size:13pt;font-weight:700;color:#8a6d2a;break-inside:avoid;page-break-inside:avoid;break-after:avoid;page-break-after:avoid}' +
        '.artist-block{margin-bottom:4px}' +
        '.artist-name{font-weight:bold;font-size:12pt;color:#333;break-after:avoid;page-break-after:avoid}' +
        '.song-line{font-size:11pt;color:#444;padding-left:2px}' +
        '.pdf-footer{position:absolute;bottom:0.6cm;left:1.5cm;right:1.5cm;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #eee;padding-top:4px;font-size:8pt;color:#999}' +
        '.pdf-footer .footer-center{flex:1;text-align:center}' +
        '.pdf-footer .page-num{font-family:"Playfair Display",serif;color:#d4a853;font-weight:600;min-width:30px;text-align:right}' +
        '@media screen{body{background:#e8e8e8;padding:1rem 0}.print-document{max-width:210mm;margin:0 auto}.pdf-page{background:white;box-shadow:0 4px 30px rgba(0,0,0,0.12);margin-bottom:1rem;border-radius:2px}.pdf-page.pdf-page-hidden{display:none}.pdf-nav{position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:white;border:1px solid #ddd;border-radius:50px;padding:8px 16px;box-shadow:0 4px 20px rgba(0,0,0,0.15);display:flex;gap:12px;align-items:center;z-index:1000}.pdf-nav button{background:none;border:1px solid #d4a853;color:#d4a853;border-radius:50px;padding:4px 16px;cursor:pointer;font-family:"Inter",sans-serif;font-size:0.85rem;transition:all 0.2s}.pdf-nav button:hover:not(:disabled){background:#d4a853;color:white}.pdf-nav button:disabled{opacity:0.3;cursor:default}.pdf-nav .page-info{font-size:0.85rem;color:#666;min-width:50px;text-align:center;font-family:"Inter",sans-serif}}' +
        '@media print{.pdf-nav{display:none!important}.pdf-page{box-shadow:none;margin:0;border-radius:0}}' +
        '</style></head>' +
        '<body data-footer="' + footerText + '">' +
        '<div class="print-document" id="printDoc">' +
        '<div class="pdf-page" id="pageTemplate">' +
        '<div class="header"><h1>REPERTÓRIO</h1><div class="subtitle">' + subtitle + '</div></div>' +
        '<div class="content" id="allContent">' + bodyHtml + '</div>' +
        '<div class="pdf-footer"><span></span><span class="footer-center">' + footerText + '</span><span class="page-num">1</span></div>' +
        '</div>' +
        '</div>' +
        '<div class="pdf-nav" id="pdfNav" style="display:none">' +
        '<button id="prevPage" disabled>← Anterior</button>' +
        '<span class="page-info" id="pageInfo">1 / 1</span>' +
        '<button id="nextPage">Próxima →</button>' +
        '</div>' +
        '<scr' + 'ipt>' +
        'window.onload=function(){' +
        'document.fonts.ready.then(function(){' +
        'setTimeout(function(){' +
        'try{' +
        'var content=document.getElementById("allContent");' +
        'var groups=Array.from(content.querySelectorAll(".letter-group"));' +
        'var printDoc=document.getElementById("printDoc");' +
        'var templatePage=document.getElementById("pageTemplate");' +
        'var headerHtml="";' +
        'var headerEl=document.querySelector(".header");' +
        'if(headerEl){headerHtml=headerEl.outerHTML}' +
        'var ft=document.body.getAttribute("data-footer")||"";' +
        'var PAGE_H=1122;var PAD_T=57;var PAD_B=68;var FOOTER_H=30;' +
        'var headerH=headerEl?headerEl.offsetHeight+16:60;' +
        // ALTERAÇÃO 2: fator 0.93 → 0.88
        'var usableFirst=Math.floor((PAGE_H-PAD_T-PAD_B-headerH-FOOTER_H)*0.88);' +
        'var usableRest=Math.floor((PAGE_H-PAD_T-PAD_B-FOOTER_H)*0.88);' +
        'templatePage.remove();' +
        'var pages=[];var cc=null;var ch=0;' +
        'groups.forEach(function(g){' +
        'var gh=g.offsetHeight+6;' +
        'var isFirst=pages.length===0;' +
        'var usable=isFirst?usableFirst:usableRest;' +
        'if(!cc||(ch+gh>usable&&ch>0)){' +
        'isFirst=pages.length===0;' +
        'usable=isFirst?usableFirst:usableRest;' +
        'var page=document.createElement("div");' +
        'page.className="pdf-page";' +
        'if(pages.length>0){page.classList.add("pdf-page-hidden")}' +
        'if(isFirst){page.insertAdjacentHTML("afterbegin",headerHtml)}' +
        'var cd=document.createElement("div");' +
        'cd.className="content";' +
        'page.appendChild(cd);' +
        'var ftd=document.createElement("div");' +
        'ftd.className="pdf-footer";' +
        'ftd.appendChild(document.createElement("span"));' +
        'var s2=ftd.appendChild(document.createElement("span"));' +
        's2.className="footer-center";' +
        's2.textContent=ft;' +
        'var s3=ftd.appendChild(document.createElement("span"));' +
        's3.className="page-num";' +
        's3.textContent=String(pages.length+1);' +
        'page.appendChild(ftd);' +
        'printDoc.appendChild(page);' +
        'pages.push(page);' +
        'cc=cd;' +
        'ch=0;' +
        '}' +
        'cc.appendChild(g);' +
        'ch+=gh;' +
        '});' +
        'var nav=document.getElementById("pdfNav");' +
        'var prevBtn=document.getElementById("prevPage");' +
        'var nextBtn=document.getElementById("nextPage");' +
        'var pageInfo=document.getElementById("pageInfo");' +
        'var idx=0;' +
        'function showPage(i){' +
        'pages.forEach(function(p,j){p.classList.toggle("pdf-page-hidden",j!==i)});' +
        'idx=i;' +
        'pageInfo.textContent=(i+1)+" / "+pages.length;' +
        'prevBtn.disabled=i===0;' +
        'nextBtn.disabled=i===pages.length-1;' +
        'window.scrollTo(0,0);' +
        '}' +
        'prevBtn.addEventListener("click",function(){if(idx>0)showPage(idx-1)});' +
        'nextBtn.addEventListener("click",function(){if(idx<pages.length-1)showPage(idx+1)});' +
        'if(pages.length>1){nav.style.display="flex";showPage(0)}' +
        'window.onbeforeprint=function(){' +
        'pages.forEach(function(p){p.classList.remove("pdf-page-hidden")});' +
        'nav.style.display="none";' +
        '};' +
        'window.onafterprint=function(){' +
        'if(pages.length>1){showPage(idx);nav.style.display="flex"}' +
        '};' +
        '}catch(e){console.error("Pagination error:",e)}' +
        'window.print();' +
        '},200)' +
        '})' +
        '}' +
        '<' + '/scr' + 'ipt></body></html>';
    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert('Permita pop-ups para baixar o PDF.'); return; }
    printWindow.document.write(printHtml);
    printWindow.document.close();
}
// ===== INIT =====
document.addEventListener('DOMContentLoaded', loadRepertorio);
