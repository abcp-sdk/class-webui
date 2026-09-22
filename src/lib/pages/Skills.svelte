<script lang="ts">
  // Skills — the class-agent console's READ-ONLY Agent Skills catalog.
  //
  // Skills live in the class stack's skill-server (`/v1/*`), which is NOT the
  // agent: it is reached through the same-origin Caddy proxy (`/skills-api/*`).
  // The tenant bearer is the skill-server token the agent already holds in its
  // tool config (`skill-list.skill-server-token`), so there is nothing to paste.
  //
  // Browse only: list the skills visible to this tenant, tap one to read its
  // SKILL.md. Upload / delete / visibility / grants are admin-only and are not
  // exposed here.
  import type { PageProps } from '$lib/page-props'
  import { t } from '$lib/i18n.svelte'
  import { showErrorToast } from '$lib/toast.svelte'
  import { cn } from '$lib/utils'
  import { AppIcons } from '$lib/icons'
  import { getSkill, listSkills, type SkillDetail, type SkillSummary } from '$lib/skills'
  import PageHeader from '$lib/components/layout/PageHeader.svelte'
  import IconButton from '$lib/components/layout/IconButton.svelte'
  import EmptyState from '$lib/components/layout/EmptyState.svelte'
  import { Dialog } from '$lib/components/ui/dialog'

  let { store }: PageProps = $props()

  let skills = $state<SkillSummary[]>([])
  let loading = $state(true)
  let error = $state('')
  // The skill-server token is only needed for the fetch; when unset the catalog
  // is empty and we surface a "configure the skill tool" hint.
  let token = $state('')
  let configured = $state(false)

  let detailOpen = $state(false)
  let detail = $state<SkillDetail | null>(null)
  let detailLoading = $state(false)

  /** Pull this tenant's skill-server token out of the agent's tool config. */
  async function resolveToken(): Promise<string> {
    const cfg = await store.api.toolConfig()
    for (const tool of ['skill-list', 'skill-load']) {
      const v = cfg[tool]
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const tok = (v as Record<string, unknown>)['skill-server-token']
        if (typeof tok === 'string' && tok !== '') return tok
      }
    }
    return ''
  }

  async function load() {
    loading = true
    error = ''
    try {
      token = await resolveToken()
      configured = token !== ''
      skills = configured ? await listSkills(token) : []
    } catch (e) {
      error = String(e)
      showErrorToast(String(e))
    }
    loading = false
  }

  $effect(() => {
    void load()
  })

  async function openSkill(s: SkillSummary) {
    detailOpen = true
    detail = null
    detailLoading = true
    try {
      detail = await getSkill(token, s.name)
    } catch (e) {
      showErrorToast(String(e))
      detailOpen = false
    }
    detailLoading = false
  }

  function visibilityTone(v: string): string {
    return v === 'private'
      ? 'bg-warning/15 text-warning'
      : 'bg-success/15 text-success'
  }
</script>

<div class="flex h-full w-full flex-col">
  <PageHeader title={t('tabSkills')}>
    {#snippet right()}
      <IconButton icon={AppIcons.refresh} label={t('refresh')} onclick={() => void load()} />
    {/snippet}
  </PageHeader>

  <div class="min-h-0 flex-1 overflow-y-auto">
    {#if loading}
      <div class="flex justify-center py-8">
        <span class="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"></span>
      </div>
    {:else if !configured}
      <EmptyState center>{t('skillsNotConfigured')}</EmptyState>
    {:else if error}
      <EmptyState center>{t('loadError', { e: error })}</EmptyState>
    {:else if skills.length === 0}
      <EmptyState center>{t('noSkills')}</EmptyState>
    {:else}
      <ul>
        {#each skills as s (s.name)}
          <li>
            <button
              type="button"
              class="flex w-full items-center gap-3 border-b border-border/60 px-4 py-3 text-left hover:bg-muted"
              onclick={() => void openSkill(s)}
            >
              <AppIcons.pkg class="size-5 shrink-0 text-primary" />
              <span class="min-w-0 flex-1">
                <span class="block truncate font-mono text-body">{s.name}</span>
                {#if s.description}
                  <span class="mt-0.5 block truncate text-micro text-muted-foreground">{s.description}</span>
                {/if}
              </span>
              <span class={cn('shrink-0 rounded-full px-2 py-px text-[10px] leading-4', visibilityTone(s.visibility))}>
                {s.visibility}
              </span>
              <AppIcons.chevron_right class="size-4 shrink-0 text-muted-foreground" />
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

{#if detailOpen}
  <Dialog bind:open={detailOpen} title={detail?.name ?? ''} class="w-[min(92vw,640px)]">
    {#if detailLoading}
      <div class="flex justify-center py-8">
        <span class="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"></span>
      </div>
    {:else if detail}
      {#if detail.description}
        <p class="text-meta text-muted-foreground">{detail.description}</p>
      {/if}
      <div class="flex flex-wrap items-center gap-2 text-micro text-muted-foreground">
        <span class={cn('rounded-full px-2 py-px text-[10px] leading-4', visibilityTone(detail.visibility))}>{detail.visibility}</span>
        <span>{t('skillFiles', { n: String(detail.files) })}</span>
        <span class="font-mono">{detail.digest.slice(0, 12)}</span>
      </div>
      {#if detail.body}
        <pre class="max-h-[55dvh] min-w-0 overflow-auto rounded-md border border-border/60 bg-background/50 p-3 font-mono text-[11px] whitespace-pre-wrap wrap-anywhere">{detail.body}</pre>
      {/if}
    {/if}
  </Dialog>
{/if}
