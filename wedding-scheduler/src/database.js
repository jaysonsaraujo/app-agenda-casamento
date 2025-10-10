/**
 * Banco de dados (Supabase) — funções utilizadas pelo app.
 * 
 * Este arquivo fornece a função:
 *   window.db.checkWeddingConflicts(params)
 *
 * Observações importantes:
 * - Requer que o cliente do Supabase esteja disponível em `window.supabaseClient`.
 *   (Ele é criado em /config/supabase.js com sua URL e ANON KEY.)
 * - Garante que `p_wedding_id` SEMPRE seja string ou null (nunca undefined),
 *   evitando a ambiguidade entre versões da função no Postgres.
 * - Normaliza o horário para HH:mm:ss; a função no banco trunca para minuto.
 */

(function () {
  'use strict';

  // --- Garantias de ambiente -------------------------------------------------
  if (!window.supabaseClient) {
    console.error(
      '[database.js] Supabase client não encontrado em window.supabaseClient. ' +
      'Verifique /config/supabase.js (URL e ANON KEY).'
    );
  }

  /**
   * Normaliza hora para "HH:mm:ss".
   * Aceita "HH:mm" ou "HH:mm:ss". Retorna string.
   */
  function normalizeTimeToSeconds(timeStr) {
    if (!timeStr) return null;
    // já vem com segundos?
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) return timeStr;
    // formato HH:mm → adiciona :00
    if (/^\d{2}:\d{2}$/.test(timeStr)) return `${timeStr}:00`;
    // fallback: tenta extrair apenas HH:mm:ss
    const m = String(timeStr).match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return null;
    return `${m[1]}:${m[2]}:${m[3] ?? '00'}`;
  }

  /**
   * Chama a RPC `check_wedding_conflicts` no banco.
   *
   * @param {Object} params
   * @param {string} params.weddingDate   - 'YYYY-MM-DD'
   * @param {string} params.weddingTime   - 'HH:mm' ou 'HH:mm:ss'
   * @param {number|string} params.locationId
   * @param {number|string} params.celebrantId
   * @param {boolean} params.isCommunity
   * @param {string|number|null} [params.weddingId=null] - id do casamento (edição). Será enviado como string ou null.
   * @returns {Promise<Array<{code:string,message:string}>>} Array de conflitos (vazio = sem conflitos)
   * @throws {Error} quando a RPC retornar erro
   */
  async function checkWeddingConflicts({
    weddingDate,
    weddingTime,
    locationId,
    celebrantId,
    isCommunity,
    weddingId = null,
  }) {
    if (!window.supabaseClient) {
      throw new Error('Supabase client ausente. Verifique a inicialização em /config/supabase.js');
    }

    const time = normalizeTimeToSeconds(weddingTime);
    const params = {
      p_wedding_date: weddingDate,                             // date
      p_wedding_time: time,                                    // time
      p_location_id: Number(locationId),                       // integer
      p_celebrant_id: Number(celebrantId),                     // integer
      p_is_community: Boolean(isCommunity),                    // boolean
      // >>> ponto crucial: string OU null (NUNCA undefined)
      p_wedding_id: weddingId == null ? null : String(weddingId), // text|null
    };

    const { data, error } = await window.supabaseClient
      .rpc('check_wedding_conflicts', params);

    if (error) {
      console.error('checkWeddingConflicts erro:', error, 'params:', params);
      throw error;
    }

    // A função retorna 0 linhas quando não há conflitos
    return Array.isArray(data) ? data : [];
  }

  // Expor API pública no namespace global usado pelo app
  window.db = window.db || {};
  window.db.checkWeddingConflicts = checkWeddingConflicts;
})();
