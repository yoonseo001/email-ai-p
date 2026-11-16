// Study 2 실험·설문 통합 페이지 (영문)
// 흐름: 안내 → 스크리닝(한 화면 한 문항) → 동의 → 과업 안내 → 이메일 작성(자극물) → 설문 → (파일럿 의견) → 종료
// 화면 문구는 모두 survey.js에 있다. 저장: 단계를 넘길 때마다 Supabase에 저장하고, 새로고침에 대비해 브라우저에도 보관한다.
(function () {
  'use strict';
  const CFG = window.STUDY_CONFIG || {}, S = window.SURVEY, U = S.ui;
  const qs = new URLSearchParams(location.search);
  const BASE_MODE = CFG.MODE === 'main' ? 'main' : 'pilot';
  const PREVIEW = !CFG.SUPABASE_URL || !CFG.SUPABASE_KEY || qs.get('preview') === '1';
  const TEST = qs.get('test') === '1';
  const MODE = TEST ? 'test' : BASE_MODE;
  const FORCE = (TEST || PREVIEW) ? parseInt(qs.get('cond'), 10) : NaN;
  const PID = qs.get('PROLIFIC_PID') || '';
  const KEY = 'study2-app-en-v1:' + BASE_MODE + (TEST ? ':test' : '') + (PREVIEW ? ':preview' : '') + (PID ? ':' + PID : '');
  const LEASE = KEY + ':lease';
  const app = document.getElementById('app');
  const LIKERT = S.likert.pages;
  const STAGES = ['intro', ...S.screening.map((_, i) => 'sq' + (i + 1)), 'consent', 'task_intro', 'task', 'aq1',
    ...LIKERT.map((_, i) => 's' + (i + 1)), 'mc', 'bq', 'dq', ...(BASE_MODE === 'pilot' ? ['pf'] : []), 'end'];

  let state = null, pageEnteredAt = Date.now(), finalRecord = null;

  // ── 작은 도구들 ─────────────────────────────────────────────
  const uuid = () => crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
    for (const kid of kids.flat(Infinity)) { if (kid == null || kid === false) continue; el.append(kid.nodeType ? kid : document.createTextNode(kid)); }
    return el;
  }
  const paras = list => list.map(t => h('p', { text: t }));
  let closed = false; // 종료 화면에 도달하면 브라우저 보관분을 지우고 더 이상 보관하지 않는다
  function persist() { if (!state || closed) return; try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 보관 실패 시에도 진행 */ } }
  function clearLocal() { try { localStorage.removeItem(KEY); } catch (e) { } }
  function closeLocal() { closed = true; clearLocal(); }
  const blankClock = () => ({ activeMs: 0, inactiveMs: 0, afterApplyActiveMs: 0, afterApplyInactiveMs: 0, writingActiveMs: 0, writingInactiveMs: 0, offlineMs: 0 });

  // ── 서버 호출 (Supabase의 함수 호출 주소) ───────────────────────
  async function rpc(fn, body, opts) {
    const p = Object.assign({}, state ? { participant_id: state.participantId, token: state.token } : {}, body);
    if (PREVIEW) return previewRpc(fn, p);
    const headers = { 'Content-Type': 'application/json', apikey: CFG.SUPABASE_KEY };
    if (/^eyJ/.test(CFG.SUPABASE_KEY)) headers.Authorization = 'Bearer ' + CFG.SUPABASE_KEY; // 예전 형식(anon) 키
    const init = { method: 'POST', headers, body: JSON.stringify({ p }) };
    if (opts && opts.keepalive) init.keepalive = true; else if (window.AbortSignal && AbortSignal.timeout) init.signal = AbortSignal.timeout(15000);
    const res = await fetch(CFG.SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/rpc/' + fn, init);
    if (!res.ok) { let m = 'HTTP ' + res.status; try { const j = await res.json(); if (j && j.message) m = j.message; } catch (e) { } throw new Error(m); }
    return res.json();
  }
  function previewRpc(fn) {
    if (fn === 'start_session') return { participant_id: uuid(), token: uuid(), status: 'started', stage: 'intro', answers: {}, max_seq: 0 };
    if (fn === 'give_consent') { const c = FORCE >= 1 && FORCE <= 4 ? FORCE : 1 + Math.floor(Math.random() * 4); return { condition: c, ai_output: (window.PREVIEW_STIMULI || {})[c] }; }
    if (fn === 'resume_session') return null;
    return { ok: true };
  }

  // ── 행동 로그: 생기는 즉시 대기열에 넣고 서버로 보낸다 ──────────────
  let flushing = false, flushTimer = 0;
  function logEvent(type, payload, clientTime) {
    if (!state) return;
    const t = clientTime ? Date.parse(clientTime) : Date.now();
    state.evQueue.push({ seq: ++state.evSeq, type, client_time: new Date(t).toISOString(), elapsed_ms: t - state.startedAt, payload: payload == null ? null : payload });
    persist(); clearTimeout(flushTimer); flushTimer = setTimeout(flushEvents, 600);
  }
  async function flushEvents(opts) {
    if (flushing || !state || !state.evQueue.length) return !state || !state.evQueue.length;
    flushing = true;
    const batch = state.evQueue.slice();
    try {
      await rpc('log_events', { events: batch }, opts);
      const max = batch[batch.length - 1].seq;
      state.evQueue = state.evQueue.filter(e => e.seq > max); persist();
      return true;
    } catch (e) { return false; } finally { flushing = false; }
  }

  // ── 시간 기록 (자극물 원본의 방식 그대로: 화면 활성/비활성, 작성 화면, 적용 후) ──
  let lastTick = Date.now(), active = !document.hidden && document.hasFocus();
  function tick() {
    const t = Date.now();
    if (state && state.stage === 'task' && !(state.behavior && state.behavior.completed)) {
      const dt = Math.max(0, t - lastTick), c = state.clock, b = state.behavior;
      c[active ? 'activeMs' : 'inactiveMs'] += dt;
      if (b && b.stage === 'write') c[active ? 'writingActiveMs' : 'writingInactiveMs'] += dt;
      if (b && b.appliedText != null) c[active ? 'afterApplyActiveMs' : 'afterApplyInactiveMs'] += dt;
    }
    lastTick = t; if (state) state.lastSeen = t;
  }
  function visibility() {
    setTimeout(() => {
      if (!state || blocked) return;
      tick();
      const next = !document.hidden && document.hasFocus();
      if (next !== active) { active = next; logEvent(active ? 'browser_active' : 'browser_inactive', { reason: document.hidden ? 'hidden' : 'focus', stage: state.stage }); }
    }, 0);
  }
  document.addEventListener('visibilitychange', visibility); window.addEventListener('focus', visibility); window.addEventListener('blur', visibility);

  // ── 한 번에 한 탭만 진행 ─────────────────────────────────────
  const inst = uuid(); let blocked = false;
  function takeLease() {
    try {
      const old = JSON.parse(localStorage.getItem(LEASE) || 'null');
      if (old && old.owner !== inst && Date.now() - old.time < 12000) return false;
      localStorage.setItem(LEASE, JSON.stringify({ owner: inst, time: Date.now() }));
    } catch (e) { }
    return true;
  }
  function stimFrame() { return document.getElementById('stimFrame'); }
  function checkpointStim() { try { const f = stimFrame(); if (f && f.contentWindow.study2) f.contentWindow.study2.checkpoint(); } catch (e) { } }
  setInterval(() => {
    if (!state || blocked) return;
    if (!takeLease()) { blocked = true; app.replaceChildren(h('div', { class: 'card' }, h('p', { text: U.otherTab }))); return; }
    tick(); if (state.stage === 'task') checkpointStim(); persist();
    if (state.evQueue.length) flushEvents();
  }, 3000);
  window.addEventListener('pagehide', () => {
    if (!state || blocked) return;
    tick(); if (state.stage === 'task') checkpointStim(); persist(); flushEvents({ keepalive: true });
    try { const l = JSON.parse(localStorage.getItem(LEASE) || 'null'); if (l && l.owner === inst) localStorage.removeItem(LEASE); } catch (e) { }
  });

  // ── 시작 / 이어 가기 ─────────────────────────────────────────
  function newState(srv) {
    return { v: 1, participantId: srv.participant_id, token: srv.token, mode: MODE, stage: 'intro', status: 'started', condition: null, aiOutput: null,
      answers: {}, draft: {}, behavior: null, clock: blankClock(), evSeq: 0, evQueue: [], innerSent: 0, taskSaved: false, startedAt: Date.now(), lastSeen: Date.now() };
  }
  function closedStage(status) { return status === 'completed' ? 'end' : status === 'screened_out' ? 'exit_sq' : status === 'declined' ? 'exit_consent' : null; }
  function adoptServer(srv) { // 브라우저 보관분이 없을 때(같은 Prolific ID로 재접속) 서버 기록으로 복원
    state.status = srv.status; state.condition = srv.condition || null; state.aiOutput = srv.ai_output || null;
    state.answers = srv.answers || {}; state.evSeq = srv.max_seq || 0;
    const snap = srv.task_snapshot;
    if (snap) { state.behavior = snap.behavior || null; state.clock = Object.assign(blankClock(), snap.clock); state.innerSent = (snap.behavior && snap.behavior.events || []).length; }
    state.taskSaved = srv.status === 'in_survey' || srv.status === 'completed';
    state.stage = closedStage(srv.status) || (STAGES.includes(srv.stage) ? srv.stage : 'intro');
    if (state.stage === 'task_intro' && state.behavior) state.stage = 'task';
  }
  async function boot() {
    if (qs.get('reset') === '1') { clearLocal(); try { localStorage.removeItem(LEASE); } catch (e) { } }
    if (!takeLease()) { app.replaceChildren(h('div', { class: 'card' }, h('p', { text: U.otherTab }))); setTimeout(boot, 2000); return; }
    let resumed = false;
    try { const local = JSON.parse(localStorage.getItem(KEY) || 'null'); if (local && local.v === 1 && local.participantId) { state = local; resumed = true; } } catch (e) { }
    if (state && !PREVIEW) {
      try {
        const srv = await rpc('resume_session', {});
        const closed = closedStage(srv.status);
        if (closed) { state.status = srv.status; state.stage = closed; }
      } catch (e) { if (/invalid session/.test(e.message)) { state = null; resumed = false; clearLocal(); } }
    }
    if (!state) {
      try {
        const srv = await rpc('start_session', {
          mode: MODE, lang: CFG.LANG || 'ko', prolific_pid: PID, study_id: qs.get('STUDY_ID') || '', session_id: qs.get('SESSION_ID') || '',
          stimulus_version: window.STIMULUS_VERSION, survey_version: S.version,
          client: { ua: navigator.userAgent, w: innerWidth, h: innerHeight, sw: screen.width, sh: screen.height, lang: navigator.language, tz: new Date().getTimezoneOffset() }
        });
        state = newState(srv);
        if (srv.resumed) { adoptServer(srv); resumed = true; }
        persist();
      } catch (e) {
        app.replaceChildren(h('div', { class: 'card' }, h('h2', { text: U.startFailed }), h('p', { text: U.startFailedHint }), h('p', { class: 'q-note', text: '(' + e.message + ')' })));
        return;
      }
    }
    if (resumed && !closedStage(state.status)) {
      if (state.stage === 'task' && !(state.behavior && state.behavior.completed)) state.clock.offlineMs += Math.max(0, Date.now() - (state.lastSeen || Date.now()));
      logEvent('page_resumed', { stage: state.stage });
    }
    lastTick = Date.now();
    render();
  }

  // ── 화면 공통 ────────────────────────────────────────────────
  function render() {
    window.scrollTo(0, 0);
    pageEnteredAt = Date.now();
    app.className = 'shell' + (state.stage === 'task' ? ' wide' : '');
    app.dataset.stage = state.stage;
    app.replaceChildren();
    if (PREVIEW || TEST) app.append(h('div', { class: 'banner', text: (PREVIEW ? U.bannerPreview : U.bannerTest) + (state.condition ? U.condition(state.condition) : '') }));
    const idx = STAGES.indexOf(state.stage);
    if (idx > 0 && idx < STAGES.length - 1) app.append(h('div', { class: 'progress', role: 'progressbar', 'aria-label': U.progress, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(idx / (STAGES.length - 1) * 100) }, h('b', { style: 'width:' + (idx / (STAGES.length - 1) * 100) + '%' })));
    const view = VIEWS[state.stage] || (/^sq\d+$/.test(state.stage) ? viewScreening : /^s\d+$/.test(state.stage) ? viewLikert : viewQuestions);
    view();
  }
  function nextOf(stage) { return STAGES[STAGES.indexOf(stage) + 1]; }
  function actions(label, onNext) {
    const msg = h('p', { class: 'msg', role: 'status' });
    const btn = h('button', { class: 'btn', type: 'button', id: 'nextBtn', text: label, onclick: () => onNext() });
    const el = h('div', { class: 'actions' }, msg, btn);
    return { el, btn, say(text, cls) { msg.className = 'msg' + (cls ? ' ' + cls : ''); msg.textContent = text || ''; }, busy(on) { btn.disabled = on; btn.textContent = on ? U.saving : label; } };
  }
  async function submit(page, items, next, bar, after) {
    bar.busy(true); bar.say('');
    try {
      await rpc('save_responses', { page, items, next_stage: next });
      items.forEach(i => { state.answers[i.code] = i.value; });
      if (after) await after();
      logEvent('page_submitted', { page, durationMs: Date.now() - pageEnteredAt });
      state.draft = {}; if (STAGES.includes(next) || /^exit_/.test(next)) state.stage = next;
      persist(); render();
    } catch (e) { console.error(e); bar.busy(false); bar.say(U.saveFailed, 'bad'); }
  }
  function setDraft(code, value) { state.draft = state.draft || {}; state.draft[code] = value; persist(); }
  const draftOf = code => (state.draft || {})[code];

  // 선택형 문항 카드 (단일 선택)
  function singleCard(q) {
    const name = 'q_' + q.code;
    const card = h('div', { class: 'card q', 'data-code': q.code },
      h('p', { class: 'q-text' }, q.text, h('span', { class: 'q-hint', text: '[' + (q.hint || U.selectOne) + ']' })),
      q.options.map((o, i) => h('label', { class: 'opt' },
        h('input', { type: 'radio', name, id: name + '_' + (i + 1), value: String(i + 1), checked: draftOf(q.code) === String(i + 1), onchange: () => { card.classList.remove('missing'); setDraft(q.code, String(i + 1)); } }),
        h('span', { text: o }))),
      q.note ? h('p', { class: 'q-note', text: q.note }) : null);
    card.read = () => { const c = card.querySelector('input:checked'); return c ? [{ code: q.code, value: c.value }] : null; };
    return card;
  }
  function guideNodes(withScenario = true) {
    const T = S.taskIntro;
    return [withScenario && h('div', { class: 'scenario' }, T.scenarioHeading ? h('p', { class: 'section-title', text: T.scenarioHeading }) : null, paras(T.scenario)),
      h('div', { class: 'guide', style: 'margin-top:18px' }, h('h2', { text: T.guideHeading }), h('ol', null, T.guideSteps.map(t => h('li', { text: t }))), h('p', { class: 'notes' }, T.guideNotes.map((t, i) => [i ? h('br') : null, t])))];
  }

  // ── 각 화면 ──────────────────────────────────────────────────
  const VIEWS = {
    intro() {
      const bar = actions(U.start, () => submit('intro', [], nextOf('intro'), bar));
      app.append(h('div', { class: 'card head' }, h('h1', { text: S.title }), paras(S.intro.map(t => t.replace('{reward}', CFG.REWARD || '[amount]'))), h('p', { class: 'contact', text: S.contact })), bar.el);
    },

    consent() {
      const C = S.consent, q = { code: 'CONSENT', text: C.question, options: C.options };
      const card = singleCard(q);
      const bar = actions(U.next, async () => {
        const v = card.read(); if (!v) { card.classList.add('missing'); bar.say(U.missingOne, 'bad'); return; }
        if (v[0].value === '2') {
          await submit('consent', v, 'exit_consent', bar, async () => { await rpc('end_session', { status: 'declined', reason: 'CONSENT' }); state.status = 'declined'; });
          return;
        }
        await submit('consent', v, 'task_intro', bar, async () => {
          const r = await rpc('give_consent', { force_condition: FORCE >= 1 && FORCE <= 4 ? FORCE : null });
          if (!r || !r.condition || !r.ai_output) throw new Error('condition not assigned');
          state.condition = r.condition; state.aiOutput = r.ai_output; state.status = 'in_task';
        });
      });
      app.append(h('div', { class: 'card' }, h('h2', { text: C.heading }), paras(C.body)), card, bar.el);
    },

    task_intro() {
      const T = S.taskIntro;
      const bar = actions(U.start, () => {
        logEvent('page_submitted', { page: 'task_intro', durationMs: Date.now() - pageEnteredAt });
        state.stage = 'task'; persist(); render();
        rpc('save_responses', { page: 'task_intro', items: [], next_stage: 'task' }).catch(() => { });
      });
      app.append(h('div', { class: 'card' }, h('p', { class: 'section-title', text: T.heading }), paras(T.lead), guideNodes(false)), bar.el);
    },

    task() {
      const text = h('p', { role: 'status' });
      const retry = h('button', { class: 'btn secondary', type: 'button', hidden: true, text: U.retry, onclick: () => finalizeTask() });
      const next = h('button', { class: 'btn', type: 'button', id: 'nextBtn', hidden: true, text: U.next, onclick: () => { state.stage = 'aq1'; persist(); render(); } });
      const bar = h('div', { class: 'task-next', id: 'taskNext', hidden: true }, text, retry, next);
      let saveTimer = 0, finalizing = false;

      function taskData() {
        const b = state.behavior || {}, c = state.clock, ev = b.events || [], es = b.editSummary;
        const count = t => ev.filter(e => e.type === t).length, iso = ms => ms ? new Date(ms).toISOString() : null, ok = es && es.available;
        return {
          initial_text: b.initialText == null ? null : b.initialText, applied_text: b.appliedText == null ? null : b.appliedText, final_text: b.completed ? b.text : null,
          writing_entered_at: iso(b.writingEnteredAt), ai_shown_at: b.firstSuggestionAt || null, applied_at: b.firstAppliedAt || null, client_completed_at: iso(b.completedAt),
          total_task_elapsed_ms: b.totalTaskElapsedMs == null ? null : b.totalTaskElapsedMs, after_apply_elapsed_ms: b.afterApplyElapsedMs == null ? null : b.afterApplyElapsedMs,
          active_ms: Math.round(c.activeMs), inactive_ms: Math.round(c.inactiveMs), writing_active_ms: Math.round(c.writingActiveMs), writing_inactive_ms: Math.round(c.writingInactiveMs),
          after_apply_active_ms: Math.round(c.afterApplyActiveMs), after_apply_inactive_ms: Math.round(c.afterApplyInactiveMs), offline_ms: Math.round(c.offlineMs),
          edit_inserted: ok ? es.inserted : null, edit_deleted: ok ? es.deleted : null, edit_replaced: ok ? es.replaced : null, edit_distance: ok ? es.distance : null,
          manual_edit_events: b.editEvents == null ? null : b.editEvents, edits_after_apply: b.editsAfterApply == null ? null : b.editsAfterApply,
          ai_view_count: count('ai_suggestion_shown') + count('ai_suggestion_reopened'), prior_email_reopen_count: count('prior_emails_reopened'),
          original_view_count: count('original_view_opened'), paste_count: count('paste'),
          snapshot: { behavior: b, clock: c }
        };
      }
      async function finalizeTask() {
        if (finalizing) return; finalizing = true; clearTimeout(saveTimer);
        bar.hidden = false; retry.hidden = true; next.hidden = true; text.textContent = U.taskSaving;
        try {
          await flushEvents();
          await rpc('save_task', { data: taskData(), final: true });
          state.taskSaved = true; state.status = 'in_survey'; persist();
          text.textContent = U.taskDone; next.hidden = false;
          bar.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); next.focus({ preventScroll: true });
        } catch (e) { console.error(e); text.textContent = U.taskSaveFailed; retry.hidden = false; }
        finalizing = false;
      }
      // 자극물 화면이 부르는 연결 통로 (원본 자극물의 study2Bridge와 같은 이름·형식)
      window.study2Bridge = {
        restore: () => state.behavior ? JSON.parse(JSON.stringify(state.behavior)) : null,
        clock: () => JSON.parse(JSON.stringify(state.clock)),
        save: (i, data) => {
          if (!state || blocked || state.stage !== 'task') return;
          tick();
          data = JSON.parse(JSON.stringify(data));
          state.behavior = Object.assign(data, { revision: ((state.behavior && state.behavior.revision) || 0) + 1 });
          const evs = data.events || [];
          for (let k = state.innerSent; k < evs.length; k++) {
            const e = Object.assign({}, evs[k]), type = e.type, time = e.time; delete e.type; delete e.time;
            e.taskElapsedMs = e.elapsedMs; delete e.elapsedMs;
            logEvent(type, e, time);
          }
          state.innerSent = evs.length; persist();
          if (data.completed) { if (!state.taskSaved) finalizeTask(); }
          else { clearTimeout(saveTimer); saveTimer = setTimeout(() => { if (!finalizing && state.stage === 'task') rpc('save_task', { data: taskData(), final: false }).catch(() => { }); }, 4000); }
        }
      };
      const frame = h('iframe', { id: 'stimFrame', title: U.taskFrameTitle });
      frame.addEventListener('load', () => { try { frame.contentWindow.postMessage('activate-demo', '*'); } catch (e) { } });
      frame.srcdoc = window.STIMULUS_TEMPLATE.replace('__CONDITION__', () => String(state.condition - 1)).replace('__AI_OUTPUT__', () => JSON.stringify(state.aiOutput).replace(/</g, '\\u003c'));
      app.append(frame, bar);
      if (state.behavior && state.behavior.completed) { if (state.taskSaved) { bar.hidden = false; text.textContent = U.taskDone; next.hidden = false; } else finalizeTask(); }
    },

    aq1() {
      const A = S.aq1, card = singleCard(A);
      const again = h('details', { class: 'again', ontoggle: e => { if (e.target.open) logEvent('task_guide_reopened', { page: 'aq1' }); } }, h('summary', { text: U.guideAgain }), h('div', { class: 'inner' }, guideNodes()));
      const bar = actions(U.next, () => { const v = card.read(); if (!v) { card.classList.add('missing'); bar.say(U.missingOne, 'bad'); return; } submit('aq1', v, nextOf('aq1'), bar); });
      app.append(again, h('div', { class: 'lead' }, h('p', { text: A.lead })), card, bar.el);
    },

    end() {
      const E = S.end, box = h('div', { class: 'card head' });
      app.append(box);
      const done = () => {
        finalRecord = finalRecord || JSON.parse(JSON.stringify(state)); delete finalRecord.token;
        closeLocal();
        box.replaceChildren(h('h1', { text: E.heading }), h('p', { text: E.body }));
        if (CFG.PROLIFIC_COMPLETE_URL && !TEST && !PREVIEW) {
          box.append(h('p', null, h('a', { class: 'btn', href: CFG.PROLIFIC_COMPLETE_URL, text: U.toProlific, style: 'display:inline-block;text-decoration:none' })));
          setTimeout(() => { location.href = CFG.PROLIFIC_COMPLETE_URL; }, 3000);
        } else box.append(h('p', { class: 'q-note', text: U.closeOk }));
        if (PREVIEW || TEST) box.append(h('p', null, h('button', { class: 'btn secondary', type: 'button', text: U.download, onclick: () => {
          const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(finalRecord, null, 2)], { type: 'application/json' })), download: 'study2-record.json' }); document.body.append(a); a.click(); a.remove(); } })));
      };
      const finish = async () => {
        box.replaceChildren(h('p', { text: U.finishing }));
        try { await flushEvents(); await rpc('complete_session', {}); state.status = 'completed'; done(); }
        catch (e) { console.error(e); box.replaceChildren(h('p', { class: 'msg bad', text: U.saveFailed }), h('button', { class: 'btn', type: 'button', text: U.retry, onclick: finish })); }
      };
      if (state.status === 'completed') done(); else finish();
    },

    exit_sq() { exitView(S.exit.screened, CFG.PROLIFIC_SCREENOUT_URL); },
    exit_consent() { exitView(S.exit.declined, CFG.PROLIFIC_NOCONSENT_URL); }
  };
  function exitView(T, url) {
    flushEvents(); closeLocal();
    const box = h('div', { class: 'card head' }, h('h1', { text: T.heading }), h('p', { text: T.body }));
    if (url && !TEST && !PREVIEW) box.append(h('p', null, h('a', { class: 'btn', href: url, text: U.toProlific, style: 'display:inline-block;text-decoration:none' })));
    app.append(box);
  }

  // 스크리닝: 한 화면에 한 문항. 해당 응답을 고르면 바로 종료
  function viewScreening() {
    const q = S.screening[parseInt(state.stage.slice(2), 10) - 1], card = singleCard(q);
    const bar = actions(U.next, async () => {
      const v = card.read(); if (!v) { card.classList.add('missing'); bar.say(U.missingOne, 'bad'); return; }
      if (v[0].value === q.exitOn) await submit(state.stage, v, 'exit_sq', bar, async () => { await rpc('end_session', { status: 'screened_out', reason: q.code }); state.status = 'screened_out'; });
      else await submit(state.stage, v, nextOf(state.stage), bar);
    });
    app.append(card, bar.el);
  }

  // 7점 척도 화면
  function viewLikert() {
    const L = S.likert, pi = parseInt(state.stage.slice(1), 10) - 1, blocks = LIKERT[pi];
    let order = LIKERT.slice(0, pi).reduce((n, pg) => n + pg.reduce((m, b) => m + b.items.length, 0), 0);
    const head = h('div', { class: 'lk-row lk-head', 'aria-hidden': 'true' }, h('span'), h('div', { class: 'lk-opts' }, L.scale.map((s, i) => h('span', { text: '①②③④⑤⑥⑦'[i] }))));
    const grid = h('div', { class: 'lk' }, head), rows = [];
    blocks.forEach((b, bi) => { if (b.lead) grid.append(h('div', { class: 'lk-row lk-lead' + (bi > 0 ? ' block-start' : '') }, h('span', { text: b.lead }))); b.items.forEach((text, ii) => {
      const code = b.single ? b.block : b.block + (ii + 1), name = 'q_' + code, ord = ++order;
      const row = h('div', { class: 'lk-row' + (ii === 0 && bi > 0 && !b.lead ? ' block-start' : ''), role: 'radiogroup', 'aria-label': text },
        h('span', { class: 'lk-text', text }),
        h('div', { class: 'lk-opts' }, L.scale.map((s, i) => h('label', { title: s },
          h('input', { type: 'radio', name, id: name + '_' + (i + 1), value: String(i + 1), 'aria-label': (i + 1) + ' ' + s, checked: draftOf(code) === String(i + 1), onchange: () => { row.classList.remove('missing'); setDraft(code, String(i + 1)); } }),
          h('i', { text: String(i + 1) })))));
      row.read = () => { const c = row.querySelector('input:checked'); return c ? { code, value: c.value, order: ord } : null; };
      rows.push(row); grid.append(row);
    }); });
    const bar = actions(U.next, () => {
      const items = [], missing = [];
      rows.forEach(r => { const v = r.read(); r.classList.toggle('missing', !v); if (v) items.push(v); else missing.push(r); });
      if (missing.length) { bar.say(U.missing(missing.length), 'bad'); missing[0].scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
      submit(state.stage, items, nextOf(state.stage), bar);
    });
    app.append(h('div', { class: 'lead' }, h('p', { class: 'section-title', text: L.heading }), pi === 0 ? paras(L.lead) : null),
      h('p', { class: 'scale-key', text: L.scale.map((s, i) => '①②③④⑤⑥⑦'[i] + ' ' + s).join('  ') }), grid, bar.el);
  }

  // 일반 문항 화면 (조작점검 · 이용 행태 · 인구통계 · 예비조사 의견)
  function viewQuestions() {
    const D = S[state.stage], cards = [];
    D.questions.forEach(q => {
      let card;
      if (q.type === 'single') card = singleCard(q);
      else if (q.type === 'scale') card = singleCard(Object.assign({}, q, { options: S.likert.scale }));
      else if (q.type === 'multi') {
        const saved = (draftOf(q.code) || '').split('|').filter(Boolean);
        const other = h('input', { type: 'text', class: 'other', id: 'q_' + q.otherCode, 'aria-label': U.otherLabel, value: draftOf(q.otherCode) || '', oninput: e => setDraft(q.otherCode, e.target.value) });
        const boxes = q.options.map((o, i) => h('input', { type: 'checkbox', id: 'q_' + q.code + '_' + (i + 1), value: String(i + 1), checked: saved.includes(String(i + 1)), onchange: () => { card.classList.remove('missing'); setDraft(q.code, boxes.filter(b => b.checked).map(b => b.value).join('|')); } }));
        card = h('div', { class: 'card q', 'data-code': q.code }, h('p', { class: 'q-text' }, q.text, h('span', { class: 'q-hint', text: '[' + q.hint + ']' })),
          q.options.map((o, i) => h('label', { class: 'opt' }, boxes[i], h('span', null, o, i + 1 === q.otherIndex ? other : null))));
        other.addEventListener('focus', () => { const b = boxes[q.otherIndex - 1]; if (!b.checked) { b.checked = true; b.dispatchEvent(new Event('change')); } });
        card.read = () => { const sel = boxes.filter(b => b.checked).map(b => b.value); if (!sel.length) return null; const out = [{ code: q.code, value: sel.join('|') }]; if (sel.includes(String(q.otherIndex))) out.push({ code: q.otherCode, value: other.value.trim() }); return out; };
      } else if (q.type === 'number') {
        // 칸 바로 아래에 오류 문구를 보여 준다 (문자·범위 밖 값 모두 여기서 안내)
        const err = h('p', { class: 'field-error', id: 'err_' + q.code, role: 'alert', hidden: true });
        const input = h('input', { type: 'text', id: 'q_' + q.code, inputmode: 'numeric', autocomplete: 'off', maxlength: 3, 'aria-describedby': 'err_' + q.code, value: draftOf(q.code) || '',
          oninput: e => { card.classList.remove('missing'); err.hidden = true; input.removeAttribute('aria-invalid'); setDraft(q.code, e.target.value); } });
        card = h('div', { class: 'card q', 'data-code': q.code }, h('label', { class: 'q-text', for: 'q_' + q.code, text: q.text }), h('div', { class: 'num-row' }, input, h('span', { text: q.unit || '' })), err);
        card.read = () => {
          const v = input.value.trim();
          const msg = v === '' ? U.ageEmpty : !/^[0-9]+$/.test(v) ? U.ageDigits : (+v < q.min || +v > q.max) ? U.ageRange(q.min, q.max) : '';
          err.textContent = msg; err.hidden = !msg; if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
          return msg ? null : [{ code: q.code, value: String(+v) }];
        };
        card.inline = true;
      } else {
        const ta = h('textarea', { class: 'free', id: 'q_' + q.code, maxlength: 3000, oninput: e => setDraft(q.code, e.target.value) }); ta.value = draftOf(q.code) || '';
        card = h('div', { class: 'card q', 'data-code': q.code }, h('label', { class: 'q-text', for: 'q_' + q.code }, q.text, q.hint ? h('span', { class: 'q-hint', text: '[' + q.hint + ']' }) : null), ta);
        card.read = () => (ta.value.trim() || q.optional) ? [{ code: q.code, value: ta.value.trim() }] : null;
      }
      cards.push(card);
    });
    const bar = actions(U.next, () => {
      const items = [], missing = [];
      cards.forEach(c => { const v = c.read(); c.classList.toggle('missing', !v); if (v) items.push(...v); else missing.push(c); });
      if (missing.length) { const others = missing.filter(c => !c.inline).length; bar.say(others ? U.missing(others) : '', 'bad'); missing[0].scrollIntoView({ block: 'center', behavior: 'smooth' }); const f = missing[0].querySelector('input[type=text]'); if (f && missing[0].inline) f.focus({ preventScroll: true }); return; }
      submit(state.stage, items, nextOf(state.stage), bar);
    });
    if (D.heading || D.lead) app.append(h('div', { class: 'lead' }, D.heading ? h('p', { class: 'section-title', text: D.heading }) : null, D.lead ? h('p', { text: D.lead }) : null));
    app.append(...cards, bar.el);
  }

  // 자극물 화면에서 오는 신호: 높이 맞추기, 단계가 바뀌면 화면 맨 위로
  window.addEventListener('message', e => {
    const f = stimFrame(); if (!f || e.source !== f.contentWindow || !e.data) return;
    if (e.data.type === 'demo-height') { const v = e.data.height; if (Number.isFinite(v) && v > 0 && v < 30000) f.style.height = (v + 8) + 'px'; }
    else if (e.data.type === 'stage-changed') f.scrollIntoView({ block: 'start', behavior: 'instant' });
  });

  boot();
})();
