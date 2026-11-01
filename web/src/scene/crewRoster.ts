/** Only these Grok World bridge agents appear on the island. */
export const CREW_IDS = ["grok", "co", "xo", "ce", "cmo", "cns", "sci"] as const;
export type CrewId = (typeof CREW_IDS)[number];

export const CREW_SET = new Set<string>(CREW_IDS);

export interface CrewFlavor {
  id: CrewId;
  asset: string;
  accent: string;
  homeRoom: string;
  /** Preferred work stations when bridge has not assigned one yet */
  taskStations: string[];
  tagline: string;
}

export const CREW_FLAVOR: Record<CrewId, CrewFlavor> = {
  grok: {
    id: "grok",
    asset: "/assets/characters/character-male-a.glb",
    accent: "#d4a017",
    homeRoom: "bridge",
    taskStations: ["bridge_ops", "eng_core", "holo_arch"],
    tagline: "Ops AI — routes jobs across the island",
  },
  co: {
    id: "co",
    asset: "/assets/characters/character-male-b.glb",
    accent: "#c23b3b",
    homeRoom: "bridge",
    taskStations: ["bridge_tactical", "ready_desk"],
    tagline: "Captain — walks Bridge ↔ Ready Room",
  },
  xo: {
    id: "xo",
    asset: "/assets/characters/character-female-a.glb",
    accent: "#e85d5d",
    homeRoom: "bridge",
    taskStations: ["bridge_ops", "bridge_tactical", "tf_bar"],
    tagline: "Number One — bridge watch & crew check-ins",
  },
  ce: {
    id: "ce",
    asset: "/assets/characters/character-male-c.glb",
    accent: "#f0b429",
    homeRoom: "engineering",
    taskStations: ["eng_core", "eng_diag"],
    tagline: "Chief Eng. — core & diagnostics loops",
  },
  cmo: {
    id: "cmo",
    asset: "/assets/characters/character-female-b.glb",
    accent: "#2a9d8f",
    homeRoom: "sickbay",
    taskStations: ["sick_biobed", "sick_lab"],
    tagline: "Doctor — sickbay rounds",
  },
  cns: {
    id: "cns",
    asset: "/assets/characters/character-female-c.glb",
    accent: "#5ecfc0",
    homeRoom: "tenforward",
    taskStations: ["tf_bar", "holo_grid"],
    tagline: "Counselor — Ten Forward presence",
  },
  sci: {
    id: "sci",
    asset: "/assets/characters/character-male-a.glb",
    accent: "#7ec8ff",
    homeRoom: "bridge",
    taskStations: ["bridge_ops", "holo_arch", "eng_diag"],
    tagline: "Android — science / ops sweeps",
  },
};

export function isCrewAgent(id: string): id is CrewId {
  return CREW_SET.has(id);
}

export function flavorFor(id: string): CrewFlavor {
  if (isCrewAgent(id)) return CREW_FLAVOR[id];
  return CREW_FLAVOR.grok;
}
