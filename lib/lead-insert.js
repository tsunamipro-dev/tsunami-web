/* =============================================================
   Tsunami — inserción de leads (helper compartido)
   Centraliza el proyecto Supabase + la anon key en UN solo lugar
   para las dos entradas del sitio (landing "idea" y estudio "noir").
   La anon key es pública por diseño (Supabase la protege con RLS:
   `anon` solo puede INSERT en `leads`).

   Uso (classic script, sin módulos):
     window.__tsunamiInsertLead({ nombre, email, telefono, mensaje,
                                  tipo_solicitud })
   → Promise. Rechaza si Supabase no cargó o el insert falla.
   ============================================================= */
(function () {
  "use strict";

  var SUPABASE_URL = "https://zbstktplvojipfsiuqca.supabase.co";
  var SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpic3RrdHBsdm9qaXBmc2l1cWNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMTY2NTAsImV4cCI6MjA5ODc5MjY1MH0.NvGOyGGuYY2UMenrKuUHLZye5ZXPm6piCeKEDTKRghI";

  var _client = null;
  function client() {
    if (_client) return _client;
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error("Supabase SDK no disponible");
    }
    _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return _client;
  }

  // Inserta un lead. `fuente` siempre 'landing' (ambas páginas viven en el
  // sitio); la intención del cliente la distingue `tipo_solicitud`.
  window.__tsunamiInsertLead = function (lead) {
    var payload = {
      nombre: lead.nombre,
      email: lead.email,
      telefono: lead.telefono || null,
      mensaje: lead.mensaje || null,
      fuente: "landing",
      tipo_solicitud: lead.tipo_solicitud || null
    };
    return client().from("leads").insert([payload]).then(function (res) {
      if (res && res.error) throw res.error;
      return res;
    });
  };
})();
