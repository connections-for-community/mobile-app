export type PersonalityOption = {
  value: string;
  label: string;
  traits: string;
};

export const PERSONALITY_OPTIONS: PersonalityOption[] = [
  {
    value: "Introvert-Creative-Chill",
    label: "Cozy Dreamer",
    traits: "Introvert / Creative / Chill",
  },
  {
    value: "Introvert-Creative-Active",
    label: "Quiet Adventurer",
    traits: "Introvert / Creative / Active",
  },
  {
    value: "Introvert-Analytical-Chill",
    label: "Thoughtful Strategist",
    traits: "Introvert / Analytical / Chill",
  },
  {
    value: "Introvert-Analytical-Active",
    label: "Focused Explorer",
    traits: "Introvert / Analytical / Active",
  },
  {
    value: "Extrovert-Creative-Chill",
    label: "Social Muse",
    traits: "Extrovert / Creative / Chill",
  },
  {
    value: "Extrovert-Creative-Active",
    label: "Vibrant Creator",
    traits: "Extrovert / Creative / Active",
  },
  {
    value: "Extrovert-Analytical-Chill",
    label: "Clever Connector",
    traits: "Extrovert / Analytical / Chill",
  },
  {
    value: "Extrovert-Analytical-Active",
    label: "Dynamic Problem Solver",
    traits: "Extrovert / Analytical / Active",
  },
];

const PERSONALITY_LABEL_MAP = PERSONALITY_OPTIONS.reduce<Record<string, string>>(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {},
);

export const getPersonalityLabel = (value?: string | null) =>
  (value ? PERSONALITY_LABEL_MAP[value] : null) ?? value ?? "Not set";
