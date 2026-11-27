// fila.js: ordenação única da fila (mesa.html e pedidos.html).
// Regra: ordem manual > rodízio do show atual > apoios > chegada.
// O rodízio conta tocada, pulada ou devolvida (contouRodizio) com show igual ao show atual.
(function () {
  function seg(ts) { return (ts && ts.seconds) || 0; }

  function ordenarFila(todos, showAtual, apoios = {}) {
    const feitos = {};
    for (const p of todos) {
      if ((p.status === 'tocada' || p.status === 'pulada' || p.contouRodizio === true) && p.show === showAtual) {
        const k = (p.requesterKey || '').toLowerCase();
        feitos[k] = (feitos[k] || 0) + 1;
      }
    }
    return todos
      .filter(p => p.status === 'fila' && p.show === showAtual)
      .sort((a, b) => {
        const oa = (a.ordem != null) ? a.ordem : Infinity;
        const ob = (b.ordem != null) ? b.ordem : Infinity;
        if (oa !== ob) return oa - ob;
        const ka = (a.requesterKey || '').toLowerCase();
        const kb = (b.requesterKey || '').toLowerCase();
        if ((feitos[ka] || 0) !== (feitos[kb] || 0)) {
          return (feitos[ka] || 0) - (feitos[kb] || 0);
        }
        const ap = (apoios[b.id] || 0) - (apoios[a.id] || 0);
        if (ap !== 0) return ap;
        return seg(a.createdAt) - seg(b.createdAt);
      });
  }

  window.BullaFila = { ordenarFila: ordenarFila };
})();
