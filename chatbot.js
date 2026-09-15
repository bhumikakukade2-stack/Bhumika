/* ============ MERIDIAN ASSISTANT ============
   A lightweight, fully client-side assistant. No external API calls —
   it reasons over the same `db` object app.js already maintains, plus
   a small FAQ knowledge base. Keeps everything private to the browser. */

(function(){
  const toggle = document.getElementById('chatToggle');
  const panel = document.getElementById('chatPanel');
  const messages = document.getElementById('chatMessages');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const suggestions = document.getElementById('chatSuggestions');

  const FAQ = {
    'visiting hours': "Visiting hours are 10:00 AM–1:00 PM and 5:00 PM–8:00 PM daily. ICU visits are limited to immediate family.",
    'emergency': "For emergencies, go straight to the Emergency ward on the ground floor — it's open 24/7. No appointment needed.",
    'insurance': "We accept most major insurance providers. Bring your policy card to the billing desk when you register.",
    'parking': "Visitor parking is available in Block B, free for the first hour and $2/hour after.",
    'contact': "Main reception: (555) 019-2200. Emergency line: (555) 019-2911."
  };

  function addMessage(text, sender){
    const el = document.createElement('div');
    el.className = `chat-msg ${sender}`;
    el.innerHTML = text;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
    return el;
  }

  function showTyping(){
    const el = document.createElement('div');
    el.className = 'chat-msg bot typing';
    el.innerHTML = `<span class="typing-dots"><span></span><span></span><span></span></span>`;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
    return el;
  }

  function openPanel(){
    panel.classList.add('open');
    toggle.classList.add('open');
    if(!messages.dataset.greeted){
      messages.dataset.greeted = '1';
      addMessage("Hi, I'm the Meridian Assistant. I can look up patients, doctors, appointments and billing, or answer general hospital questions. What do you need?", 'bot');
    }
    input.focus();
  }
  function closePanel(){
    panel.classList.remove('open');
    toggle.classList.remove('open');
  }

  toggle.addEventListener('click', () => {
    panel.classList.contains('open') ? closePanel() : openPanel();
  });

  suggestions.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if(!chip) return;
    handleQuery(chip.dataset.q);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if(!text) return;
    input.value = '';
    handleQuery(text);
  });

  function handleQuery(text){
    addMessage(escapeHtml(text), 'user');
    const typingEl = showTyping();
    const delay = 350 + Math.random() * 350;
    setTimeout(() => {
      typingEl.remove();
      const reply = answer(text);
      addMessage(reply, 'bot');
    }, delay);
  }

  function escapeHtml(s){
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  /* ---------- INTENT MATCHING ---------- */
  function answer(raw){
    const q = raw.toLowerCase();

    // greetings
    if(/^(hi|hello|hey|namaste|hola)\b/.test(q)){
      return "Hello! Ask me things like “today's appointments”, “find patient Ravi”, or “outstanding bills”.";
    }

    // FAQ lookup
    for(const key in FAQ){
      if(q.includes(key)) return FAQ[key];
    }

    // patient count
    if(/(how many|count).*patient/.test(q) || /patients? (total|count)/.test(q)){
      return `There ${db.patients.length === 1 ? 'is' : 'are'} currently <b>${db.patients.length}</b> patient record${db.patients.length===1?'':'s'} in the system.`;
    }

    // doctor count / list
    if(/(how many|count|list).*doctor/.test(q) || /doctors? (total|count|list)/.test(q)){
      if(db.doctors.length === 0) return "There are no doctors on file yet.";
      const list = db.doctors.map(d => `• ${d.name} — ${d.specialty}`).join('\n');
      return `We have <b>${db.doctors.length}</b> doctor${db.doctors.length===1?'':'s'} on staff:\n${list}`;
    }

    // find a specific patient by name
    let m = q.match(/(?:patient|find|search)\s+(?:named\s+|for\s+)?([a-z\s]{3,})$/);
    if(m){
      const name = m[1].trim();
      const found = db.patients.filter(p => p.name.toLowerCase().includes(name));
      if(found.length){
        return found.map(p => `<b>${p.name}</b> (${p.id})\nAge ${p.age}, ${p.gender} · ${p.condition}\nStatus: ${p.status} · Admitted ${p.admitted}`).join('\n\n');
      }
      return `I couldn't find a patient matching "${name}". Try the Patients tab search for a broader look.`;
    }

    // find a specific doctor by name or specialty
    m = q.match(/doctor\s+(?:named\s+|for\s+)?([a-z\s]{3,})$/);
    if(m){
      const term = m[1].trim();
      const found = db.doctors.filter(d => d.name.toLowerCase().includes(term) || d.specialty.toLowerCase().includes(term));
      if(found.length){
        return found.map(d => `<b>${d.name}</b> — ${d.specialty}\n${d.experience} yrs experience · Available: ${d.days || '—'}`).join('\n\n');
      }
      return `No doctor matches "${term}". Try searching by specialty, e.g. "doctor cardiology".`;
    }

    // today's / upcoming appointments
    if(/appointments?.*(today|now)/.test(q) || /today.*appointments?/.test(q)){
      const todayIso = new Date().toISOString().slice(0,10);
      const todays = db.appointments.filter(a => a.date === todayIso);
      if(!todays.length) return "No appointments are scheduled for today.";
      const list = todays.map(a => {
        const p = db.patients.find(x => x.id === a.patientId);
        const d = db.doctors.find(x => x.id === a.doctorId);
        return `• ${a.time} — ${p ? p.name : 'Unknown'} with ${d ? d.name : 'unassigned'} (${a.status})`;
      }).join('\n');
      return `Today's appointments:\n${list}`;
    }
    if(/upcoming appointments?/.test(q) || /appointments?.*upcoming/.test(q)){
      const upcoming = [...db.appointments]
        .filter(a => a.status !== 'Cancelled' && a.status !== 'Completed')
        .sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time))
        .slice(0,5);
      if(!upcoming.length) return "There are no upcoming appointments.";
      const list = upcoming.map(a => {
        const p = db.patients.find(x => x.id === a.patientId);
        const d = db.doctors.find(x => x.id === a.doctorId);
        return `• ${a.date} ${a.time} — ${p ? p.name : 'Unknown'} with ${d ? d.name : 'unassigned'} (${a.status})`;
      }).join('\n');
      return `Next up:\n${list}`;
    }

    // billing / outstanding
    if(/(outstanding|unpaid|pending).*(bill|invoice|payment)/.test(q) || /bill.*(outstanding|unpaid|pending)/.test(q)){
      const unpaid = db.bills.filter(b => b.status !== 'Paid');
      if(!unpaid.length) return "All invoices are paid — nothing outstanding right now.";
      const total = unpaid.reduce((s,b) => s + Number(b.amount), 0);
      const list = unpaid.map(b => {
        const p = db.patients.find(x => x.id === b.patientId);
        return `• ${b.id} — ${p ? p.name : 'Unknown'}: $${Number(b.amount).toLocaleString()} (${b.status})`;
      }).join('\n');
      return `Outstanding total: <b>$${total.toLocaleString()}</b>\n${list}`;
    }
    if(/total (revenue|billing|billed)/.test(q)){
      const total = db.bills.reduce((s,b) => s + Number(b.amount), 0);
      return `Total billed across all invoices: <b>$${total.toLocaleString()}</b>.`;
    }

    // admitted count
    if(/admitted/.test(q)){
      const admitted = db.patients.filter(p => p.status === 'Admitted');
      if(!admitted.length) return "No patients are currently admitted.";
      return `Currently admitted (${admitted.length}):\n${admitted.map(p => `• ${p.name} — ${p.condition}`).join('\n')}`;
    }

    // help
    if(/help|what can you do/.test(q)){
      return "I can help with:\n• Patient lookups (\"find patient Ravi\")\n• Doctor info (\"doctor cardiology\")\n• Today's or upcoming appointments\n• Outstanding bills and revenue totals\n• General FAQs: visiting hours, emergency, insurance, parking, contact";
    }

    return "I'm not sure about that yet. Try asking about patients, doctors, appointments, billing, or hospital info like visiting hours and emergency contact.";
  }

  // close on Escape
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && panel.classList.contains('open')) closePanel();
  });
})();