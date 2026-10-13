import type { Rule } from "./types";
import { fragmentationRule } from "./fragmentation";
import { postClickLeakRule } from "./post-click-leak";
import { concentrationRule } from "./concentration";
import { learningThinRule } from "./learning-thin";

/**
 * Registered rules. Order matters for deterministic insight numbering.
 * Add new rules here.
 */
export const RULES: Rule[] = [
  fragmentationRule,
  learningThinRule,
  concentrationRule,
  postClickLeakRule,
];

export type { Rule, RuleContext } from "./types";
