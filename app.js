/* =========================================================
   River Watch — application logic
   Separated from the original single-file HTML
   =========================================================
   NOTE: The original code was truncated mid-function
   (inside stationOverall). Everything available has been
   preserved. You will need to restore the missing portion
   for full functionality.
   ========================================================= */

(function () {
  "use strict";

  /* ═══════════════════════════════════════════════════
     SUPABASE — paste your project values here
     Dashboard → Project Settings → API
     (anon key is public by design when RLS is on)
     Then run supabase-schema.sql in the SQL Editor
     ═══════════════════════════════════════════════════ */
  const SUPABASE_URL = "https://acfeicafdgduygzhszwq.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjZmVpY2FmZGdkdXlnemhzendxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NjI4MDcsImV4cCI6MjEwNDAzODgwN30.Ajs7IVId3n1DhpECgxiOoXdvxGA7BXTCZ0db0NL_uHM";

  const url = String(SUPABASE_URL || "").trim().replace(/\/$/, "").replace(/\/rest\/v1$/i, "");
  const key = String(SUPABASE_ANON_KEY || "").trim();

  const createClientFn =
    (typeof supabase !== "undefined" && supabase.createClient) ||
    (typeof window !== "undefined" && window.supabase && window.supabase.createClient) ||
    null;

  const configured =
    !!createClientFn &&
    url.startsWith("https://") &&
    url.includes(".supabase.co") &&
    !url.includes("YOUR_PROJECT") &&
    key.length > 20 &&
    !key.includes("YOUR_SUPABASE");

  let sb = null;
  let configError = null;

  if (!createClientFn) {
    configError = "Supabase library failed to load (check network / ad blockers)";
  } else if (!configured) {
    configError = "Credentials still look like placeholders — paste Project URL + anon key";
  } else {
    try {
      sb = createClientFn(url, key);
    } catch (e) {
      configError = "Invalid Supabase client config: " + (e && e.message ? e.message : e);
    }
  }

  /* ---------- Constants ---------- */
  const CATEGORIES = [
    { id: "trash", label: "Trash", pin: "#B45309" },
    { id: "algae_bloom", label: "Algae bloom", pin: "#4D7C0F" },
    { id: "oil_spill", label: "Oil spill", pin: "#3F3F46" },
    { id: "dead_fish", label: "Dead fish", pin: "#3F4A6B" },
    { id: "erosion", label: "Erosion", pin: "#9A3412" },
    { id: "discoloration", label: "Discoloration", pin: "#9F1239" },
    { id: "odor", label: "Odor", pin: "#0E7490" },
    { id: "other", label: "Other", pin: "#64748B" },
  ];
  const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

  const STATIONS = [
    { id: "st1", name: "Rowlett Park", source: "EPC Hillsborough", lat: 28.0128, lng: -82.4232, ph: 7.2, turbidity: 4.5, temp: 24.1, do: 6.8, updated: "2026-08-28" },
    { id: "st2", name: "Lettuce Lake Park", source: "USGS", lat: 28.0611, lng: -82.3559, ph: 7.6, turbidity: 8.2, temp: 25.3, do: 6.1, updated: "2026-08-30" },
    { id: "st3", name: "Sulphur Springs", source: "Water Atlas", lat: 28.0175, lng: -82.4548, ph: 7.0, turbidity: 15.6, temp: 26.0, do: 4.9, updated: "2026-08-26" },
    { id: "st4", name: "Downtown Riverwalk", source: "FDEP", lat: 27.9481, lng: -82.4593, ph: 7.9, turbidity: 22.1, temp: 27.2, do: 5.2, updated: "2026-08-29" },
    { id: "st5", name: "Temple Terrace Bridge", source: "EPC Hillsborough", lat: 28.0353, lng: -82.3903, ph: 6.7, turbidity: 30.4, temp: 25.9, do: 3.8, updated: "2026-08-27" },
  ];
  const STATION = Object.fromEntries(STATIONS.map((s) => [s.id, s]));

  const MAP_CENTER = [27.9906, -82.4227];

  const ARTICLES = [
    {
      id: "a1",
      title: "Understanding pH in river water",
      category: "Water quality",
      dek: "How acidic or basic the Hillsborough River is — and why fish care.",
      blocks: [
        { t: "h", text: "What pH measures" },
        { t: "p", text: "pH is a 0–14 scale of how acidic or basic water is. Most healthy freshwater rivers sit between 6.5 and 8.5." },
        { t: "ul", items: ["Below 6.5: too acidic.", "6.5–8.5: healthy range.", "Above 8.5: often algae or industrial discharge."] },
        { t: "callout", text: "Watch trends after storms before assuming a lasting problem." },
      ],
    },
    {
      id: "a2",
      title: "Turbidity: why cloudy water matters",
      category: "How to interpret",
      dek: "Clarity is a simple field clue for sediment, algae, and storm runoff.",
      blocks: [
        { t: "h", text: "Reading NTU values" },
        { t: "p", text: "Turbidity measures particles suspended in the water. After storms the Hillsborough often turns the color of tea with milk." },
        { t: "ul", items: ["0–10 NTU: good.", "10–25 NTU: moderate after rain.", "25+ NTU: poor — erosion or bloom."] },
      ],
    },
    {
      id: "a3",
      title: "Dissolved oxygen and fish health",
      category: "Water quality",
      dek: "Fish breathe oxygen dissolved in water.",
      blocks: [
        { t: "ul", items: ["6+ mg/L: good.", "4–6 mg/L: moderate stress.", "Below 4 mg/L: fish kills become likely."] },
      ],
    },
    {
      id: "a4",
      title: "The Hillsborough River: a conservation timeline",
      category: "River health",
      dek: "Pressure, restoration, and community reports.",
      blocks: [
        { t: "p", text: "Decades of industrial and urban pressure have been partly offset by wetlands, the Riverwalk, and tighter stormwater rules." },
        { t: "callout", text: "Official stations are sparse. A photo and pin between them is often the first signal agencies get." },
      ],
    },
    {
      id: "a5",
      title: "How to use a portable water sensor kit",
      category: "Sensor use",
      dek: "A field routine that keeps readings comparable.",
      blocks: [
        { t: "ul", items: ["Rinse the probe before each dip.", "Submerge at a consistent depth.", "Wait for a stable reading.", "Always record a location."] },
      ],
    },
    {
      id: "a6",
      title: "Spotting an algae bloom",
      category: "River health",
      dek: "Color, scum, and smell.",
      blocks: [
        { t: "p", text: "Blooms show as green or blue-green surface film, sometimes with a grassy odor." },
        { t: "callout", text: "Report with a photo. Keep pets and kids out of discolored water until checked." },
      ],
    },
  ];

  const SEED_REPORTS = [
    { id: "r1", title: "Trash snagged at the Rowlett boat ramp", description: "Plastic bottles and bags along the cypress edge.", category: "trash", lat: 28.0124, lng: -82.4228, photoUrl: null, status: "pending", upvotes: 12, createdAt: "2026-09-02T13:10:00.000-04:00" },
    { id: "r2", title: "Green surface scum at Sulphur Springs", description: "Pea-green film downstream of the springs.", category: "algae_bloom", lat: 28.0171, lng: -82.4542, photoUrl: null, status: "reviewed", upvotes: 21, createdAt: "2026-09-01T09:40:00.000-04:00" },
    { id: "r3", title: "Rainbow sheen along the Riverwalk seawall", description: "Iridescent film about 8 feet across.", category: "oil_spill", lat: 27.9486, lng: -82.459, photoUrl: null, status: "pending", upvotes: 9, createdAt: "2026-08-31T18:05:00.000-04:00" },
    { id: "r4", title: "Chocolate-brown water after the storm", description: "Opaque water after overnight rain.", category: "discoloration", lat: 27.9498, lng: -82.4584, photoUrl: null, status: "pending", upvotes: 6, createdAt: "2026-08-30T08:20:00.000-04:00" },
    { id: "r5", title: "Bank sloughing at Temple Terrace", description: "Clay bank collapsed overnight.", category: "erosion", lat: 28.035, lng: -82.3908, photoUrl: null, status: "reviewed", upvotes: 14, createdAt: "2026-08-29T16:45:00.000-04:00" },
  ];

  const SEED_READINGS = [
    { id: "s1", stationName: "Rowlett Park dock", lat: 28.0129, lng: -82.423, ph: 7.1, turbidity: 5.2, temp: 24.4, do: 6.6, notes: "Clear, slight tannic color.", photoUrl: null, createdAt: "2026-08-31T10:15:00.000-04:00" },
  ];

  /* ---------- Device identity (localStorage) ---------- */
  const DEVICE_KEY = "rw-device-id";

  function getDeviceId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = "d_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }

  const deviceId = getDeviceId();

  const MINE_KEY = "rw-mine-ids";

  function getMineIds() {
    try {
      return JSON.parse(localStorage.getItem(MINE_KEY) || "[]");
    } catch (_) {
      return [];
    }
  }

  function markMine(id) {
    const ids = getMineIds();
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem(MINE_KEY, JSON.stringify(ids));
    }
  }

  /* ---------- App state ---------- */
  let state = {
    reports: [],
    readings: [],
    upvotedIds: [],
    connection: sb ? "loading" : "offline",
    errorDetail: configError || null,
  };

  /* ---------- Data helpers ---------- */
  function mapReportRow(row) {
    return {
      id: row.id,
      title: row.title,
      description: row.description || "",
      category: row.category,
      lat: row.lat,
      lng: row.lng,
      photoUrl: row.photo_url || null,
      status: row.status || "pending",
      upvotes: row.upvotes || 0,
      createdAt: row.created_at,
    };
  }

  function mapReadingRow(row) {
    return {
      id: row.id,
      stationName: row.station_name,
      lat: row.lat,
      lng: row.lng,
      ph: row.ph,
      turbidity: row.turbidity,
      temp: row.temp,
      do: row.dissolved_oxygen,
      notes: row.notes || "",
      photoUrl: row.photo_url || null,
      createdAt: row.created_at,
    };
  }

  function errMessage(err) {
    if (!err) return "Unknown error";
    if (typeof err === "string") return err;
    return err.message || err.error_description || err.details || err.hint || JSON.stringify(err);
  }

  /* ---------- Supabase operations ---------- */
  async function loadFromSupabase() {
    if (!sb) {
      state.reports = SEED_REPORTS.slice();
      state.readings = SEED_READINGS.slice();
      state.connection = "offline";
      state.errorDetail = configError || "Supabase not configured";
      return;
    }

    try {
      const [repRes, readRes, upRes] = await Promise.all([
        sb.from("reports").select("*").order("created_at", { ascending: false }),
        sb.from("sensor_readings").select("*").order("created_at", { ascending: false }),
        sb.from("report_upvotes").select("report_id").eq("device_id", deviceId),
      ]);

      if (repRes.error) throw repRes.error;
      if (readRes.error) throw readRes.error;

      if (upRes.error) {
        console.warn("report_upvotes:", upRes.error);
        state.upvotedIds = [];
      } else {
        state.upvotedIds = (upRes.data || []).map((u) => u.report_id);
      }

      state.reports = (repRes.data || []).map(mapReportRow);
      state.readings = (readRes.data || []).map(mapReadingRow);
      state.connection = "live";
      state.errorDetail = null;
    } catch (err) {
      console.error("Supabase load failed", err);
      state.reports = SEED_REPORTS.slice();
      state.readings = SEED_READINGS.slice();
      state.connection = "error";
      state.errorDetail = errMessage(err);
      toast("Supabase error: " + state.errorDetail);
    }
  }

  async function insertReport(report) {
    if (!sb) {
      state.reports.unshift(report);
      markMine(report.id);
      return report;
    }

    const { data, error } = await sb
      .from("reports")
      .insert({
        id: report.id,
        title: report.title,
        description: report.description,
        category: report.category,
        lat: report.lat,
        lng: report.lng,
        photo_url: report.photoUrl,
        status: report.status,
        upvotes: 0,
        created_at: report.createdAt,
      })
      .select()
      .single();

    if (error) throw error;

    const mapped = mapReportRow(data);
    state.reports.unshift(mapped);
    markMine(mapped.id);
    return mapped;
  }

  async function upvoteReport(id) {
    if (state.upvotedIds.includes(id)) return;

    const report = state.reports.find((r) => r.id === id);
    if (!report) return;

    if (!sb) {
      report.upvotes += 1;
      state.upvotedIds.push(id);
      return;
    }

    const { error: upErr } = await sb
      .from("report_upvotes")
      .insert({ report_id: id, device_id: deviceId });

    if (upErr && upErr.code !== "23505") throw upErr;

    if (!upErr) {
      await sb.from("reports").update({ upvotes: report.upvotes + 1 }).eq("id", id);
      report.upvotes += 1;
      state.upvotedIds.push(id);
    }
  }

  async function insertReading(reading) {
    if (!sb) {
      state.readings.unshift(reading);
      markMine(reading.id);
      return reading;
    }

    const { data, error } = await sb
      .from("sensor_readings")
      .insert({
        id: reading.id,
        station_name: reading.stationName,
        lat: reading.lat,
        lng: reading.lng,
        ph: reading.ph,
        turbidity: reading.turbidity,
        temp: reading.temp,
        dissolved_oxygen: reading.do,
        notes: reading.notes,
        photo_url: reading.photoUrl,
        created_at: reading.createdAt,
      })
      .select()
      .single();

    if (error) throw error;

    const mapped = mapReadingRow(data);
    state.readings.unshift(mapped);
    markMine(mapped.id);
    return mapped;
  }

  /* ---------- Utility helpers ---------- */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function timeAgo(iso) {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "";

    const mins = Math.floor((Date.now() - then) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";

    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";

    const days = Math.floor(hrs / 24);
    if (days < 30) return days + "d ago";

    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function phQ(v) {
    if (v == null || Number.isNaN(v)) return { label: "No data", tone: "muted" };
    if (v >= 6.5 && v <= 8.5) return { label: "Good", tone: "good" };
    if (v >= 6 && v < 9) return { label: "Moderate", tone: "moderate" };
    return { label: "Poor", tone: "poor" };
  }

  function turbQ(v) {
    if (v == null || Number.isNaN(v)) return { label: "No data", tone: "muted" };
    if (v <= 10) return { label: "Good", tone: "good" };
    if (v <= 25) return { label: "Moderate", tone: "moderate" };
    return { label: "Poor", tone: "poor" };
  }

  function doQ(v) {
    if (v == null || Number.isNaN(v)) return { label: "No data", tone: "muted" };
    if (v >= 6) return { label: "Good", tone: "good" };
    if (v >= 4) return { label: "Moderate", tone: "moderate" };
    return { label: "Poor", tone: "poor" };
  }

  function stationOverall(s) {
    const tones = [
      // ⚠️ ORIGINAL CODE WAS TRUNCATED HERE
      // The rest of this function (and everything after it) is missing
      // from the provided source. Please restore the complete logic.
    ];
    // Temporary placeholder so the app doesn't crash
    return { label: "Unknown", tone: "muted" };
  }

  /* =========================================================
     TODO: The original script continued after stationOverall.
     You will need to restore the remaining code that handles:
       - Toast notifications
       - Routing / view rendering
       - Map initialization & markers
       - Report list, filters, compose form
       - Station detail, article detail
       - Profile / "my contributions"
       - Event listeners & boot sequence
     ========================================================= */

  // Minimal toast helper so the load error path still works
  function toast(message) {
    const host = document.getElementById("toasts");
    if (!host) return;

    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    host.appendChild(el);

    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity 200ms";
      setTimeout(() => el.remove(), 220);
    }, 3200);
  }

  // Boot: attempt to load data
  loadFromSupabase().then(() => {
    console.log("River Watch ready. Connection:", state.connection);
    // Full rendering / routing would start here once the missing code is restored.
  });

})();
