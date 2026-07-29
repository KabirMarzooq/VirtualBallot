/** @type {import('tailwindcss').Config} */

/* ════════════════════════════════════════════════════════════════════════
   OXFORD GREEN — product-wide palette
   ════════════════════════════════════════════════════════════════════════
   The whole product was previously blue/white. Rather than rewrite ~500
   utility classes across 40 files, the `blue` and `slate` ramps are
   REMAPPED here: every existing `bg-blue-600`, `text-slate-600`, etc. now
   renders the Oxford Green tone.

   ⚠️  So `blue-*` is green and `slate-*` is a warm sage-grey. The class
   names are a compatibility shim, not a description. `oxford-*` and
   `sage-*` are exposed as correctly-named aliases — use those in new code.
   A follow-up rename can retire the shim without any visual change.
   ════════════════════════════════════════════════════════════════════════ */

// Deep green — the brand and primary action colour.
const oxford = {
  50:  "#F2F7F3",
  100: "#DFEBE3",
  200: "#C2D6C9",
  300: "#8FB3A0",
  400: "#5C8A70",
  500: "#37634E",
  600: "#1F4636", // primary action
  700: "#163227", // hover / active
  800: "#1E3A2C", // console: active nav (sits above the rail)
  900: "#14261E", // console: sidebar rail
  950: "#0D1F18",
};

// Warm, faintly green-tinged neutrals. Cool slate greys clash with Oxford.
const sage = {
  50:  "#F7F8F6",
  100: "#EDEFEB",
  200: "#DFE2DC",
  300: "#C4C9C0",
  400: "#8A928A",
  500: "#6E766E",
  600: "#565E57",
  700: "#3D453E",
  800: "#2A312B",
  900: "#161B17",
  950: "#0C100D",
};

// Muted brass — the single decorative accent (crest, active markers).
const brass = {
  50:  "#FAF6EB",
  100: "#F3EAD1",
  200: "#E6D5A8",
  300: "#D2BC7C",
  500: "#B08D3F",
  600: "#96762F",
  700: "#7A5F25",
};

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Correctly-named aliases — prefer these going forward.
        oxford,
        sage,
        brass,
        // Compatibility shim — remaps the old blue/white system.
        blue: oxford,
        slate: sage,
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
}
