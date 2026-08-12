/* ===== REPERTORIO.JS v4.0 — Expanding stat cards + Compact sort toggle ===== */
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
// ===== DOM =====
const searchInput = document.getElementById('searchInput');
const autocompleteDropdown = document.getElementById('autocompleteDropdown');
const filterToggle = document.getElementById('filterToggle');
const filterPanel = document.getElementById('filterPanel');
const filterToggleBadge = document.getElementById('filterToggleBadge');
const styleFilters = document.getElementById('styleFilters');
const langFilters = document.getElementById('langFilters');
const decadeFilters = document.getElementById('decadeFilters');
const artistSearch = document.getElementById('artistSearch');
const artistList = document.getElementById('artistList');
const clearFiltersBtn = document.getElementById('clearFilters');
const results = document.getElementById('results');
const sortToggle = document.getElementById('sortToggle');
const sortDropdown = document.getElementById('sortDropdown');
const statCards = document.querySelectorAll('.stat-card');
// ===== INIT =====
async function loadRepertorio() {
    try {
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
        applyFilters();
    } catch (error) {
        console.error('Erro:', error);
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
    return (decade % 100) + 's';
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
    const langFlags = { 'Português': '🇧🇷', 'Inglês': '🇺🇸', 'Espanhol': '🇪🇸', 'Francês': '🇫🇷' };
    langFilters.innerHTML = [...langSet].sort((a, b) => a.localeCompare(b, 'pt-BR')).map(lang => {
        const flag = langFlags[lang] || '🌐';
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
        return '<div class="artist-item">' +
            '<span class="artist-name">' + escapeHtml(artist) + '</span>' +
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
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedStyles = Array.from(document.querySelectorAll('#styleFilters input:checked')).map(cb => cb.value);
    const selectedLangs = Array.from(document.querySelectorAll('#langFilters input:checked')).map(cb => cb.value);
    const selectedDecades = Array.from(document.querySelectorAll('#decadeFilters input:checked')).map(cb => cb.value);
    filteredSongs = allSongs.filter(song => {
        if (!songMatchesStyles(song, selectedStyles)) return false;
        if (!songMatchesLangs(song, selectedLangs)) return false;
        if (!songMatchesDecades(song, selectedDecades)) return false;
        if (searchTerm) {
            if (!song.musica.toLowerCase().includes(searchTerm) && !song.artista.toLowerCase().includes(searchTerm)) return false;
        }
        return true;
    });
    displayLimit = 100;
    renderResults();
    updateStats();
    updateFilterToggleBadge();
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
        results.innerHTML = '<div class="results-empty">Nenhuma música encontrada.</div>';
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
        const langFlags = { 'Português': '🇧🇷', 'Inglês': '🇺🇸', 'Espanhol': '🇪🇸', 'Francês': '🇫🇷' };
        const langDisplay = idiomas.map(l => langFlags[l] || l).join(' ');
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
        results.innerHTML = '<div class="results-empty">Nenhuma música encontrada.</div>';
        return;
    }
    const sorted = sortSongs(filteredSongs, 'artista', 'asc');
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
    const btn = e.target.closest('.star-btn');
    if (!btn) return;
    const artist = btn.dataset.artist;
    const song = btn.dataset.song;
    if (song) {
        const key = artist + '|' + song;
        songStates[key] = songStates[key] === 'starred' ? 'neutral' : 'starred';
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
    renderArtistList(getFilteredArtists());
    renderResults();
    updateStats();
}
function getFilteredArtists() {
    const term = artistSearch.value.toLowerCase().trim();
    return term ? uniqueArtists.filter(a => a.toLowerCase().includes(term)) : uniqueArtists;
}
artistList.addEventListener('click', (e) => {
    const btn = e.target.closest('.artist-star-btn');
    if (!btn) return;
    toggleArtistStar(btn.dataset.artist);
});
artistSearch.addEventListener('input', () => { renderArtistList(getFilteredArtists()); });
// ===== STATS =====
function updateStats() {
    const starredCount = Object.values(songStates).filter(s => s === 'starred').length;
    document.getElementById('statTotal').textContent = allSongs.length;
    document.getElementById('statFiltered').textContent = filteredSongs.length;
    document.getElementById('statStarred').textContent = starredCount;
    // Card disabled states
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
    // Dynamic instruction texts
    const filteredText = document.querySelector('[data-scope="filtered"] .stat-bar-text');
    const starredText = document.querySelector('[data-scope="starred"] .stat-bar-text');
    if (filteredText) filteredText.textContent = 'Baixe seu repertório personalizado em PDF — ' + filteredSongs.length + ' músicas';
    if (starredText) starredText.textContent = 'Baixe seu repertório personalizado em PDF — ' + starredCount + ' músicas';
}
function updateFilterToggleBadge() {
    const total = document.querySelectorAll('#styleFilters input:checked, #langFilters input:checked, #decadeFilters input:checked').length;
    if (total > 0) { filterToggleBadge.textContent = total; filterToggleBadge.classList.add('visible'); }
    else { filterToggleBadge.classList.remove('visible'); }
}
// ===== STAT CARD INTERACTIONS =====
function collapseCard(card) {
    if (!card) return;
    card.classList.remove('expanded');
    if (expandedCard === card) expandedCard = null;
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
    sortColumn = option.dataset.sort;
    sortDir = 'asc';
    sortDropdown.querySelectorAll('.sort-option').forEach(o => o.classList.remove('active'));
    option.classList.add('active');
    sortDropdown.classList.remove('visible');
    sortToggle.classList.remove('active');
    sortToggle.setAttribute('aria-expanded', 'false');
    renderResults();
});
// ===== UI EVENTS =====
filterToggle.addEventListener('click', () => { filterPanel.classList.toggle('visible'); filterToggle.classList.toggle('active'); });
clearFiltersBtn.addEventListener('click', () => {
    searchInput.value = ''; artistSearch.value = '';
    document.querySelectorAll('#styleFilters input, #langFilters input, #decadeFilters input').forEach(cb => cb.checked = false);
    songStates = {}; autocompleteLetterMode = false;
    sortColumn = 'artista'; sortDir = 'asc';
    sortDropdown.querySelectorAll('.sort-option').forEach(o => o.classList.remove('active'));
    const defaultSort = sortDropdown.querySelector('[data-sort="artista"]');
    if (defaultSort) defaultSort.classList.add('active');
    autocompleteDropdown.classList.remove('visible');
    collapseAllCards();
    renderArtistList(uniqueArtists); applyFilters();
});
styleFilters.addEventListener('change', applyFilters);
langFilters.addEventListener('change', applyFilters);
decadeFilters.addEventListener('change', applyFilters);
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
        bodyHtml += '<div class="letter-group"><span class="watermark">' + escapeHtml(letter) + '</span>';
        sortedArtists.forEach(artist => {
            bodyHtml += '<div class="artist-block"><div class="artist-name">' + escapeHtml(artist) + '</div>';
            artistGroups[artist].sort((a, b) => a.musica.localeCompare(b.musica, 'pt-BR')).forEach(song => {
                const prefix = songStates[artist + '|' + song.musica] === 'starred' ? '★ ' : '— ';
                bodyHtml += '<div class="song-line">' + prefix + escapeHtml(song.musica) + '</div>';
            });
            bodyHtml += '</div>';
        });
        bodyHtml += '<div style="clear:both;"></div></div>';
    });
    const subtitleMap = {
        'total': 'BullaAcoustic · Guilherme Bulla — Voz &amp; Violão',
        'filtered': 'BullaAcoustic · Guilherme Bulla — Repertório personalizado',
        'starred': 'BullaAcoustic · Guilherme Bulla — Repertório estrelado'
    };
    const subtitle = subtitleMap[scope] || subtitleMap['filtered'];
    const printHtml =
        '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Repertório — BullaAcoustic</title>' +
        '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">' +
        '<style>@page{margin:1.5cm 1.5cm 2cm 1.5cm}body{font-family:"Inter",sans-serif;color:#333;line-height:1.15;margin:0;padding:0}' +
        '.header{text-align:center;margin-bottom:1.2rem;border-bottom:1px solid #d4a853;padding-bottom:0.5rem}' +
        '.header h1{font-family:"Playfair Display",serif;font-size:22pt;color:#d4a853;margin:0;font-weight:700}' +
        '.header .subtitle{font-size:10pt;color:#555;margin-top:3px}' +
        '.content{column-count:2;column-gap:25px}.letter-group{margin-bottom:6px}' +
        '.watermark{float:left;font-family:"Playfair Display",serif;font-size:42pt;font-weight:bold;color:#f0e8d5;line-height:1;margin:-5px 8px -15px 0}' +
        '.artist-block{margin-bottom:4px;break-inside:avoid}.artist-name{font-weight:bold;font-size:10.5pt;color:#333}' +
        '.song-line{font-size:9.5pt;color:#444;padding-left:2px}' +
        '.footer{position:fixed;bottom:0;left:0;right:0;text-align:center;font-size:7.5pt;color:#999;padding:5px 0;border-top:1px solid #eee}' +
        '</style></head><body>' +
        '<div class="header"><h1>REPERTÓRIO</h1><div class="subtitle">' + subtitle + '</div></div>' +
        '<div class="content">' + bodyHtml + '</div>' +
        '<div class="footer">BullaAcoustic · guilhermebulla.github.io · WhatsApp (51) 98444.0402 · @guilhermebulla</div>' +
        '<scr' + 'ipt>window.onload=function(){setTimeout(function(){window.print()},600)}<' + '/scr' + 'ipt></body></html>';
    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert('Permita pop-ups para baixar o PDF.'); return; }
    printWindow.document.write(printHtml);
    printWindow.document.close();
}
// ===== INIT =====
document.addEventListener('DOMContentLoaded', loadRepertorio);
