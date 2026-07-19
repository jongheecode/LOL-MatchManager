interface ChampionEntry {
  /** English key used by Match-V5 championName and the CDN icon path, e.g. "Ahri". */
  id: string;
  /** Numeric championId string, used by Champion-Mastery-V4. */
  key: string;
  /** Korean display name. */
  name: string;
}

interface DdragonState {
  version: string;
  byEnglishKey: Map<string, ChampionEntry>;
  byNumericId: Map<string, ChampionEntry>;
}

let state: DdragonState | null = null;
let loading: Promise<DdragonState> | null = null;

async function load(): Promise<DdragonState> {
  const versions = (await fetch('https://ddragon.leagueoflegends.com/api/versions.json').then((r) =>
    r.json(),
  )) as string[];
  const version = versions[0];
  const champJson = (await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/ko_KR/champion.json`).then(
    (r) => r.json(),
  )) as { data: Record<string, { id: string; key: string; name: string }> };

  const byEnglishKey = new Map<string, ChampionEntry>();
  const byNumericId = new Map<string, ChampionEntry>();
  for (const raw of Object.values(champJson.data)) {
    const entry: ChampionEntry = { id: raw.id, key: raw.key, name: raw.name };
    byEnglishKey.set(raw.id, entry);
    byNumericId.set(raw.key, entry);
  }
  return { version, byEnglishKey, byNumericId };
}

export async function getDdragon(): Promise<DdragonState> {
  if (state) return state;
  if (!loading) {
    loading = load()
      .then((s) => (state = s))
      .catch((err) => {
        // Don't cache the failure — a transient error at boot must not wedge getDdragon() (and the
        // AI routes that gate on it) into a permanent 503 until the next 12h refresh.
        loading = null;
        throw err;
      });
  }
  return loading;
}

/** Refresh in the background every 12h in case of a patch; never blocks callers. */
export function startDdragonRefresh() {
  setInterval(
    () => {
      load()
        .then((s) => (state = s))
        .catch(() => {
          /* keep serving the stale cache on failure */
        });
    },
    12 * 60 * 60_000,
  );
}

export function championByEnglishKey(name: string): ChampionEntry | undefined {
  return state?.byEnglishKey.get(name);
}

export function championByNumericId(id: number): ChampionEntry | undefined {
  return state?.byNumericId.get(String(id));
}

export function ddragonVersion(): string {
  return state?.version ?? '14.23.1';
}

const koCollator = new Intl.Collator('ko');

/** Full champion roster (all ~170 champs), Korean-name sorted, for the "pick any champion" simulator. */
export function allChampions(): { name: string; iconId: string }[] {
  if (!state) return [];
  return [...state.byEnglishKey.values()]
    .map((c) => ({ name: c.name, iconId: c.id }))
    .sort((a, b) => koCollator.compare(a.name, b.name));
}
