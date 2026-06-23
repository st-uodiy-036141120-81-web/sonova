import type { Profile } from './types';
import { requireClient, PROFILE_SELECT } from './api';

export async function createOAuthProfile(
  userId: string,
  username: string,
  displayName: string
): Promise<Profile> {
  const client = requireClient();
  const normalizedUsername = username.trim();
  const normalizedDisplayName = displayName.trim() || normalizedUsername;

  const { data, error } = await client.rpc('upsert_own_profile', {
    p_username: normalizedUsername,
    p_display_name: normalizedDisplayName,
  });

  if (!error && data) {
    return data as Profile;
  }

  // Fallback if RPC not deployed yet (run migration_v11 in Supabase SQL Editor)
  if (error?.message?.includes('Could not find the function')) {
    return createOAuthProfileDirect(client, userId, normalizedUsername, normalizedDisplayName);
  }

  if (error?.message?.includes('USERNAME_TAKEN')) {
    throw new Error('USERNAME_TAKEN');
  }
  if (error) throw error;
  throw new Error('Profile setup failed');
}

async function createOAuthProfileDirect(
  client: ReturnType<typeof requireClient>,
  userId: string,
  normalizedUsername: string,
  normalizedDisplayName: string
): Promise<Profile> {
  const studioName = `${normalizedDisplayName}'s Studio`;

  const { data: existing } = await client
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle();

  const { data: taken } = await client
    .from('profiles')
    .select('id')
    .eq('username', normalizedUsername)
    .neq('id', userId)
    .maybeSingle();
  if (taken) throw new Error('USERNAME_TAKEN');

  let profile: Profile;

  if (existing) {
    const { data, error } = await client
      .from('profiles')
      .update({ username: normalizedUsername, display_name: normalizedDisplayName })
      .eq('id', userId)
      .select(PROFILE_SELECT)
      .single();
    if (error) throw error;
    profile = data as Profile;
  } else {
    const { data, error } = await client
      .from('profiles')
      .insert({
        id: userId,
        username: normalizedUsername,
        display_name: normalizedDisplayName,
      })
      .select(PROFILE_SELECT)
      .single();
    if (error) throw error;
    profile = data as Profile;
  }

  const { data: studio } = await client
    .from('studios')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle();

  if (!studio) {
    const { error: studioError } = await client.from('studios').insert({
      owner_id: userId,
      name: studioName,
      description: '',
    });
    if (studioError) throw studioError;
  }

  return profile;
}
