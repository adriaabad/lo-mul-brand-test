(function () {
  "use strict";

  function clean(value) {
    return typeof value === "string" ? value.trim().replace(/\/$/, "") : "";
  }

  function isConfigured(config) {
    const url = clean(config.SUPABASE_URL);
    const key = clean(config.SUPABASE_PUBLISHABLE_KEY || config.SUPABASE_ANON_KEY);
    return Boolean(
      url &&
        key &&
        !url.includes("YOUR-PROJECT") &&
        !key.includes("YOUR-PUBLISHABLE-KEY") &&
        !key.includes("YOUR-ANON-PUBLIC-KEY"),
    );
  }

  async function submit(config, payload) {
    if (!isConfigured(config)) {
      throw new Error("Supabase no està configurat.");
    }

    const key = clean(config.SUPABASE_PUBLISHABLE_KEY || config.SUPABASE_ANON_KEY);
    const response = await fetch(`${clean(config.SUPABASE_URL)}/rest/v1/rpc/submit_visual_test`, {
      method: "POST",
      headers: {
        apikey: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || `Error de Supabase (${response.status}).`);
    }

    return true;
  }

  window.LoMulSupabase = { isConfigured, submit };
})();
