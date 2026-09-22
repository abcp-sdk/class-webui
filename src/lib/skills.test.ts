import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSkill, listSkills } from './skills'

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('listSkills', () => {
  it('sends the bearer and sorts by name', async () => {
    const calls: Array<[string, RequestInit | undefined]> = []
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      calls.push([url, init])
      return jsonResponse({
        skills: [
          {
            name: 'zeta',
            description: '',
            visibility: 'public',
            digest: 'd',
            size: 1,
            files: 1,
          },
          {
            name: 'alpha',
            description: '',
            visibility: 'private',
            digest: 'd',
            size: 1,
            files: 1,
          },
        ],
      })
    })

    const got = await listSkills('tok')
    expect(got.map(s => s.name)).toEqual(['alpha', 'zeta'])
    expect(calls[0]![0]).toBe('/skills-api/v1/skills')
    expect(calls[0]![1]!.headers).toEqual({ Authorization: 'Bearer tok' })
  })

  it('throws on a non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ error: 'nope' }, false, 401)),
    )
    await expect(listSkills('bad')).rejects.toThrow(/401/)
  })

  it('tolerates a missing skills array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({})),
    )
    await expect(listSkills('tok')).resolves.toEqual([])
  })
})

describe('getSkill', () => {
  it('url-encodes the name and returns the body', async () => {
    const calls: string[] = []
    vi.stubGlobal('fetch', async (url: string) => {
      calls.push(url)
      return jsonResponse({
        name: 'a b',
        description: '',
        visibility: 'public',
        digest: 'd',
        size: 1,
        files: 1,
        body: '# Hi',
      })
    })

    const got = await getSkill('tok', 'a b')
    expect(got.body).toBe('# Hi')
    expect(calls[0]).toBe('/skills-api/v1/skills/a%20b')
  })
})
