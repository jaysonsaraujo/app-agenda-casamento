// /src/config.js
(function () {
  'use strict';

  // IDs esperados no HTML (existem no config.html abaixo)
  const EL = {
    statsTotal: 'statTotal',
    statsMonth: 'statMonth',
    tblLocations: 'locationsTbody',
    tblCelebrants: 'celebrantsTbody',
    inputMaxPerDay: 'maxPerDay',
    inputMaxCommunityPerDay: 'maxCommunityPerDay',
    inputMaxCouplesPerCommunity: 'maxCouplesPerCommunity',
    btnSaveLimits: 'btnSaveLimits',
    toast: 'toast',
  };

  function $(id) {
    return document.getElementById(id);
  }

  function toast(msg, type = 'info') {
    const box = $(EL.toast);
    if (!box) return;
    box.textContent = msg;
    box.className = `toast ${type}`;
    box.style.display = 'block';
    setTimeout(() => (box.style.display = 'none'), 4000);
  }

  async function renderStats() {
    try {
      const sb = window.supabaseClient;
      const { data: totalRes, error: e1 } = await sb
        .from('weddings')
        .select('wedding_id', { count: 'exact', head: true });
      if (e1) throw e1;

      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

      const { error: e2, count: monthCount } = await sb
        .from('weddings')
        .select('wedding_id', { count: 'exact', head: true })
        .gte('wedding_date', first)
        .lte('wedding_date', last);

      if (e2) throw e2;

      if ($(EL.statsTotal)) $(EL.statsTotal).textContent = String(totalRes?.count ?? 0);
      if ($(EL.statsMonth)) $(EL.statsMonth).textContent = String(monthCount ?? 0);
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    }
  }

  function renderLocationsTable(list) {
    const tbody = $(EL.tblLocations);
    if (!tbody) return;
    tbody.innerHTML = '';
    list.forEach((loc) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${loc.id}</td>
        <td>${loc.name}</td>
        <td>${loc.capacity ?? '-'}</td>
        <td>${loc.is_active ? 'Ativo' : 'Inativo'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderCelebrantsTable(list) {
    const tbody = $(EL.tblCelebrants);
    if (!tbody) return;
    tbody.innerHTML = '';
    list.forEach((c) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${c.id}</td>
        <td>${c.name}</td>
        <td>${c.title ?? '-'}</td>
        <td>${c.is_active ? 'Ativo' : 'Inativo'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  async function loadConfigInputs() {
    try {
      const cfg = await window.db.getConfig();
      const map = Object.fromEntries(cfg.map((c) => [c.config_key, c.config_value]));

      if ($(EL.inputMaxPerDay)) $(EL.inputMaxPerDay).value = map.max_weddings_per_day ?? 4;
      if ($(EL.inputMaxCommunityPerDay)) $(EL.inputMaxCommunityPerDay).value = map.max_community_weddings ?? 2;
      if ($(EL.inputMaxCouplesPerCommunity)) $(EL.inputMaxCouplesPerCommunity).value = map.max_couples_per_community ?? 20;
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
    }
  }

  async function saveLimits() {
    try {
      const payload = [
        {
          config_key: 'max_weddings_per_day',
          config_type: 'int',
          config_value: String(Number($(EL.inputMaxPerDay).value || 0)),
        },
        {
          config_key: 'max_community_weddings',
          config_type: 'int',
          config_value: String(Number($(EL.inputMaxCommunityPerDay).value || 0)),
        },
        {
          config_key: 'max_couples_per_community',
          config_type: 'int',
          config_value: String(Number($(EL.inputMaxCouplesPerCommunity).value || 0)),
        },
      ];
      await window.db.upsertConfig(payload);
      toast('Limites salvos com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao salvar limites:', err);
      toast('Erro ao salvar limites.', 'error');
    }
  }

  async function init() {
    try {
      // sanity check supabase
      await window.db.ping();

      // UI
      await renderStats();
      const [locs, cels] = await Promise.all([window.db.listLocations(), window.db.listCelebrants()]);
      renderLocationsTable(locs);
      renderCelebrantsTable(cels);
      await loadConfigInputs();

      if ($(EL.btnSaveLimits)) {
        $(EL.btnSaveLimits).addEventListener('click', saveLimits);
      }
    } catch (err) {
      console.error('Falha ao inicializar configurações:', err);
      toast('Falha ao carregar configurações.', 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
