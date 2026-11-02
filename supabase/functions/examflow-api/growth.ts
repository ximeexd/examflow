// examflow-api — pure growth helpers: start_param parsing and funnel-event
// prop sanitization. Plain JS + `export` (like examflow-remind/due.ts) so the
// same file is importable by Deno and evaluable in the Edge-based test
// harness — no TypeScript-only syntax here.
export const START_PARAM_RE = /^[A-Za-z0-9_-]{1,64}$/;
export const REF_RE = /^ref_([1-9][0-9]{0,19})$/;

// Parse the HMAC-validated initData `start_param` into a sanitized
// {source, referrer} pair. Anything failing the whitelist is ignored.
// ref_<digits> → {source:'ref', referrer}; everything else is an opaque
// source tag (lowercased).
export function parseStartParam(raw) {
    if (typeof raw !== "string") return null;
    const v = raw.trim();
    if (!START_PARAM_RE.test(v)) return null;
    const m = v.match(REF_RE);
    if (m) return { source: "ref", referrer: m[1] };
    return { source: v.toLowerCase(), referrer: null };
}

export const TRACK_NAMES = new Set([
    "app_open", "onboarding_done", "lesson_finish",
    "invite_share", "mistakes_open", "number_input_used",
]);

const PROP_KEY_RE = /^[a-z_]{1,20}$/;

// props: plain object, at most 6 whitelisted keys, values limited to
// string(≤40)/finite number/boolean. Invalid entries are dropped.
export function normTrackProps(raw) {
    const out = {};
    if (typeof raw !== "object" || !raw || Array.isArray(raw)) return out;
    for (const k of Object.keys(raw)) {
        if (Object.keys(out).length >= 6) break;
        if (!PROP_KEY_RE.test(k)) continue;
        const v = raw[k];
        if (typeof v === "string") out[k] = v.slice(0, 40);
        else if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
        else if (typeof v === "boolean") out[k] = v;
    }
    return out;
}
