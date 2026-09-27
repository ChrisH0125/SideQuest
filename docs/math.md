# Math on the canvas

Open **Canvas → Math** to plot a function or add an equation/working step. The same
controls are in **Your work → Equations & graphs**. Your written draft stays separate.

## Demo

1. Enter `y = x^2 - 4`, choose x from `-5` to `5`, and select **Plot on canvas**.
2. Explore x with the slider (arrow keys work). Sampled zeros appear below the plot.
3. Choose **Equation / working step** and enter `x^2 - 4 = 0` or `x^2 = 4`.
4. Ask Pip: “Plot y equals sine of x from minus six to six.”
5. Use **Edit visual** to change its expression/range. Drag to move, or use
   **Position without dragging**. Remove and Undo are supported; reload restores
   saved visuals. Clear canvas includes equations/graphs but preserves your draft.

Pip's `plot_function` and `show_equation` actions share the normal command path.
They use stable IDs, revision checks, atomic batches and replay protection. A
visual does not earn coins; ideas and completed steps retain their existing rules.
Update the Vapi system prompt using `vapi-pip-instructions.md` and restart the call
to give the voice assistant the new capabilities. Chris reports live conversation
works; graph tool delivery in a live call still needs a hands-on check.

## Supported notation

- Numbers, x, `+ - * / ^`, parentheses, implicit multiplication (`2x`, `2(x+1)`).
- Constants `pi`, `e`; `sin`, `cos`, `tan`, `sqrt`, `abs`, `ln`, `log`, `exp`.
- Function arguments need parentheses. Angles use radians; `log` is base 10.
- Graphs accept an expression, `y = ...`, or `f(x) = ...`.
- Equation visuals can also use y and one equals sign. Add each working step as
  its own visual. Powers, fractions and square roots render as native MathML.
- Expressions are capped at 240 characters, 100 tokens/nodes, 24 recursive levels.
  Up to 12 visuals per workspace. x ranges stay within ±1000 and span at least 0.1.

This pass does not support arbitrary LaTeX, arbitrary variable names, implicit
curves (`x^2 + y^2 = 1` is display-only), inequalities, calculus verification,
handwriting recognition or symbolic equation solving.

## Numerical limits

The local parser builds a bounded syntax tree; it never uses eval, Function,
external scripts, or model-generated coordinates. Plots use 401 samples. Undefined
values and large/irregular jumps split the line. Extreme y values are clipped to
an automatic view; very large values beyond 1e12 are not plotted. A short values
table provides a text alternative to the picture.

Reported zeros are numerical estimates from sampled zeros/sign changes and
bisection, capped at 12. They are not exhaustive: narrow features, rapid oscillation
and tangential roots can be missed. Discontinuities may occur between samples.
The plot and its zeros are not an algebraic proof. Formatting a student's equation
does not check its correctness. These limits also accompany Pip's math context.

## Files and checks

- `src/lib/math.ts`: parser, evaluator and bounded sampler.
- `src/lib/math-items.ts`: visual schema, placement and Pip context.
- `src/components/board/MathVisuals.tsx`: MathML, SVG graphs, editor and controls.
- `npm run test:math`: arithmetic, unsafe input, domains, singularities, actions,
  persistence, export, clear/remove/Undo and replay checks.

Existing version-1 saves remain valid; `mathItems` is optional. Saved JSON contains
only expression strings, ranges and positions. Download work includes a plain-text
list of the canvas's equations and functions.
