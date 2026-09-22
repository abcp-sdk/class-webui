// skill-server client (READ-ONLY) for the class-agent console.
//
// The class stack's skill-server is a plain-HTTP `/v1/*` service with NO CORS,
// so the browser reaches it through the SAME-ORIGIN Caddy aggregator: the webui
// Caddyfile proxies `/skills-api/*` -> skill-server and strips the prefix, so
// `/skills-api/v1/skills` hits skill-server's `/v1/skills`. The bearer is the
// tenant's skill-server token, which the agent already stores in its tool
// config (`skill-list.skill-server-token`); we read it from there instead of
// asking the user to paste it again.
//
// Only the two read endpoints are used: list + single (single adds the SKILL.md
// `body`). Upload/delete/visibility/grants are ADMIN operations and are
// deliberately not exposed here — this console is browse-only.

const BASE = '/skills-api'

export interface SkillSummary {
  name: string
  description: string
  visibility: 'public' | 'private' | string
  digest: string
  size: number
  files: number
}

export interface SkillDetail extends SkillSummary {
  /** SKILL.md text; present on the single-skill GET only. */
  body?: string
}

interface SkillsListResponse {
  skills?: SkillSummary[]
}

function authHeaders(token: string): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function asError(res: Response): Promise<Error> {
  let detail = ''
  try {
    detail = (await res.text()).trim()
  } catch {
    /* body already consumed / not text */
  }
  const suffix = detail ? `: ${detail.slice(0, 300)}` : ''
  return new Error(`${res.status} ${res.statusText}${suffix}`)
}

/** List every skill visible to this tenant's token (public + granted private). */
export async function listSkills(token: string): Promise<SkillSummary[]> {
  const res = await fetch(`${BASE}/v1/skills`, { headers: authHeaders(token) })
  if (!res.ok) throw await asError(res)
  const data = (await res.json()) as SkillsListResponse
  const skills = Array.isArray(data.skills) ? data.skills : []
  return [...skills].sort((a, b) => a.name.localeCompare(b.name))
}

/** One skill's metadata plus its SKILL.md `body`. */
export async function getSkill(
  token: string,
  name: string,
): Promise<SkillDetail> {
  const res = await fetch(`${BASE}/v1/skills/${encodeURIComponent(name)}`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw await asError(res)
  return (await res.json()) as SkillDetail
}
