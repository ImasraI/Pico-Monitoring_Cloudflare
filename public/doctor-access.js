// The API enforces these grants on every request; this layer explains them in the portal.
(() => {
  const grants = {
    "patients.manage": { label:"افزودن و ویرایش بیمار", buttons:'#add-patient,#edit-patient-personal,#renew-patient-invite', forms:'#patient-create-form,#patient-personal-form' },
    "files.manage": { label:"ثبت و حذف مدارک", buttons:'[data-delete-patient-file],[data-record-files]', forms:'#patient-files-batch-form,#patient-file-form' },
    "treatment.manage": { label:"برنامه و یادداشت درمان", buttons:'[data-edit-clinical],#edit-patient-profile,[data-assign-patient],[data-plan-add],[data-plan-edit],[data-plan-day],[data-pause-step],[data-delete-note],#delete-plan-event,#delete-plan-series', forms:'#patient-profile-form,#note-form,#note-delete-form,#plan-event-form,#step-form' },
    "scans.review": { label:"بررسی و تأیید اسکن", buttons:'[data-review-scan]', forms:'#review-form' },
    "messages.send": { label:"ارسال پیام", buttons:'', forms:'#message-form' },
    "rewards.manage": { label:"تنظیم و اصلاح امتیاز", buttons:'[data-rewards-action="rules"],[data-rewards-action="correct"]', forms:'#reward-rules-form,#reward-correction-form' },
  };
  function restrict(){
    if(state.user?.role!=="doctor")return;
    for(const [key,grant] of Object.entries(grants)){
      const allowed=state.user.permissions?.includes(key);
      const selectors=[grant.buttons,...grant.forms.split(',').map(form=>form+' button[type="submit"]')].filter(Boolean).join(',');
      document.querySelectorAll(selectors).forEach(button=>{
        if(!allowed&&!button.disabled){button.dataset.accessDisabled="true";button.disabled=true;button.title="این دسترسی توسط ادمین غیرفعال شده است.";}
        if(allowed&&button.dataset.accessDisabled){button.disabled=false;delete button.dataset.accessDisabled;button.removeAttribute("title");}
      });
      document.querySelectorAll(grant.forms).forEach(form=>{
        const hint=form.querySelector('[data-access-hint]');
        if(allowed){hint?.remove();return;}
        if(!hint){const text=document.createElement('p');text.dataset.accessHint="";text.className="muted";text.textContent="دسترسی «"+grant.label+"» توسط ادمین غیرفعال شده است.";form.append(text);}
      });
    }
  }
  let scheduled=false;
  new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;restrict();});}).observe(document.body,{childList:true,subtree:true});
  restrict();
  setInterval(async()=>{
    if(state.user?.role!=="doctor"||document.hidden)return;
    try{state.user=(await api('me')).user;restrict();}
    catch(error){state.user=null;showShell('login-screen');toast(error.message);}
  },30000);
})();
