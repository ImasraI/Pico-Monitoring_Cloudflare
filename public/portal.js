/* Patient portal extensions. Medical drafts stay in memory until saved to the API. */
window.PicoPortal = (() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = value => new Intl.NumberFormat('fa-IR').format(value);
  const icon = name => '<svg class="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+({education:'M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15',store:'M5 7h14l1 14H4L5 7Zm3 0V5a4 4 0 0 1 8 0v2',urgent:'M12 8v5m0 4h.01M10.3 3.8 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z'})[name]+'"/></svg>';
  let pathObserver;
  let h, schema, catalog, caps = {}, record, key, section = 0, review = false, dirty = false, reply = null, urgent = '', itemIndex = 0;
  let mediaType = '', search = '', topic = '', categories = new Set(), sort = 'reco', cart = new Map(), previewUrls = [];
  const identity = new Set(['patient_name', 'med_name', 'med_birth']);
  const id = () => h.state.user.role === 'patient' ? h.state.user.id : h.state.patientId;
  const rerender = () => h.state.user.role === 'doctor' ? h.renderDetail() : h.renderPatient();
  const options = (values, selected) => '<option value="">انتخاب کنید</option>' + values.map(value => `<option ${value === selected ? 'selected' : ''}>${esc(value)}</option>`).join('');
  const button = (action, label, extra = '', cls = 'outline') => `<button type="button" class="${cls}" data-portal="${action}" ${extra}>${label}</button>`;
  async function init(hooks) {
    h = hooks; record = null; key = null; reply = null; urgent = ''; dirty = false; cart.clear();
    caps = await h.api('portal.capabilities').catch(() => ({}));
    const rail=document.querySelector('.patient-rail nav');
    if(rail && !rail.querySelector('[data-patient-view=education]')) rail.insertAdjacentHTML('beforeend','<button data-patient-view=education>'+icon('education')+'<span>آموزش‌ها</span></button><button data-patient-view=store>'+icon('store')+'<span>فروشگاه</span></button>');
    [schema, catalog] = await Promise.all([schema || fetch('/intake-schema.json').then(r => {if (!r.ok) throw Error('پرسشنامه دریافت نشد'); return r.json();}), catalog || fetch('/portal-content.json').then(r => {if (!r.ok) throw Error('فهرست دریافت نشد'); return r.json();})]);
  }
  async function load() {
    const changed = key !== id();
    if (changed) { record = null; key = id(); section = 0; review = false; dirty = false; reply = null; urgent = ''; }
    if (caps.intake && !dirty) record = await h.api('patient.intake', null, { patientId: id() });
    if (changed && record) { const next=schema.sections.findIndex(s=>s.items.some(q=>record.missing.includes(q.id)));section=Math.max(0,next);review=Boolean(record.submittedAt); }
  }
  function intakeCard() {
    return `<section class="portal-intake-card"><div><span class="portal-eyebrow">پرونده سلامت من</span><h2>قدم‌به‌قدم، پرونده‌ات را کامل کن</h2><p>${record ? `${num(record.answered)} از ${num(record.total)} پاسخ ثبت شده${record.submittedAt ? ' · ارسال‌شده برای پزشک' : ' · پیش‌نویس'}` : 'پاسخ‌ها را ذخیره کنید و هر زمان خواستید ادامه دهید.'}</p>${record ? `<progress value="${record.answered}" max="${record.total}" aria-label="پیشرفت پرونده"></progress>` : ''}</div>${button('intake', record?.submittedAt ? 'مرور و ویرایش پرونده' : 'تکمیل پرسشنامه', '', 'primary')}</section>`;
  }
  function home() {
    return `<div class="portal-shortcuts">${button('education','<span>'+icon('education')+'</span><b>آموزش و مراقبت</b><small>راهنماهای درمان</small>')}${button('store','<span>'+icon('store')+'</span><b>فروشگاه</b><small>لوازم مراقبت</small>')}${button('urgent','<span>'+icon('urgent')+'</span><b>گزارش فوری با تصویر</b><small>ارسال برای پزشک</small>')}</div>`;
  }
  function control(q, value) {
    const readonly = identity.has(q.id), attr = readonly ? 'readonly aria-readonly="true"' : '';
    if (['text','date','height'].includes(q.type)) {
      if (q.multiline) return `<textarea aria-label="${esc(q.label)}" data-part="value" maxlength="1200" ${attr}>${esc(value)}</textarea>`;
      return `<input aria-label="${esc(q.label)}" data-part="value" type="text" ${q.type === 'height' ? 'inputmode="decimal"' : ''} maxlength="${q.type === 'date' ? 10 : 1200}" placeholder="${esc(q.placeholder || (q.type === 'date' ? '۱۴۰۵/۰۸/۱۰ (شمسی)' : q.type === 'height' ? 'سانتی‌متر' : 'پاسخ شما'))}" value="${esc(value)}" ${attr}>`;
    }
    if (q.type === 'single') return `<select aria-label="${esc(q.label)}" data-part="value">${options(q.opts, value)}</select>`;
    if (q.type === 'multi') return `<div class="portal-options">${q.opts.map(option => `<label><input data-part="value" type="checkbox" value="${esc(option)}" ${(value || []).includes(option) ? 'checked' : ''}><span>${esc(option)}</span></label>`).join('')}</div>`;
    if (q.type === 'history' || q.type === 'yesdetail') {
      const name = q.type === 'history' ? 'choice' : 'answer', selected = value?.[name];
      return `<select aria-label="${esc(q.label)}" data-part="${name}" data-detail-toggle>${options(q.opts || (q.type === 'history' ? ['بله','خیر'] : ['بله','خیر','نمی‌دانم']), selected)}</select><label class="portal-detail" ${selected !== 'بله' ? 'hidden' : ''}>${esc(q.detailLabel || 'شرح کوتاه')}<textarea data-part="detail" maxlength="1200">${esc(value?.detail)}</textarea></label>`;
    }
    if (q.type === 'fields') return `<div class="portal-field-grid">${q.fields.map(([name,label]) => `<label>${esc(label)}<input data-part="${name}" inputmode="decimal" maxlength="6" value="${esc(value?.[name])}"></label>`).join('')}</div>`;
    if (q.type === 'siblingMetrics') return `<select aria-label="${esc(q.label)}" data-part="status" data-sibling-toggle>${options(['دارد','ندارد','نمی‌دانم'], value?.status)}</select><div class="portal-siblings" ${value?.status !== 'دارد' ? 'hidden' : ''}>${[0,1,2].map(index => `<div class="portal-field-grid"><span>نفر ${num(index+1)}</span><label>قد (سانتی‌متر)<input data-part="height-${index}" inputmode="decimal" maxlength="6" value="${esc(value?.entries?.[index]?.height)}"></label><label>وزن (کیلوگرم)<input data-part="weight-${index}" inputmode="decimal" maxlength="6" value="${esc(value?.entries?.[index]?.weight)}"></label></div>`).join('')}</div>`;
    return '';
  }
  function valueText(answer) {
    if (!answer || answer.deferred || answer.value == null || answer.value === '') return answer?.deferred ? 'بعداً پاسخ می‌دهم' : 'بدون پاسخ';
    const value = answer.value;
    if (Array.isArray(value)) return value.join('، ') || 'بدون پاسخ';
    if (typeof value === 'object') {
      if (value.status) return value.status + (value.entries?.length ? ' — ' + value.entries.map(e => `قد: ${e.height || '—'}، وزن: ${e.weight || '—'}`).join(' / ') : '');
      if ('height' in value || 'weight' in value) return `قد: ${value.height || '—'}، وزن: ${value.weight || '—'}`;
      return [value.answer || value.choice, value.detail].filter(Boolean).join(' — ');
    }
    return String(value);
  }
  function unavailable() { return '<section class="panel"><h2>در انتظار به‌روزرسانی پرونده</h2><p>برای ذخیره این پرسشنامه، نسخه جدید سرور باید فعال شود. اطلاعات قبلی پرونده همچنان در «حساب من» در دسترس است.</p></section>'; }
  function intakeHtml() {
    if (!caps.intake) return unavailable();
    if (!record) return '<p role="status">در حال دریافت پرونده…</p>';
    if (review) return `<section class="panel portal-review"><div class="row"><div><span class="portal-eyebrow">مرور پرونده</span><h2>پاسخ‌های ثبت‌شده</h2></div>${button('edit','ادامه ویرایش')}</div><p>${num(record.answered)} پاسخ از ${num(record.total)} سؤال. ${num(record.missing.length)} سؤال هنوز کامل نشده است.</p><p class="muted">امکان ارسال پرونده ناقص و تکمیل آن در زمان دیگر وجود دارد. این فرم جایگزین معاینه و تشخیص پزشک نیست.</p>${record.submittedAt ? '<p class="portal-saved">پرونده برای پزشک ارسال شده است؛ تغییرهای بعدی نیز با ذخیره در دسترس او قرار می‌گیرند.</p>' : ''}${schema.sections.map((s, index) => `<details ${index === 0 ? 'open' : ''}><summary>${esc(s.title)} · ${num(s.items.filter(q => !record.missing.includes(q.id)).length)}/${num(s.items.length)}</summary><dl>${s.items.map(q => `<div class="${record.missing.includes(q.id) ? 'portal-missing' : ''}"><dt>${esc(q.label)}</dt><dd>${esc(valueText(record.answers[q.id]))}</dd></div>`).join('')}</dl>${button('section','ویرایش این بخش', `data-index="${index}"`)}</details>`).join('')}<div class="portal-sticky-actions">${button('submit-intake',h.state.user.role==='doctor'?'ثبت نهایی پرونده':'ارسال پرونده برای پزشک', '', 'primary')}${button('missing','رفتن به اولین پاسخ ناقص')}</div><div id="portal-save-status" role="status" aria-live="polite"></div></section>`;
    const s = schema.sections[section];
    return `<form id="portal-intake-form" class="panel portal-wizard"><span class="portal-eyebrow">پرسشنامه سلامت · بخش ${num(section+1)} از ${num(schema.sections.length)}</span><div class="row"><h2 tabindex="-1" id="portal-section-title">${esc(s.title)}</h2>${button('review','مرور همه پاسخ‌ها')}</div><p class="muted">${esc(s.subtitle || '')}</p><progress value="${section+1}" max="${schema.sections.length}" aria-label="بخش‌های پرسشنامه"></progress><p class="muted">اگر سؤال مربوط به شما نیست یا پاسخ را نمی‌دانید، «بعداً پاسخ می‌دهم» را انتخاب کنید. پاسخ‌ها با دکمه‌های پایین فرم روی سرور ذخیره می‌شوند.</p>${s.items.map(q => {
      const answer = record.answers[q.id] || {}, deferred = answer.deferred;
      return `<fieldset data-question="${q.id}" class="portal-question"><legend>${esc(q.label)}</legend>${q.help ? `<details class="portal-help"><summary>راهنمای سؤال</summary><p>${esc(q.help)}</p></details>` : ''}<div class="portal-answer" ${deferred ? 'hidden' : ''}>${control(q,answer.value)}</div>${identity.has(q.id) ? '<small class="muted">این مشخصات از پرونده پزشک خوانده می‌شود.</small>' : `<label class="portal-defer"><input type="checkbox" data-defer ${deferred ? 'checked' : ''}> بعداً پاسخ می‌دهم</label>`}</fieldset>`;
    }).join('')}<div class="portal-sticky-actions">${section ? button('previous','ذخیره و قبلی') : ''}<button type="submit" class="primary">${section === schema.sections.length-1 ? 'ذخیره و مرور نهایی' : 'ذخیره و بعدی'}</button>${button('save','ذخیره و ادامه در زمان دیگر')}</div><p id="portal-save-status" role="status" aria-live="polite">${dirty ? 'تغییرهای این بخش هنوز ذخیره نشده‌اند.' : 'آخرین پاسخ‌های ذخیره‌شده نمایش داده می‌شوند.'}</p></form>`;
  }
  function collect() {
    const form = document.querySelector('#portal-intake-form'); if (!form) return;
    const questions = schema.sections[section].items;
    form.querySelectorAll('[data-question]').forEach(field => {
      const q = questions.find(item => item.id === field.dataset.question); if (identity.has(q.id)) return;
      const get = part => field.querySelector(`[data-part="${part}"]`)?.value || '';
      const deferred = field.querySelector('[data-defer]')?.checked || false; let value;
      if (q.type === 'multi') value = [...field.querySelectorAll('input[data-part]:checked')].map(input => input.value);
      else if (q.type === 'history' || q.type === 'yesdetail') { const name = q.type === 'history' ? 'choice' : 'answer'; value = get(name) ? {[name]:get(name),detail:get('detail')} : null; }
      else if (q.type === 'fields') value = Object.fromEntries(q.fields.map(([name]) => [name,get(name)]));
      else if (q.type === 'siblingMetrics') value = get('status') ? {status:get('status'),entries:[0,1,2].map(i => ({height:get('height-'+i),weight:get('weight-'+i)})).filter(e => e.height || e.weight)} : null;
      else value = get('value');
      record.answers[q.id] = {value:deferred ? null : value,deferred};
    });
  }
  async function save(submit = false) {
    collect();
    const status = document.querySelector('#portal-save-status'); if (status) status.textContent = 'در حال ذخیره…';
    try { record = await h.api('patient.intake',{patientId:id(),answers:record.answers,revision:record.revision,submit}); dirty = false; }
    catch (error) { if (status) {status.textContent=error.message; if (error.status === 409) status.insertAdjacentHTML('beforeend',button('reload-intake','دریافت نسخه تازه (کنار گذاشتن تغییرهای ذخیره‌نشده)'));} throw error; }
  }
  function educationHtml() {
    return `<section class="portal-catalog-head"><span class="portal-eyebrow">یاد بگیر، بهتر مراقبت کن</span><h2>آموزش و مراقبت</h2><p>راهنماهای منتشرشده توسط مجموعه درمان</p></section><section class="panel"><label for="portal-search">جست‌وجوی آموزش</label><input id="portal-search" type="search" value="${esc(search)}" placeholder="عنوان یا موضوع آموزش"><label for="portal-media-type">نوع آموزش</label><select id="portal-media-type">${[['','همه آموزش‌ها'],['video','ویدئو'],['slides','آموزش تصویری']].map(([value,label])=>`<option value="${value}" ${mediaType===value?'selected':''}>${label}</option>`).join('')}</select><label for="portal-topic">موضوع</label><select id="portal-topic"><option value="">همه موضوع‌ها</option>${catalog.education.topics.map(value => `<option ${topic===value?'selected':''}>${esc(value)}</option>`).join('')}</select><div id="portal-catalog-results">${educationResults()}</div></section>`;
  }
  function educationItems() { return catalog.education.items.filter(item => (!mediaType || item.type===mediaType) && (!topic || item.topic===topic) && `${item.title} ${item.description || ''}`.includes(search.trim())); }
  function educationResults() { const items=educationItems(); return `<p class="muted">${num(items.length)} آموزش</p><div class="portal-catalog-grid">${items.map(item => `<article><small>${esc(item.topic)}</small><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p>${button('lesson','مشاهده راهنما',`data-id="${esc(item.id)}"`)}</article>`).join('')}</div>${items.length?'':'<div class="portal-empty"><span aria-hidden="true">▤</span><h3>هنوز آموزشی برای این بخش منتشر نشده است</h3><p>با انتشار محتوای مجموعه، آموزش‌ها در اینجا نمایش داده می‌شوند.</p></div>'}`; }
  function lesson(idValue, index=0) {
    const item = catalog.education.items.find(i=>i.id===idValue); if (!item) return;
    if(item.type==='video') {const url=new URL(item.url,location.origin);if(url.protocol!=='https:')throw Error('نشانی ویدئو معتبر نیست');h.modal(item.title,`<p>${esc(item.description)}</p><a class=primary href="${esc(url.href)}" target=_blank rel=noopener>مشاهده ویدئو در منبع اصلی</a>`);return;}
    const slides=item.slides || []; if (!slides.length) return;
    itemIndex=Math.max(0,Math.min(index,slides.length-1));
    h.modal(item.title,`<div class="portal-lesson" data-lesson="${esc(item.id)}"><p>${esc(slides[itemIndex].text)}</p>${slides[itemIndex].image ? `<img src="${esc(slides[itemIndex].image)}" alt="${esc(slides[itemIndex].alt || item.title)}">` : ''}<div class="row">${button('lesson-prev','قبلی',`data-id="${esc(item.id)}" ${itemIndex===0?'disabled':''}`)}<span>${num(itemIndex+1)} / ${num(slides.length)}</span>${button('lesson-next','بعدی',`data-id="${esc(item.id)}" ${itemIndex===slides.length-1?'disabled':''}`)}</div></div>`);
  }
  function storeItems() { const items=catalog.store.products.filter(item => !categories.size || categories.has(item.category)); return [...items].sort((a,b)=>sort==='price'?a.price-b.price:sort==='popular'?(b.popularity||0)-(a.popularity||0):(a.order||0)-(b.order||0)); }
  function storeResults() { const items=storeItems(); return `<p class="muted">${num(items.length)} کالا</p><div class="portal-catalog-grid">${items.map(item=>`<article><small>${esc(item.category)}</small><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p><b>${num(item.price)} تومان</b>${button('cart-add','افزودن به سبد',`data-id="${esc(item.id)}"`)}</article>`).join('')}</div>${items.length?'':'<div class="portal-empty"><span aria-hidden="true">▱</span><h3>هنوز کالایی در این بخش عرضه نشده است</h3><p>پس از ثبت کالاهای واقعی، می‌توانید آن‌ها را بررسی و به سبد اضافه کنید.</p></div>'}`; }
  function storeHtml() { return `<section class="portal-catalog-head"><span class="portal-eyebrow">همراه مراقبت روزانه</span><h2>فروشگاه پیکو</h2><p>لوازم مراقبت و نگهداری ارتودنسی</p></section><section class="panel"><div class="row">${button('kit','پیشنهادهای مراقبتی')}${button('cart',`سبد انتخاب‌ها (${num([...cart.values()].reduce((a,b)=>a+b,0))})`)}</div><details class="portal-filters"><summary>فیلتر دسته‌بندی</summary><div class="portal-options">${catalog.store.categories.map(value=>`<label><input type="checkbox" data-store-category value="${esc(value)}" ${categories.has(value)?'checked':''}>${esc(value)}</label>`).join('')}</div>${button('reset-filters','پاک کردن فیلترها')}</details><label for="portal-sort">مرتب‌سازی</label><select id="portal-sort">${[['reco','پیشنهاد پیکو'],['popular','محبوب‌ترین'],['price','قیمت: کم به زیاد']].map(([value,label])=>`<option value="${value}" ${sort===value?'selected':''}>${label}</option>`).join('')}</select><div id="portal-store-results">${storeResults()}</div></section>`; }
  function cartHtml() { const rows=[...cart].map(([idValue,quantity])=>({item:catalog.store.products.find(i=>i.id===idValue),quantity})).filter(row=>row.item); return `<div class="portal-cart">${rows.length?rows.map(({item,quantity})=>`<article><b>${esc(item.title)}</b><p>${num(quantity)} عدد · ${num(item.price*quantity)} تومان</p>${button('cart-remove','کم کردن',`data-id="${esc(item.id)}"`)}${button('cart-add','اضافه کردن',`data-id="${esc(item.id)}"`)}</article>`).join(''):'<p>سبد شما خالی است.</p>'}<p>مجموع: ${num(rows.reduce((sum,row)=>sum+row.item.price*row.quantity,0))} تومان</p><small class="muted">امکان ثبت سفارش و پرداخت هنوز فعال نشده است.</small></div>`; }
  function roadmap(original) {
    if (h.state.rewards?.mode === 'adult' || !h.state.steps.length) return original;
    return `<div class="portal-journey"><div class="portal-journey-title"><span>مسیر لبخند تو</span><b>${num(h.state.steps.filter(s=>s.completed_at).length)} از ${num(h.state.steps.length)} قدم</b></div><div class="portal-path">${h.state.steps.map((step,index)=>`<div class="portal-node-row n${index%4}"><button class="portal-node ${step.completed_at?'done':step.paused_at?'paused':Date.now()<DantoRewards.start(step)?'future':'ready'}" data-portal="step" data-id="${esc(step.id)}" aria-label="${esc(step.title)}${step.completed_at?'، انجام‌شده':''}"><span>${step.completed_at?'✓':num(index+1)}</span></button><div><b>${esc(step.title)}</b><small>${h.date(step.due_at)}</small><span>${step.completed_at?'انجام‌شده':step.paused_at?'متوقف':Date.now()<DantoRewards.start(step)?'در پیش رو':'مشاهده مرحله'}</span></div></div>`).join('')}</div></div>`;
  }
  function stepModal(stepId) {
    const steps=h.state.steps,index=steps.findIndex(s=>s.id===stepId); if(index<0)return;
    const step=steps[index], temp=document.createElement('div');temp.innerHTML=DantoRewards.roadmap(h.state,false);
    const action=[...temp.querySelectorAll('[data-scan-step],[data-complete-step]')].find(el=>(el.dataset.scanStep||el.dataset.completeStep)===step.id);
    h.modal(step.title,`<div class="portal-step-detail"><span class="portal-eyebrow">قدم ${num(index+1)} از ${num(steps.length)}</span><p>${esc(step.detail || 'راهنمای این مرحله را از پزشک دریافت کنید.')}</p><p>موعد: ${h.date(step.due_at)}</p><p>${step.completed_at?'این مرحله تکمیل شده است.':step.paused_at?'این مرحله توسط پزشک متوقف شده است.':Date.now()<DantoRewards.start(step)?'بازه انجام این مرحله هنوز شروع نشده است.':'برای ثبت، از اقدام این مرحله استفاده کنید.'}</p>${action?.outerHTML || ''}<div class="row">${button('step','قدم قبلی',`data-id="${esc(steps[index-1]?.id||'')}" ${index===0?'disabled':''}`)}${button('step','قدم بعدی',`data-id="${esc(steps[index+1]?.id||'')}" ${index===steps.length-1?'disabled':''}`)}</div></div>`);
  }
  function messageExtras(message) {
    return `${message.reply_to_id ? `<button type="button" class="portal-quote" data-portal="jump-message" data-id="${esc(message.reply_to_id)}"><small>در پاسخ به</small><span>${esc(message.reply_body || 'پیام پیشین در دسترس نیست')}</span></button>` : ''}${message.scan_id ? button('linked-scan','مشاهده تصاویر گزارش',`data-id="${esc(message.scan_id)}"`,'link-btn') : ''}`;
  }
  function messageActions(message) { return caps.replies ? button('reply','پاسخ',`data-id="${esc(message.id)}"`,'portal-reply') : ''; }
  function composer() { return `${reply ? `<div class="portal-reply-preview"><small>در پاسخ به</small><p>${esc(reply.body)}</p>${button('cancel-reply','لغو پاسخ')}</div>` : ''}${h.state.user.role==='patient' ? button('urgent','گزارش فوری همراه تصویر','','link-btn') : ''}`; }
  function scanIntro() {
    return `<section class="panel portal-scan-guide">${urgent ? `<div class="portal-urgent-banner"><b>گزارش فوری</b><p>${esc(urgent)}</p>${button('cancel-urgent','لغو گزارش فوری')}</div>` : ''}<details open><summary>قبل از ارسال تصویر</summary><ol><li>دست‌ها و لنز دوربین را تمیز کنید و در محیط روشن قرار بگیرید.</li><li>دوربین را ثابت نگه دارید و نمای خواسته‌شده توسط پزشک را ثبت کنید.</li><li>واضح بودن عکس را بررسی کنید؛ در صورت نیاز تصویر دیگری انتخاب کنید.</li></ol><p>می‌توانید از دوربین گوشی یا تصاویر موجود استفاده کنید. برای وضعیت پزشکی اورژانسی از خدمات اورژانس استفاده کنید.</p></details></section>`;
  }
  function roadmapLayout(calendar,heading,content) { return h.state.rewards?.mode==='adult' ? calendar+heading+content : heading+content+'<details class="panel portal-calendar"><summary>تقویم درمان</summary>'+calendar+'</details>'; }
  function drawPath(path) {
    const rect=path.getBoundingClientRect(), nodes=[...path.querySelectorAll('.portal-node')].map(node=>{const r=node.getBoundingClientRect();return {x:r.left+r.width/2-rect.left,y:r.top+r.height/2-rect.top};});
    if(!nodes.length || !rect.width)return;
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 '+rect.width+' '+rect.height);svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
    const line=document.createElementNS(ns,'path');let d='M '+nodes[0].x+' '+nodes[0].y;
    nodes.slice(1).forEach((node,index)=>{const previous=nodes[index],mid=(previous.y+node.y)/2;d+=' C '+previous.x+' '+mid+' '+node.x+' '+mid+' '+node.x+' '+node.y;});
    line.setAttribute('d',d);line.setAttribute('fill','none');line.setAttribute('stroke','#b7d9c9');line.setAttribute('stroke-width','6');line.setAttribute('stroke-dasharray','1 13');line.setAttribute('stroke-linecap','round');svg.append(line);path.querySelector(':scope > svg')?.remove();path.prepend(svg);
  }
  function afterRender() {
    pathObserver?.disconnect();const path=document.querySelector('.portal-path');if(path){drawPath(path);pathObserver=new ResizeObserver(()=>drawPath(path));pathObserver.observe(path);}
    previewUrls.forEach(URL.revokeObjectURL);previewUrls=[];
    const scanForm=document.querySelector('#scan-form');
    if(scanForm && urgent) {scanForm.querySelector('.scan-step-choice')?.remove();scanForm.querySelector('p.muted')?.remove();scanForm.insertAdjacentHTML('afterbegin',`<input type="hidden" name="urgentSubject" value="${esc(urgent)}">`);}
  }
  async function render(view,root) { if(!['intake','education','store'].includes(view))return false;root.innerHTML=view==='intake'?intakeHtml():view==='education'?educationHtml():storeHtml();return true; }
  document.addEventListener('input',event=>{if(event.target.closest('#portal-intake-form')){dirty=true;collect();const status=document.querySelector('#portal-save-status');if(status)status.textContent='تغییرهای این بخش هنوز ذخیره نشده‌اند.';}if(event.target.id==='portal-search'){search=event.target.value;document.querySelector('#portal-catalog-results').innerHTML=educationResults();}});
  document.addEventListener('change',event=>{
    const el=event.target, field=el.closest('[data-question]');
    if(el.hasAttribute('data-defer'))field.querySelector('.portal-answer').hidden=el.checked;
    if(el.hasAttribute('data-detail-toggle'))field.querySelector('.portal-detail').hidden=el.value!=='بله';
    if(el.hasAttribute('data-sibling-toggle'))field.querySelector('.portal-siblings').hidden=el.value!=='دارد';
    if(field){dirty=true;collect();}
    if(el.id==='portal-media-type'){mediaType=el.value;document.querySelector('#portal-catalog-results').innerHTML=educationResults();}
    if(el.id==='portal-topic'){topic=el.value;document.querySelector('#portal-catalog-results').innerHTML=educationResults();}
    if(el.hasAttribute('data-store-category')){el.checked?categories.add(el.value):categories.delete(el.value);document.querySelector('#portal-store-results').innerHTML=storeResults();}
    if(el.id==='portal-sort'){sort=el.value;document.querySelector('#portal-store-results').innerHTML=storeResults();}
    if(el.matches('#scan-form input[type=file]')) {el.parentElement.querySelector('.portal-upload-preview')?.remove();const file=el.files[0];if(file){const url=URL.createObjectURL(file);previewUrls.push(url);const img=document.createElement('img');img.className='portal-upload-preview';img.alt='پیش‌نمایش تصویر انتخاب‌شده';img.src=url;el.parentElement.append(img);}}
  });
  document.addEventListener('submit',async event=>{
    if(!['portal-intake-form','portal-urgent-form'].includes(event.target.id))return;
    event.preventDefault();event.stopImmediatePropagation();const form=event.target,buttons=[...form.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
    try{if(form.id==='portal-urgent-form'){urgent=form.querySelector('textarea').value.trim();if(urgent.length<3)throw Error('موضوع را دست‌کم در سه نویسه بنویسید.');h.state.scanStepId=null;h.closeModal();h.state.patientView='scans';await h.renderPatient();}else{await save();if(section<schema.sections.length-1)section++;else review=true;await rerender();document.querySelector('#portal-section-title')?.focus();}}catch(error){h.showError(error);}finally{buttons.forEach(b=>b.disabled=false);}
  });
  document.addEventListener('click',async event=>{
    const el=event.target.closest('[data-portal]');if(!el || !h)return;event.preventDefault();event.stopImmediatePropagation();if(el.disabled)return;
    const action=el.dataset.portal;el.disabled=true;
    try {
      if(['intake','education','store'].includes(action)){if(action==='intake')review=Boolean(record?.submittedAt);h.state.user.role==='doctor'?h.state.detailTab='intake':h.state.patientView=action;await rerender();}
      else if(['save','previous','review','submit-intake','section','missing'].includes(action)) {await save(action==='submit-intake');if(action==='previous')section=Math.max(0,section-1);if(action==='review'||action==='submit-intake')review=true;if(action==='section'){section=Number(el.dataset.index);review=false;}if(action==='missing'){const index=schema.sections.findIndex(s=>s.items.some(q=>record.missing.includes(q.id)));section=Math.max(0,index);review=false;}if(action==='save')h.state.user.role==='doctor'?h.state.detailTab='record':h.state.patientView='home';await rerender();h.toast(action==='submit-intake'?(h.state.user.role==='doctor'?'پرونده ثبت شد.':'پرونده برای پزشک ارسال شد.'):'پاسخ‌ها ذخیره شدند.');}
      else if(action==='edit'){review=false;await rerender();}
      else if(action==='reload-intake'){record=await h.api('patient.intake',null,{patientId:id()});dirty=false;await rerender();}
      else if(action==='step')stepModal(el.dataset.id);
      else if(action==='reply'){reply=h.state.messages.find(m=>m.id===el.dataset.id);await rerender();document.querySelector('#message-form textarea')?.focus();}
      else if(action==='cancel-reply'){reply=null;await rerender();}
      else if(action==='jump-message'){const target=document.getElementById('message-'+el.dataset.id);if(target){target.scrollIntoView({block:'center',behavior:'smooth'});target.classList.add('portal-highlight');setTimeout(()=>target.classList.remove('portal-highlight'),1800);}else h.toast('پیام مرجع در فهرست اخیر موجود نیست.');}
      else if(action==='linked-scan'){const scan=h.state.scans.find(s=>s.id===el.dataset.id);if(scan)h.modal('تصاویر گزارش فوری',`<div class="scan-thumbs">${scan.images.map(i=>`<a href="${h.imageUrl(i.id)}" target="_blank" rel="noopener"><img src="${h.imageUrl(i.id)}" alt="تصویر گزارش"></a>`).join('')}</div>`);else h.toast('این اسکن در فهرست اخیر موجود نیست.');}
      else if(action==='urgent'){if(!caps.urgentScans)h.modal('گزارش فوری','<p>گزارش تصویری پس از به‌روزرسانی سرور فعال می‌شود. می‌توانید از بخش پیام‌ها با پزشک تماس بگیرید.</p>');else h.modal('گزارش فوری همراه تصویر','<form id="portal-urgent-form"><label for="urgent-subject">موضوع و شرح مشکل</label><textarea id="urgent-subject" minlength="3" maxlength="300" required placeholder="مشکل را کوتاه توضیح دهید"></textarea><p class="muted">در مرحله بعد، تصویر را انتخاب می‌کنید. گزارش پس از ارسال موفق تصویر ثبت می‌شود. این سامانه جایگزین خدمات اورژانس نیست.</p><button class="primary">ادامه و انتخاب تصویر</button></form>');}
      else if(action==='cancel-urgent'){urgent='';await h.renderPatient();}
      else if(action==='lesson')lesson(el.dataset.id);
      else if(action==='lesson-prev'||action==='lesson-next')lesson(el.dataset.id,itemIndex+(action==='lesson-next'?1:-1));
      else if(action==='reset-filters'){categories.clear();await rerender();}
      else if(action==='cart-add'||action==='cart-remove'){const item=catalog.store.products.find(i=>i.id===el.dataset.id);if(item){const quantity=(cart.get(item.id)||0)+(action==='cart-add'?1:-1);quantity>0?cart.set(item.id,Math.min(quantity,99)):cart.delete(item.id);h.modal('سبد انتخاب‌ها',cartHtml());}}
      else if(action==='cart')h.modal('سبد انتخاب‌ها',cartHtml());
      else if(action==='kit'){const items=catalog.store.recommendations.filter(item=>item.treatmentType===h.state.profile?.treatment_type);h.modal('پیشنهادهای مراقبتی',items.length?items.map(item=>`<p>${esc(item.text)}</p>`).join(''):'<p>هنوز پیشنهادی برای برنامه درمان شما ثبت نشده است. انتخاب لوازم درمانی را با پزشک هماهنگ کنید.</p>');}
    }catch(error){h.showError(error);}finally{el.disabled=false;}
  });
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  return {init,load,home,intakeCard,render,roadmap,roadmapLayout,messageExtras,messageActions,composer,scanIntro,afterRender,replyId:()=>reply?.id||null,messageSent:()=>{reply=null;},scanSent:()=>{const wasUrgent=Boolean(urgent);urgent='';return wasUrgent;}};
})();
