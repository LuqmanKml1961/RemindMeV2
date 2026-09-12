#!/usr/bin/env node

const RULES = [
  'Always plan properly before acting.',
  'Do not hallucinate.',
  'Do not guess.',
  'Check everything against its source and validate it.',
  'Clean code implementation.',
  'Do not introduce bugs or break other unrelated modules.',
  'Do not create something that does not exist in the codebase.',
  'Do not overengineer.',
  "Do not push; only commit, and only after the user's confirmation. Use a proper prefix and message for the commit.",
  'Avoid using co-authored-by Claude in commits.',
  'Use comments only when needed, not everywhere.',
];

const additionalContext = [
  "Standing rules for this session (from the user's earlier instruction):",
  ...RULES.map((rule, index) => `${index + 1}. ${rule}`),
].join('\n');

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'UserPromptSubmit',
    additionalContext,
  },
}));
