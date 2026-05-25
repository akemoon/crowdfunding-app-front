<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import {
    getUser, getUserProjects, getMe, getMySubscriptions,
    followUser, unfollowUser,
    type UserProfile, type Project,
  } from '$lib/api';

  const CATEGORY_LABELS: Record<string, string> = {
    science:                'Наука',
    tech:                   'Технологии',
    architecture_and_urban: 'Архитектура и урбанистика',
    sport:                  'Спорт',
    music:                  'Музыка',
    art:                    'Искусство',
    film:                   'Кино',
    games:                  'Игры',
    education:              'Образование',
    food:                   'Еда',
    fashion:                'Мода',
    health:                 'Здоровье',
  };

  let user:     UserProfile | null = null;
  let projects: Project[]          = [];
  let errorMsg = '';

  // Follow state — null means not logged in or own profile (button hidden)
  let isFollowing: boolean | null = null;
  let followLoading = false;

  onMount(async () => {
    const id    = $page.params.id;
    const token = localStorage.getItem('accessToken');

    const baseRequests: [Promise<UserProfile | import('$lib/api').ApiError>, Promise<Project[] | import('$lib/api').ApiError>] =
      [getUser(id), getUserProjects(id)];

    if (token) {
      const [userRes, projRes, meRes, subsRes] = await Promise.all([
        ...baseRequests,
        getMe(token),
        getMySubscriptions(token),
      ]);

      if ('code' in userRes) {
        console.error('[getUser]', userRes.code, userRes.message);
        errorMsg = userRes.code === 'user_not_found'
          ? 'Пользователь не найден.'
          : 'Не удалось загрузить профиль.';
      } else {
        user = userRes;
      }

      if (!('code' in projRes)) projects = projRes;

      if (!('code' in meRes) && !('code' in subsRes) && user) {
        if (meRes.id !== user.id) {
          isFollowing = (subsRes as UserProfile[]).some(u => u.id === user!.id);
        }
      }
    } else {
      const [userRes, projRes] = await Promise.all(baseRequests);

      if ('code' in userRes) {
        console.error('[getUser]', userRes.code, userRes.message);
        errorMsg = userRes.code === 'user_not_found'
          ? 'Пользователь не найден.'
          : 'Не удалось загрузить профиль.';
      } else {
        user = userRes;
      }

      if (!('code' in projRes)) projects = projRes;
    }
  });

  async function toggleFollow() {
    if (!user || isFollowing === null) return;
    followLoading = true;
    const token = localStorage.getItem('accessToken') ?? '';
    const res = isFollowing
      ? await unfollowUser(token, user.id)
      : await followUser(token, user.id);
    followLoading = false;
    if (res !== null) {
      console.error('[toggleFollow]', res.code, res.message);
      return;
    }
    isFollowing = !isFollowing;
  }
</script>

<svelte:head>
  <title>{user ? user.displayName : 'Профиль'}</title>
</svelte:head>

<div class="page">
  {#if errorMsg}
    <p class="error">{errorMsg}</p>
  {:else if !user}
    <p class="muted">Загрузка...</p>
  {:else}
    <div class="profile">
      <div class="avatar">
        {#if user.avatarUrl}
          <img src={user.avatarUrl} alt={user.displayName} />
        {:else}
          <span>{user.displayName.charAt(0).toUpperCase()}</span>
        {/if}
      </div>
      <div class="info">
        <div class="name-row">
          <h1>{user.displayName}</h1>
          {#if isFollowing !== null}
            <button
              class="btn-follow"
              class:following={isFollowing}
              on:click={toggleFollow}
              disabled={followLoading}
            >
              {followLoading ? '...' : isFollowing ? 'Отписаться' : 'Подписаться'}
            </button>
          {/if}
        </div>
        <p class="username">@{user.username}</p>
        {#if user.description}
          <p class="bio">{user.description}</p>
        {/if}
      </div>
    </div>

    <section class="projects-section">
      <h2>Проекты</h2>
      {#if projects.length === 0}
        <p class="muted">Нет публичных проектов.</p>
      {:else}
        <ul class="list">
          {#each projects as project}
            <li>
              <a class="project-card" href="/projects/{project.id}">
                <div class="card-cover">
                  {#if project.coverURL}
                    <img src={project.coverURL} alt={project.name} class="cover-img" />
                  {:else}
                    <div class="cover-placeholder">
                      <span>{CATEGORY_LABELS[project.category] ?? project.category}</span>
                    </div>
                  {/if}
                </div>
                <div class="card-body">
                  <span class="project-name">{project.name}</span>
                  <span class="project-cat">{CATEGORY_LABELS[project.category] ?? project.category}</span>
                </div>
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}
</div>

<style>
  .page {
    max-width: 600px;
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .profile {
    display: flex;
    gap: 28px;
    align-items: flex-start;
    padding: 28px;
    border: 1px solid var(--line);
    border-radius: 12px;
  }

  .avatar {
    width: 88px;
    height: 88px;
    border-radius: 50%;
    background: var(--bg-soft);
    border: 1px solid var(--line);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 34px;
    font-weight: 600;
    color: var(--text-muted);
    flex-shrink: 0;
    overflow: hidden;
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-top: 4px;
  }

  .name-row {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }

  h1 {
    margin: 0;
    font-size: 26px;
    font-weight: 700;
  }

  .btn-follow {
    padding: 6px 16px;
    border: 1px solid var(--accent);
    border-radius: 7px;
    background: var(--accent);
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    flex-shrink: 0;
  }

  .btn-follow.following {
    background: none;
    color: var(--text-muted);
    border-color: var(--line);
  }

  .btn-follow.following:hover {
    border-color: #e05252;
    color: #e05252;
  }

  .btn-follow:disabled {
    opacity: 0.55;
    cursor: default;
  }

  .username {
    margin: 0;
    font-size: 14px;
    color: var(--text-muted);
  }

  .bio {
    margin: 10px 0 0;
    font-size: 15px;
    color: var(--text-main);
    line-height: 1.5;
    white-space: pre-wrap;
  }

  .projects-section h2 {
    margin: 0 0 14px;
    font-size: 18px;
    font-weight: 700;
  }

  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .project-card {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--line);
    border-radius: 12px;
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    background: #fff;
  }

  .project-card:hover {
    border-color: var(--accent);
  }

  .card-cover {
    width: 100%;
    aspect-ratio: 16 / 9;
    background: var(--soft);
    overflow: hidden;
    flex-shrink: 0;
  }

  .cover-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .cover-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cover-placeholder span {
    font-size: 13px;
    color: var(--text-muted);
  }

  .card-body {
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .project-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-main);
  }

  .project-cat {
    font-size: 13px;
    color: var(--text-muted);
  }

  .muted {
    color: var(--text-muted);
    font-size: 14px;
  }

  .error {
    color: #e05252;
    font-size: 14px;
  }
</style>
