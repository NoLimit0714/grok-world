/**
 * Fan crew roster — original little-person avatars in TNG-style department colors.
 * Not affiliated with Paramount; roles are generic bridge positions.
 */
export interface CrewDef {
  id: string;
  name: string;
  rank: string;
  role: string;
  /** command | ops | science | medical | civilian */
  department: "command" | "ops" | "science" | "medical" | "civilian";
  uniform: string;
  skin: string;
  hair: string;
  homeRoom: string;
  /** sprite variant 0-3 for body shape */
  sprite: number;
}

export const CREW: CrewDef[] = [
  {
    id: "grok",
    name: "Grok",
    rank: "Lt.",
    role: "Ops AI",
    department: "ops",
    uniform: "#d4a017",
    skin: "#e8c4a8",
    hair: "#2a2a2a",
    homeRoom: "bridge",
    sprite: 0,
  },
  {
    id: "co",
    name: "Captain",
    rank: "Capt.",
    role: "Commanding Officer",
    department: "command",
    uniform: "#c23b3b",
    skin: "#c4a07a",
    hair: "#f0e6d8",
    homeRoom: "bridge",
    sprite: 1,
  },
  {
    id: "xo",
    name: "Number One",
    rank: "Cmdr.",
    role: "First Officer",
    department: "command",
    uniform: "#c23b3b",
    skin: "#8d5524",
    hair: "#1a1a1a",
    homeRoom: "bridge",
    sprite: 2,
  },
  {
    id: "ce",
    name: "Chief Eng.",
    rank: "Lt.Cmdr.",
    role: "Chief Engineer",
    department: "ops",
    uniform: "#d4a017",
    skin: "#f0d5b8",
    hair: "#c45c26",
    homeRoom: "engineering",
    sprite: 0,
  },
  {
    id: "cmo",
    name: "Doctor",
    rank: "Cmdr.",
    role: "Chief Medical",
    department: "medical",
    uniform: "#2a9d8f",
    skin: "#f5d0c5",
    hair: "#4a3728",
    homeRoom: "sickbay",
    sprite: 3,
  },
  {
    id: "cns",
    name: "Counselor",
    rank: "Lt.Cmdr.",
    role: "Ship's Counselor",
    department: "medical",
    uniform: "#2a9d8f",
    skin: "#e8b89a",
    hair: "#d4a017",
    homeRoom: "tenforward",
    sprite: 2,
  },
  {
    id: "sci",
    name: "Android",
    rank: "Lt.Cmdr.",
    role: "Operations / Science",
    department: "science",
    uniform: "#d4a017",
    skin: "#d4c4a8",
    hair: "#1a1a1a",
    homeRoom: "bridge",
    sprite: 1,
  },
];

export function getCrew(id: string): CrewDef | undefined {
  return CREW.find((c) => c.id === id);
}
