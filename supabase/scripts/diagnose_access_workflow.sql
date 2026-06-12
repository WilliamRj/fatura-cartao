-- Read-only diagnosis for the access-request workflow.
-- Run the whole file in Supabase SQL Editor with an administrative role.

select pg_notify('pgrst', 'reload schema');

with expected_objects as (
  select *
  from (
    values
      ('table', 'app_users'),
      ('table', 'system_admins'),
      ('table', 'access_audit_log'),
      ('table', 'responsaveis'),
      ('function', 'is_system_admin'),
      ('function', 'has_app_access'),
      ('function', 'get_my_access_state'),
      ('function', 'renew_my_access_request'),
      ('function', 'withdraw_my_access_request'),
      ('function', 'admin_list_access_requests'),
      ('function', 'admin_set_access_status'),
      ('function', 'admin_get_access_audit'),
      ('function', 'ensure_owner_responsavel'),
      ('function', 'rename_responsavel')
  ) as objects(object_type, object_name)
),
object_status as (
  select
    expected.object_type,
    expected.object_name,
    case
      when expected.object_type = 'table' then
        to_regclass(format('public.%I', expected.object_name)) is not null
      else exists (
        select 1
        from information_schema.routines
        where routine_schema = 'public'
          and routine_name = expected.object_name
      )
    end as available,
    null::text as details
  from expected_objects as expected
),
grant_status as (
  select
    'grant'::text as object_type,
    function_name as object_name,
    coalesce(
      has_function_privilege(
        'authenticated',
        to_regprocedure(function_signature),
        'EXECUTE'
      ),
      false
    ) as available,
    'EXECUTE para authenticated'::text as details
  from (
    values
      ('get_my_access_state', 'public.get_my_access_state()'),
      ('ensure_owner_responsavel', 'public.ensure_owner_responsavel()'),
      (
        'rename_responsavel',
        'public.rename_responsavel(uuid, text)'
      )
  ) as functions(function_name, function_signature)
),
column_status as (
  select
    'column'::text as object_type,
    'responsaveis.is_owner'::text as object_name,
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'responsaveis'
        and column_name = 'is_owner'
    ) as available,
    'coluna do responsável titular'::text as details
)
select
  object_type as tipo,
  object_name as objeto,
  case when available then 'OK' else 'AUSENTE' end as status,
  coalesce(details, '') as detalhes
from (
  select * from object_status
  union all
  select * from grant_status
  union all
  select * from column_status
) as diagnosis
order by
  case object_type
    when 'table' then 1
    when 'column' then 2
    when 'function' then 3
    else 4
  end,
  object_name;
