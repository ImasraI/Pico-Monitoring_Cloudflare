/* Shared Persian calendar for the doctor's planner and patient roadmap. */
window.DantoPlanner = (() => {
  const months = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
  const types = { scan: 'اسکن مانیتورینگ', visit: 'ویزیت حضوری', aligner: 'تعویض الاینر', final: 'پایان درمان', custom: 'اقدام درمانی' };
  const fmt = new Intl.DateTimeFormat('en-US-u-ca-persian', {year:'numeric',month:'numeric',day:'numeric',timeZone:'Asia/Tehran'});
  const fa = n => new Intl.NumberFormat('fa-IR', {useGrouping:false}).format(n);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const iso = at => new Intl.DateTimeFormat('en-CA', {year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Tehran'}).format(new Date(at));
  const at = day => new Date(day + 'T23:59:59+03:30').getTime();
  const parts = value => Object.fromEntries(fmt.formatToParts(new Date(typeof value === 'string' ? value + 'T12:00:00Z' : value)).filter(p => ['year','month','day'].includes(p.type)).map(p => [p.type, +p.value]));
  const cache = new Map();
  function yearDays(year) {
    if (!cache.has(year)) {
      const days = [], start = Date.UTC(year + 621, 2, 15, 12);
      for(let n = 0; n < 380; n++) { const value = start + n * 86400000, p = parts(value); if(p.year === year) days.push({...p, iso:iso(value), weekday:(new Date(value).getUTCDay()+1)%7}); }
      cache.set(year, days);
    }
    return cache.get(year);
  }
  const toIso = (year, month, day) => yearDays(+year).find(p => p.month === +month && p.day === +day)?.iso ?? '';
  const due = e => e.due_at ?? e.dueAt;
  const type = e => e.event_type ?? e.eventType ?? 'custom';
  function hydrateDates(root = document) {
    root.querySelectorAll('input[type=date]').forEach(input => {
      const current = input.value ? parts(input.value) : {}, y = parts(Date.now()).year;
      const box = document.createElement('div'); box.className = 'jalali-fields';
      const yearList = Array.from({length:130},(_,i)=>y+10-i);
      if (current.year && !yearList.includes(current.year)) yearList.push(current.year);
      box.innerHTML = `<select aria-label="روز" data-date-part="day"><option value="">روز</option>${Array.from({length:31},(_,i)=>`<option value="${i+1}">${fa(i+1)}</option>`).join('')}</select><select aria-label="ماه" data-date-part="month"><option value="">ماه</option>${months.map((m,i)=>`<option value="${i+1}">${m}</option>`).join('')}</select><select aria-label="سال" data-date-part="year"><option value="">سال</option>${yearList.map(v=>`<option value="${v}">${fa(v)}</option>`).join('')}</select>`;
      input.type = 'hidden'; input.after(box); box.prepend(input);
      box.querySelectorAll('select').forEach(select => { select.required = input.required; select.value = current[select.dataset.datePart] || ''; });
      const update = () => {
        const get = key => box.querySelector(`[data-date-part=${key}]`), values = ['year','month','day'].map(key=>get(key).value);
        input.value = values.every(Boolean) ? toIso(...values) : '';
        get('day').setCustomValidity(values.every(Boolean) && !input.value ? 'این روز در ماه انتخاب‌شده وجود ندارد.' : '');
        if (!input.required) box.querySelectorAll('select').forEach(select => select.required = values.some(Boolean));
      };
      box.addEventListener('change',update); update();
    });
  }
  function calendar(events, view, editable = true) {
    const p = view || parts(Date.now()), days = yearDays(p.year).filter(d=>d.month===p.month), today = iso(Date.now()), byDay = {};
    events.forEach(e=>{ const day=iso(due(e)); (byDay[day] ||= []).push(e); });
    const offset = days[0]?.weekday || 0;
    const cell = day => `<div class="plan-day ${day.iso === today ? 'today' : ''} ${day.weekday === 6 ? 'friday' : ''}" ${editable ? `tabindex="0" role="button" data-plan-day="${day.iso}" aria-label="افزودن رویداد ${fa(day.day)} ${months[p.month-1]}"` : ''}><span>${fa(day.day)}</span>${(byDay[day.iso]||[]).map(e=>`<button type="button" class="calendar-event ev-${type(e)} ${e.completed_at ? 'done' : ''}" ${editable ? `data-plan-edit="${esc(e.id)}"` : 'data-patient-view="roadmap"'} title="${esc(e.title)}">${e.completed_at ? '✓ ' : ''}${esc(e.title)}</button>`).join('')}</div>`;
    return `<section class="panel calendar-panel"><div class="calendar-head"><button type="button" class="outline small" data-plan-nav="prev" aria-label="ماه قبل">→</button><b>${months[p.month-1]} ${fa(p.year)}</b><button type="button" class="outline small" data-plan-nav="next" aria-label="ماه بعد">←</button><button type="button" class="link-btn" data-plan-nav="today">امروز</button></div><div class="calendar-legend">${Object.entries(types).filter(([key])=>key!=='custom').map(([key,label])=>`<span><i class="ev-${key}"></i>${label}</span>`).join('')}</div><div class="calendar-week">${['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'].map(day=>`<span>${day}</span>`).join('')}</div><div class="calendar-days">${'<div class="plan-day blank"></div>'.repeat(offset)}${days.map(cell).join('')}</div>${editable ? '<p class="calendar-help">برای افزودن رویداد روی روز دلخواه و برای ویرایش روی رویداد کلیک کنید.</p>' : ''}</section>`;
  }
  function timeline(events, editable = false) {
    const sorted = [...events].sort((a,b)=>due(a)-due(b));
    return sorted.length ? `<div class="plan-timeline">${sorted.map(e=>`<article class="event-row"><span class="event-marker ev-${type(e)}">${e.completed_at ? '✓' : '●'}</span><div><b>${esc(e.title)}</b><small>${new Intl.DateTimeFormat('fa-IR',{dateStyle:'long',timeZone:'Asia/Tehran'}).format(new Date(due(e)))}${e.series_id || e.seriesId ? ' · برنامه تکرارشونده' : ''}</small>${e.detail ? `<p>${esc(e.detail)}</p>` : ''}</div>${editable ? `<button type="button" class="outline small" data-plan-edit="${esc(e.id)}">${e.completed_at ? 'انجام‌شده' : 'ویرایش'}</button>` : ''}</article>`).join('')}</div>` : '<div class="empty"><b>هنوز رویدادی در برنامه ثبت نشده است.</b></div>';
  }
  return {months,types,parts,toIso,iso,at,due,type,hydrateDates,calendar,timeline};
})();
