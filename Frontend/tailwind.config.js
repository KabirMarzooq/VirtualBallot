/** @type {import('tailwindcss').Config} */

/* ════════════════════════════════════════════════════════════════════════
   DEEP GREEN & PAPER — product-wide palette
   ════════════════════════════════════════════════════════════════════════
   The white "Paper" chrome from palette C in mockups/dashboard-palettes.html
   (a white rail separated by a hairline, light canvas, no dark slab) carrying
   the Oxford deep green of palette D as its brand and primary action colour.

   So: paper surfaces, deep green ink. Neutrals stay a cool zinc ramp — that
   is what "Paper" is — and the semantic colours (approved green, pending
   amber, danger red) keep their meanings. Note that the chrome green and the
   semantic "approved" green are deliberately far apart: oxford-600 is dark
   and desaturated, success is light and saturated, so the two never read as
   the same signal.

   Rather than rewrite ~700 utility classes across 40 files, the `blue` and
   `slate` ramps are REMAPPED here: every existing `bg-blue-600`,
   `text-slate-600`, etc. now renders the Deep Green & Paper tone.

   ⚠️  So `blue-*` is deep green and `slate-*` is zinc. The class names are a
   compatibility shim, not a description. `oxford-*` and `zinc-*` are exposed
   as correctly-named aliases — use those in new code. A follow-up rename can
   retire the shim without any visual change.
   ════════════════════════════════════════════════════════════════════════ */

// Oxford deep green — the brand and primary action colour. Monotonic
// light → dark, so a hover on a green button darkens normally:
// `bg-blue-600 hover:bg-blue-700` is #1F4636 → #163227.
const oxford = {
  50: "#F2F7F3", // selected fill — reads against a white card
  100: "#DFEBE3", // chip / tint
  200: "#C2D6C9", // accent border, selection ring
  300: "#8FB3A0",
  400: "#5C8A70",
  500: "#37634E", // focus border
  600: "#1F4636", // primary action
  700: "#163227", // hover / pressed
  800: "#1E3A2C", // dark surface (auth cards)
  900: "#14261E", // deepest dark surface (inputs inside dark cards)
  950: "#0D1F18",
};

// Neutrals — Tailwind's zinc, exactly. This is the "Paper" half: white
// surfaces, a #FAFAFA canvas and hairline rules, with near-black type.
const zinc = {
  50: "#FAFAFA", // page canvas
  100: "#F4F4F5", // secondary surface / active nav
  200: "#E4E4E7", // hairline rules and borders
  300: "#D4D4D8", // strong border
  400: "#A1A1AA", // muted text (meta only)
  500: "#71717A", // secondary text
  600: "#52525B", // body text
  700: "#3F3F46",
  800: "#27272A", // primary text
  900: "#18181B", // heading text
  950: "#09090B",
};

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Correctly-named aliases — prefer these going forward.
        oxford,
        zinc,
        // Compatibility shim — remaps the old blue/white system.
        blue: oxford,
        slate: zinc,
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};
