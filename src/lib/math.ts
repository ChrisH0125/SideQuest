// Small, bounded math grammar. Never executes JavaScript or model-generated code.
export type MathExpression =
  | { type: "number"; value: number }
  | { type: "symbol"; name: "x" | "y" | "pi" | "e" }
  | { type: "unary"; sign: "+" | "-"; value: MathExpression }
  | { type: "binary"; op: "+" | "-" | "*" | "/" | "^"; left: MathExpression; right: MathExpression }
  | { type: "function"; name: string; argument: MathExpression };

const FUNCTIONS: Record<string, (value: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, sqrt: Math.sqrt,
  abs: Math.abs, ln: Math.log, log: Math.log10, exp: Math.exp,
};
export const MATH_HELP = "Use x, numbers, + − * / ^, parentheses, pi, e, sin, cos, tan, sqrt, abs, ln, log or exp. Angles are radians.";

function normalize(input: string) {
  if (input.length > 240) throw new Error("Keep each expression under 240 characters.");
  return input.trim().toLowerCase().replaceAll("−", "-").replaceAll("×", "*").replaceAll("÷", "/").replaceAll("π", "pi").replaceAll("²", "^2").replaceAll("³", "^3");
}

export function parseExpression(input: string, allowY = false): MathExpression {
  const source = normalize(input);
  if (!source) throw new Error("Enter an expression first.");
  const tokens: string[] = [];
  let offset = 0;
  while (offset < source.length) {
    const rest = source.slice(offset);
    const match = /^(\s+|(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[a-z]+|[()+\-*/^])/.exec(rest);
    if (!match) throw new Error("That notation is not supported. " + MATH_HELP);
    offset += match[0].length;
    if (match[0].trim()) tokens.push(match[0]);
    if (tokens.length > 100) throw new Error("This expression is too complex. Split it into smaller steps.");
  }
  let cursor = 0, nodes = 0;
  function expression(minBinding = 0, depth = 0): MathExpression {
    if (depth > 24 || ++nodes > 100) throw new Error("This expression is too complex. Split it into smaller steps.");
    const token = tokens[cursor++];
    let left: MathExpression;
    if (!token) throw new Error("The expression is unfinished. Check its operators and parentheses.");
    if (/^(\d|\.)/.test(token)) {
      const value = Number(token);
      if (!Number.isFinite(value) || Math.abs(value) > 1e12) throw new Error("Use numbers no larger than one trillion.");
      left = { type: "number", value };
    } else if (token === "x" || token === "pi" || token === "e" || (allowY && token === "y")) {
      left = { type: "symbol", name: token };
    } else if (token === "+" || token === "-") {
      left = { type: "unary", sign: token, value: expression(25, depth + 1) };
    } else if (token === "(") {
      left = expression(0, depth + 1);
      if (tokens[cursor++] !== ")") throw new Error("Close each opening parenthesis.");
    } else if (Object.hasOwn(FUNCTIONS, token)) {
      if (tokens[cursor++] !== "(") throw new Error(`Write ${token} with parentheses, such as ${token}(x).`);
      left = { type: "function", name: token, argument: expression(0, depth + 1) };
      if (tokens[cursor++] !== ")") throw new Error("Close each function's parenthesis.");
    } else throw new Error("Unknown symbol. " + MATH_HELP);

    while (cursor < tokens.length) {
      const next = tokens[cursor];
      if (next === ")") break;
      // Numeric coefficients and adjacent groups: 2x, 2(x+1), (x+1)(x-1).
      const implicit = next === "(" || /^[a-z]/.test(next);
      const op = implicit ? "*" : next;
      const binding = op === "+" || op === "-" ? 10 : op === "*" || op === "/" ? 20 : op === "^" ? 30 : -1;
      if (binding < minBinding || binding < 0) break;
      if (!implicit) cursor++;
      const right = expression(op === "^" ? binding : binding + 1, depth + 1);
      if (++nodes > 100) throw new Error("This expression is too complex.");
      left = { type: "binary", op: op as "+" | "-" | "*" | "/" | "^", left, right };
    }
    return left;
  }
  const tree = expression();
  if (cursor !== tokens.length) throw new Error("Check the expression's parentheses and operators.");
  return tree;
}

export function parseEquation(input: string): MathExpression[] {
  const parts = normalize(input).split("=");
  if (parts.length > 2) throw new Error("Use one equation per visual. Add each working step separately.");
  return parts.map(part => parseExpression(part, true));
}

export function parseFunction(input: string): MathExpression {
  return parseExpression(normalize(input).replace(/^(?:y|f\(x\))\s*=\s*/, ""));
}

export function evaluateExpression(tree: MathExpression, x: number): number {
  switch (tree.type) {
    case "number": return tree.value;
    case "symbol": return tree.name === "x" ? x : tree.name === "pi" ? Math.PI : tree.name === "e" ? Math.E : NaN;
    case "unary": return (tree.sign === "-" ? -1 : 1) * evaluateExpression(tree.value, x);
    case "function": return FUNCTIONS[tree.name](evaluateExpression(tree.argument, x));
    case "binary": {
      const a = evaluateExpression(tree.left, x), b = evaluateExpression(tree.right, x);
      switch (tree.op) {
        case "+": return a + b; case "-": return a - b; case "*": return a * b;
        case "/": return b === 0 ? NaN : a / b; case "^": return Math.pow(a, b);
      }
    }
  }
}

export type GraphSample = { x: number; y: number | null };
export function sampleFunction(expression: string, xMin: number, xMax: number) {
  if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMin < -1000 || xMax > 1000 || xMax - xMin < 0.1) {
    throw new Error("Choose an x range between −1000 and 1000, at least 0.1 wide.");
  }
  const tree = parseFunction(expression);
  const evaluate = (x: number) => {
    const y = evaluateExpression(tree, x);
    return Number.isFinite(y) && Math.abs(y) <= 1e12 ? y : null;
  };
  const points: GraphSample[] = Array.from({ length: 401 }, (_, i) => {
    const x = xMin + (xMax - xMin) * i / 400;
    return { x, y: evaluate(x) };
  });
  const values = points.flatMap(point => point.y === null ? [] : [point.y]).sort((a, b) => a - b);
  if (values.length < 2) throw new Error("No plottable real values in this range. Try a different expression or x range.");
  // Trim extreme tails so an asymptote cannot flatten the rest of a graph.
  const low = Math.min(0, values[Math.floor(values.length * 0.05)]);
  const high = Math.max(0, values[Math.floor((values.length - 1) * 0.95)]);
  const padding = Math.max((high - low) * 0.12, 1);
  const roughStep = (high - low + padding * 2) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = ([1, 2, 5, 10].find(value => value * magnitude >= roughStep) ?? 10) * magnitude;
  const yMin = Math.floor((low - padding) / step) * step, yMax = Math.ceil((high + padding) / step) * step;
  const yTicks = Array.from({ length: Math.round((yMax - yMin) / step) + 1 }, (_, i) => yMin + i * step);
  const zeros: number[] = [];
  const addZero = (x: number) => { if (zeros.length < 12 && !zeros.some(value => Math.abs(value - x) < 1e-5)) zeros.push(x); };
  for (let i = 0; i < points.length; i++) {
    const point = points[i], previous = points[i - 1];
    if (point.y === 0) addZero(point.x);
    if (!previous || point.y === null || previous.y === null || point.y * previous.y >= 0) continue;
    let a = previous.x, b = point.x, fa = previous.y;
    const tolerance = Math.min(1e-9, Math.min(Math.abs(previous.y), Math.abs(point.y)) * 1e-6);
    for (let n = 0; n < 40; n++) {
      const middle = (a + b) / 2, fm = evaluate(middle);
      if (fm === null) break;
      if (fm === 0 || Math.abs(fm) < tolerance) { addZero(middle); break; }
      if (fa * fm < 0) b = middle; else { a = middle; fa = fm; }
    }
  }
  return { points, yMin, yMax, yTicks, zeros: zeros.sort((a, b) => a - b), tree };
}

export function formatNumber(value: number) {
  return Math.abs(value) < 1e-10 ? "0" : Number(value.toPrecision(5)).toString();
}
