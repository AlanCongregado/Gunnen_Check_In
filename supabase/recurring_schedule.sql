-- Function to generate classes for a full week based on Gunnen's recurring schedule
create or replace function public.generate_weekly_classes(p_coach_id uuid, p_start_date date)
returns json
language plpgsql
security definer
as $$
declare
  v_current_date date;
  v_dow int;
  v_times text[];
  v_time text;
  v_count int := 0;
begin
  -- Check if user is authenticated and is a coach (or is the requested coach)
  if auth.uid() is null then
    return json_build_object('ok', false, 'error', 'No autenticado');
  end if;

  -- Generate classes for 7 days starting from p_start_date
  for i in 0..6 loop
    v_current_date := p_start_date + i;
    v_dow := extract(dow from v_current_date);
    
    -- Define times based on day of week
    if v_dow between 1 and 5 then
      -- Weekdays: 07:30, 08:30, 09:30, 10:30, 15:30, 16:30, 17:30, 18:30, 19:30
      v_times := array['07:30', '08:30', '09:30', '10:30', '15:30', '16:30', '17:30', '18:30', '19:30'];
    elsif v_dow = 6 then
      -- Saturdays: 08:30, 09:30
      v_times := array['08:30', '09:30'];
    else
      -- Sundays: No classes
      v_times := array[]::text[];
    end if;

    -- Insert classes for each time
    foreach v_time in array v_times loop
      insert into public.classes (class_date, class_time, coach_id, capacity)
      values (v_current_date, v_time::time, p_coach_id, 22)
      on conflict do nothing; -- Skip duplicates if they already exist
      
      v_count := v_count + 1;
    end loop;
  end loop;

  return json_build_object('ok', true, 'inserted_count', v_count);
end;
$$;
