/** A bounded recursive-descent parser. Only finite decimal arithmetic is accepted. */
export function arithmetic(expression: string): number {
  if (!expression.trim() || expression.length > 500)
    throw new Error("Invalid arithmetic expression");
  const tokens = expression.match(/\d+(?:\.\d+)?|\.\d+|[()+*/-]|\S/g) ?? [];
  let index = 0;
  let depth = 0;
  const finite = (value: number) => {
    if (!Number.isFinite(value)) throw new Error("Calculation is not finite");
    return value;
  };
  function atom(): number {
    if (++depth > 40) throw new Error("Expression is too deeply nested");
    const token = tokens[index++];
    let value: number;
    if (token === "+" || token === "-") value = (token === "-" ? -1 : 1) * atom();
    else if (token === "(") {
      value = sum();
      if (tokens[index++] !== ")") throw new Error("Unbalanced parentheses");
    } else if (token && /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(token)) value = Number(token);
    else throw new Error("Only numbers and arithmetic operators are allowed");
    depth--;
    return finite(value);
  }
  function product(): number {
    let value = atom();
    while (tokens[index] === "*" || tokens[index] === "/") {
      const operator = tokens[index++];
      const right = atom();
      value = finite(operator === "*" ? value * right : value / right);
    }
    return value;
  }
  function sum(): number {
    let value = product();
    while (tokens[index] === "+" || tokens[index] === "-") {
      const operator = tokens[index++];
      const right = product();
      value = finite(operator === "+" ? value + right : value - right);
    }
    return value;
  }
  const value = sum();
  if (index !== tokens.length) throw new Error("Unexpected arithmetic token");
  return value;
}

export function numericValues(text: string): number[] {
  return [...text.matchAll(/(?:\d+(?:[.,]\d+)?|[.,]\d+)/g)].map(([value]) =>
    Number(value.replace(",", ".")),
  );
}
