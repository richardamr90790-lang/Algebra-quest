/* ===================== TERMINOLOGY & FORMULA DICTIONARY =====================
   A reference view (not graded) covering the vocabulary and formulas used
   across the 34 topics, grouped the same way the home-screen regions are. */
export const DICTIONARY_SECTIONS = [
  {title:"Core Vocabulary", entries:[
    {term:"Variable", def:"A letter that stands in for a number that can change or isn't known yet.", example:"In 3x + 1, x is the variable."},
    {term:"Constant", def:"A plain number in an expression that doesn't change.", example:"In 3x + 1, the 1 is the constant."},
    {term:"Coefficient", def:"The number multiplied in front of a variable.", example:"In 3x, the coefficient is 3."},
    {term:"Term", def:"A single number, variable, or product of numbers and variables, separated from others by + or −.", example:"3x² − 5x + 1 has three terms: 3x², −5x, and 1."},
    {term:"Expression", def:"A math phrase of numbers, variables, and operations with no equals sign.", example:"4x + 7"},
    {term:"Equation", def:"A math statement that says two expressions are equal, using an = sign.", example:"4x + 7 = 15"},
    {term:"Inequality", def:"A statement comparing two expressions with <, >, ≤, or ≥ instead of an equals sign.", example:"x > 7"},
    {term:"Like Terms", def:"Terms with the exact same variable part, which can be combined by adding/subtracting their coefficients.", example:"3x and 5x are like terms; 3x and 3x² are not."},
  ]},
  {title:"Exponents & Radicals", entries:[
    {term:"Exponent", def:"The small raised number that shows how many times to multiply the base by itself.", example:"In x⁵, the exponent is 5."},
    {term:"Base", def:"The number or variable being multiplied repeatedly.", example:"In x⁵, the base is x."},
    {term:"Scientific Notation", def:"A way to write very large or very small numbers as a number between 1 and 10 times a power of 10.", example:"6.7 × 10⁴"},
    {term:"Radical", def:"The √ symbol together with whatever is underneath it.", example:"In √50, the radical is the whole √50."},
    {term:"Perfect Square", def:"A number produced by squaring a whole number.", example:"9 is a perfect square because 3 × 3 = 9."},
  ]},
  {title:"Expressions & Polynomials", entries:[
    {term:"Polynomial", def:"An expression made of added/subtracted terms with whole-number exponents.", example:"3x² + 2x − 5"},
    {term:"Monomial", def:"A polynomial with exactly one term.", example:"7x³"},
    {term:"Binomial", def:"A polynomial with exactly two terms.", example:"x + 4"},
    {term:"Trinomial", def:"A polynomial with exactly three terms.", example:"x² + 5x + 6"},
    {term:"Degree", def:"The highest exponent on the variable in a polynomial.", example:"3x⁴ + x has degree 4."},
    {term:"FOIL", def:"A way to multiply two binomials: First, Outer, Inner, Last — then combine like terms.", example:"(x+2)(x+3) = x²+3x+2x+6 = x²+5x+6"},
  ]},
  {title:"Equations & Inequalities", entries:[
    {term:"Solution", def:"A value that makes an equation or inequality true.", example:"x = 3 is the solution to x + 2 = 5."},
    {term:"System of Equations", def:"Two or more equations that share the same variables, solved together.", example:"y = x + 2 and x + y = 10"},
    {term:"Substitution Method", def:"Solving a system by replacing one variable with an equivalent expression from the other equation.", example:"If y = x + 2, substitute (x+2) in for y elsewhere."},
    {term:"Elimination Method", def:"Solving a system by adding or subtracting the equations (after scaling, if needed) so one variable cancels.", example:"2x+3y=7 and 3x−2y=4 → scale and add to cancel y."},
    {term:"Absolute Value", def:"The distance a number is from 0 on the number line — always positive or zero.", example:"|−5| = 5"},
    {term:"Compound Inequality", def:"Two inequalities joined by \"and\" (between two values) or \"or\" (two separate ranges).", example:"−3 < x < 5   or   x < −2 or x > 6"},
  ]},
  {title:"Factoring & Quadratics", entries:[
    {term:"GCF (Greatest Common Factor)", def:"The largest expression that divides evenly into every term.", example:"The GCF of 6x and 9 is 3."},
    {term:"Factoring", def:"Rewriting an expression as a product of simpler expressions that multiply back to it.", example:"x² + 5x + 6 = (x+2)(x+3)"},
    {term:"Difference of Squares", def:"A special pattern: a² − b² always factors into (a − b)(a + b).", example:"x² − 9 = (x−3)(x+3)"},
    {term:"Quadratic Equation", def:"An equation where the highest exponent on the variable is 2.", example:"x² − 5x + 6 = 0"},
    {term:"Discriminant", def:"The part of the quadratic formula under the root, b² − 4ac — it tells you how many real solutions exist.", example:"For x²−4x−1=0: discriminant = 16+4 = 20"},
    {term:"Vertex", def:"The highest or lowest point of a parabola.", example:"The parabola y = x² has its vertex at (0, 0)."},
    {term:"Parabola", def:"The U-shaped curve made by graphing a quadratic equation.", example:"y = x² graphs as a parabola opening upward."},
    {term:"Roots / Zeros / x-intercepts", def:"The x-values where a graph crosses the x-axis — these are the same as the solutions to the equation.", example:"x² − 4 = 0 has roots x = 2 and x = −2."},
  ]},
  {title:"Rational Expressions", entries:[
    {term:"Rational Expression", def:"A fraction with a polynomial in the numerator and/or denominator.", example:"(x² − 9)/(x + 3)"},
    {term:"Extraneous Solution", def:"A value that pops out of solving but doesn't actually work in the original equation (often because it makes a denominator zero).", example:"Always check your answer back in the original denominator."},
  ]},
  {title:"Graphing & Functions", entries:[
    {term:"Slope", def:"How steep a line is — the amount y changes for every 1 unit x changes.", example:"A slope of 3 means y goes up 3 for every 1 across."},
    {term:"y-intercept", def:"The point where a line crosses the y-axis (where x = 0).", example:"In y = 3x − 5, the y-intercept is −5."},
    {term:"x-intercept", def:"The point where a graph crosses the x-axis (where y = 0).", example:"The line y = 2x − 4 crosses the x-axis at x = 2."},
    {term:"Function", def:"A rule that takes an input and gives exactly one output.", example:"f(x) = x² takes any x and outputs its square."},
    {term:"Function Notation", def:"Writing f(x) instead of y, to show the output of function f for a given input x.", example:"f(−2) means \"plug −2 in for x.\""},
    {term:"Domain", def:"All the possible input (x) values a function can accept.", example:"For f(x) = 1/(x−5), the domain is all real numbers except x = 5."},
    {term:"Range", def:"All the possible output (y) values a function can produce."},
  ]},
  {title:"Key Formulas", entries:[
    {term:"Slope Formula", def:"m = (y₂ − y₁) / (x₂ − x₁)", example:"The slope between two known points."},
    {term:"Slope-Intercept Form", def:"y = mx + b, where m is the slope and b is the y-intercept.", example:"y = 3x − 5"},
    {term:"Point-Slope Form", def:"y − y₁ = m(x − x₁), used to write a line's equation from a point and a slope.", example:"y − 1 = 3(x − 2)"},
    {term:"Quadratic Formula", def:"x = (−b ± √(b² − 4ac)) / 2a, solves any quadratic ax² + bx + c = 0.", example:"Works even when factoring doesn't."},
    {term:"Difference of Squares", def:"a² − b² = (a − b)(a + b)", example:"x² − 16 = (x−4)(x+4)"},
    {term:"Direct Variation", def:"y = kx — y grows proportionally with x.", example:"More hours worked, proportionally more pay."},
    {term:"Inverse Variation", def:"y = k / x — as x grows, y shrinks proportionally.", example:"More workers, proportionally less time."},
    {term:"Exponential Growth/Decay", def:"y = a(1 ± r)ᵗ — a starting amount changing by a steady percent rate over time.", example:"Growth uses (1 + r), decay uses (1 − r)."},
    {term:"Arithmetic Sequence", def:"aₙ = a₁ + (n − 1)d — each term is the first term plus (n−1) times the common difference.", example:"2, 5, 8, 11, … has d = 3."},
  ]},
];

