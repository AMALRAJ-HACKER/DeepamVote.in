-- Run on a disposable, migrated, empty PostgreSQL/Supabase database.
begin;
do $test$
declare
  stats record;
  denied boolean;
begin
  select * into stats from public.participation_stats('test');
  if stats.total <> 0 or stats.gross <> 0 then raise exception 'Expected an empty test ledger'; end if;
  insert into public.payment_orders(provider_order_id,mode,choice,terms_version)
  values ('order_a','test','YES','test'),('order_b','test','NO','test'),('order_c','test','YES','test'),('order_live','live','YES','test');
  perform public.apply_payment_event('evt_failed','payment.failed','order_a','pay_attempt','failed',1000,'INR','test');
  select * into stats from public.participation_stats('test');
  if stats.total <> 0 then raise exception 'Failed or pending payment counted'; end if;
  perform public.apply_payment_event('evt_a','payment.captured','order_a','pay_a','captured',1000,'INR','test');
  perform public.apply_payment_event('evt_a','payment.captured','order_a','pay_a','captured',1000,'INR','test');
  perform public.apply_payment_event('evt_repeat','payment.captured','order_a','pay_a','captured',1000,'INR','test');
  perform public.apply_payment_event('evt_late','payment.failed','order_a','pay_attempt','failed',1000,'INR','test');
  perform public.apply_payment_event('evt_b','payment.captured','order_b','pay_b','captured',1000,'INR','test');
  perform public.apply_payment_event('evt_live','payment.captured','order_live','pay_live','captured',1000,'INR','live');
  select * into stats from public.participation_stats('test');
  if (stats.yes,stats.no,stats.total,stats.gross) is distinct from (1::bigint,1::bigint,2::bigint,20::bigint) or stats.updated is null then raise exception 'Incorrect counts after retries or mode separation'; end if;
  if (select count(*) from public.payment_events where provider_event_id='evt_a') <> 1 then raise exception 'Duplicate event'; end if;
  denied:=false;
  begin
    perform public.apply_payment_event('evt_reused','payment.captured','order_c','pay_a','captured',1000,'INR','test');
  exception when unique_violation then denied:=true; end;
  if not denied or exists(select 1 from public.payment_events where provider_event_id='evt_reused') then raise exception 'Reused payment or partial commit'; end if;
  denied:=false;
  begin
    perform public.apply_payment_event('evt_short','payment.captured','order_c','pay_short','captured',999,'INR','test');
  exception when raise_exception then denied:=true; end;
  if not denied then raise exception 'Incorrect fee accepted'; end if;
  if not public.take_request_slot('sample',1,60) or public.take_request_slot('sample',1,60) then raise exception 'Rate limit failed'; end if;
  if has_table_privilege('anon','public.votes','SELECT') or has_table_privilege('authenticated','public.payment_orders','SELECT')
    or has_function_privilege('anon','public.apply_payment_event(text,text,text,text,text,integer,text,text)','execute')
    or has_table_privilege('service_role','public.votes','INSERT') then raise exception 'Excessive privileges'; end if;
end;
$test$;
rollback;
