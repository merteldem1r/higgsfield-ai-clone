-- Favourites on Assets.
--
-- Sets an explicit value instead of flipping, so a double click or a retried request
-- can't leave the row out of step with what the UI shows. Called by the service role
-- with the user id from the session (auth.uid() is NULL there), so ownership is
-- checked here: someone else's asset id matches no row and comes back NOT_FOUND.
-- Doesn't touch app_budget: favourites aren't credits, so no need to queue behind that lock.

create function public.set_favourite(p_user_id uuid, p_asset_id uuid, p_favourite boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_favourite boolean;
begin
  if p_user_id is null or p_asset_id is null or p_favourite is null then
    raise exception 'set_favourite: p_user_id, p_asset_id and p_favourite are required';
  end if;

  update public.assets
     set favourite = p_favourite
   where id = p_asset_id
     and user_id = p_user_id
  returning favourite into v_favourite;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;

  return jsonb_build_object('ok', true, 'favourite', v_favourite);
end;
$$;

-- Same as the credit functions: Supabase's default privileges grant EXECUTE to anon and
-- authenticated directly, so revoking from PUBLIC alone would leave it callable.
revoke execute on function public.set_favourite(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_favourite(uuid, uuid, boolean) to service_role;
