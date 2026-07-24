import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
  try {
    const { getSessionUser } = await import('$lib/server/auth');
    const user = await getSessionUser(cookies);
    
    return {
      user: user ? {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        provider: user.provider,
        avatar_url: user.avatar_url
      } : null
    };
  } catch (e: any) {
    console.error('Layout load error:', e?.message ?? e ?? 'unknown');
    return { user: null };
  }
};
