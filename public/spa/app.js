(() => {
  const STORAGE_KEY = "lunch-grouping:v1";
  const SEEDED_DEFAULTS_KEY = "lunch-grouping:seeded-defaults:v5";

  const DEFAULT_MEMBER_NAMES = [
    { name: "松澤", email: "matsuzawa@yadokari.tv" },
    { name: "荒木", email: "araki@yadokari.tv" },
    { name: "福森", email: "fukumori@yadokari.tv" },
    { name: "のり", email: "noriko-matsuzawa@yadokari.tv" },
    { name: "関根", email: "sekine@yadokari.tv" },
    { name: "中小路", email: "nakakoji@yadokari.tv" },
    { name: "村山", email: "murayama@yadokari.tv" },
    { name: "フエン", email: "huyendt@yadokari.tv" },
    { name: "渡辺", email: "k-watanabe@yadokari.tv" },
    { name: "村上", email: "yasuhiro-murakami@yadokari.tv" },
    { name: "織田", email: "orita@yadokari.tv" },
    { name: "知元", email: "kazuyuki-chimoto@yadokari.tv" },
    { name: "小永井", email: "konagai@yadokari.tv" },
    { name: "木村", email: "yuki-kimura@yadokari.tv" },
    { name: "千本", email: "takeshi-chimoto@yadokari.tv" },
    { name: "ミン", email: "minhNH@yadokari.tv" },
    { name: "小山", email: "eiji-koyama@yadokari.tv" },
    { name: "中山", email: "yuki-nakayama@yadokari.tv" },
    { name: "五藤", email: "yoko-goto@yadokari.tv" },
    { name: "三瓶", email: "tomonori-sampei@yadokari.tv" },
    { name: "粕谷", email: "motoi-kasuya@yadokari.tv" },
    { name: "中島", email: "shogo-nakajima@yadokari.tv" },
    { name: "菅原", email: "miki-sugahara@yadokari.tv" },
    { name: "吉井", email: "daichi-yoshii@yadokari.tv" },
    { name: "青山", email: "shoki-aoyama@yadokari.tv" },
    { name: "加藤", email: "aya-kato@yadokari.tv" },
    { name: "ド", email: "do-hyeonwoo@yadokari.tv" },
    { name: "吉田（や）", email: "kengo-yoshida@yadokari.tv" },
    { name: "土岐", email: "haruhisa-toki@yadokari.tv" },
    { name: "竹中", email: "aoi-takenaka@yadokari.tv" },
    { name: "五十嵐", email: "asahi-igarashi@yadokari.tv" },
    { name: "井口", email: "" },
    { name: "吉田（ネ）", email: "" },
    { name: "間藤", email: "" },
    { name: "西", email: "" },
    { name: "大堀", email: "" },
    { name: "大竹", email: "" },
  ];

  const DEFAULT_PARENT_NAMES = ["松澤", "福森", "間藤", "吉田（ネ）"];

  const appRoot = document.getElementById("app");

  function nowIso() {
    return new Date().toISOString();
  }

  function uuid() {
    if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }

  function clampInt(value, min, max, fallback) {
    const n = Number.parseInt(String(value), 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  function byName(a, b) {
    return a.name.localeCompare(b.name, "ja");
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else if (v === false || v === null || v === undefined) continue;
      else node.setAttribute(k, String(v));
    }
    for (const child of Array.isArray(children) ? children : [children]) {
      if (child === null || child === undefined) continue;
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    }
    return node;
  }

  function isValidEmail(email) {
    if (typeof email !== "string") return false;
    const v = email.trim();
    if (!v) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  async function postJson(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify(body ?? {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = String(data?.error || data?.message || `HTTP ${res.status}`);
      const details = data?.details ? `\n\n${JSON.stringify(data.details)}` : "";
      throw new Error(`${msg}${details}`);
    }
    return data;
  }

  async function createCalendarTestEvent(otherEmail) {
    return postJson("/api/calendar/test", { otherEmail });
  }

  async function createCalendarEvents(events) {
    return postJson("/api/calendar/events", { events });
  }

  function readState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefaultState();
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") throw new Error("invalid");
      return {
        version: 1,
        members: Array.isArray(parsed.members) ? parsed.members : [],
        exclusions: Array.isArray(parsed.exclusions) ? parsed.exclusions : [],
        runs: Array.isArray(parsed.runs) ? parsed.runs : [],
      };
    } catch {
      return buildDefaultState();
    }
  }

  function writeState(next) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  let state = readState();

  function setState(updater) {
    const next = typeof updater === "function" ? updater(structuredClone(state)) : updater;
    state = next;
    writeState(state);
    render();
  }

  function buildDefaultState() {
    const base = { version: 1, members: [], exclusions: [], runs: [] };
    addMembersByNames(base, DEFAULT_MEMBER_NAMES, DEFAULT_PARENT_NAMES);
    return base;
  }

  function addMembersByNames(draft, names, parentNames = []) {
    const parentSet = new Set(parentNames.map((x) => String(x || "").trim()).filter(Boolean));
    const byNameMap = new Map(draft.members.map((m) => [String(m.name || "").trim(), m]).filter(([k]) => !!k));
    const ts = nowIso();
    for (const raw of names) {
      const name = typeof raw === "string" ? String(raw || "").trim() : String(raw?.name || "").trim();
      const email = typeof raw === "object" && raw ? String(raw.email || "").trim() : "";
      if (!name) continue;
      const existing = byNameMap.get(name) || null;
      if (existing) {
        if (parentSet.has(name) && !existing.isParent) {
          existing.isParent = true;
          existing.updatedAt = ts;
        }
        if (email && !existing.email) {
          existing.email = email;
          existing.updatedAt = ts;
        }
        continue;
      }
      const isParent = parentSet.has(name);
      const member = { id: uuid(), name, email, isActive: true, isParent, createdAt: ts, updatedAt: ts };
      draft.members.push(member);
      byNameMap.set(name, member);
    }
  }

  function ensureDefaultParents(draft) {
    const parentSet = new Set(DEFAULT_PARENT_NAMES.map((x) => String(x || "").trim()).filter(Boolean));
    const ts = nowIso();
    for (const m of draft.members) {
      const name = String(m.name || "").trim();
      if (!name) continue;
      if (!parentSet.has(name)) continue;
      if (!m.isParent) {
        m.isParent = true;
        m.updatedAt = ts;
      }
    }
  }

  function ensureDefaultEmails(draft) {
    const ts = nowIso();
    const emailMap = new Map(
      DEFAULT_MEMBER_NAMES.map((x) => [String(x?.name || "").trim(), String(x?.email || "").trim()]).filter(([n, e]) => n && e)
    );
    for (const m of draft.members) {
      const name = String(m.name || "").trim();
      if (!name) continue;
      if (m.email) continue;
      const email = emailMap.get(name);
      if (!email) continue;
      m.email = email;
      m.updatedAt = ts;
    }
  }

  if (localStorage.getItem(SEEDED_DEFAULTS_KEY) !== "1") {
    ensureDefaultParents(state);
    ensureDefaultEmails(state);
    writeState(state);
    localStorage.setItem(SEEDED_DEFAULTS_KEY, "1");
  }

  function findMember(memberId) {
    return state.members.find((m) => m.id === memberId) || null;
  }

  function memberEmail(memberId) {
    const m = findMember(memberId);
    return String(m?.email || "").trim();
  }

  function activeMembers() {
    return state.members.filter((m) => m.isActive);
  }

  function activeParents() {
    return state.members.filter((m) => m.isActive && m.isParent);
  }

  function normalizePair(aId, bId) {
    return aId < bId ? [aId, bId] : [bId, aId];
  }

  function pairKey(aId, bId) {
    const [a, b] = normalizePair(aId, bId);
    return `${a}|${b}`;
  }

  function buildExclusionSet() {
    const s = new Set();
    for (const p of state.exclusions) {
      if (!p || !p.memberAId || !p.memberBId) continue;
      s.add(pairKey(p.memberAId, p.memberBId));
    }
    return s;
  }

  function runsSortedDesc(runs) {
    return [...runs].sort((a, b) => {
      const ad = String(a.runDate || "");
      const bd = String(b.runDate || "");
      if (ad !== bd) return bd.localeCompare(ad);
      const ac = String(a.confirmedAt || a.createdAt || "");
      const bc = String(b.confirmedAt || b.createdAt || "");
      return bc.localeCompare(ac);
    });
  }

  function buildHistoryPairWeights(historyWindow) {
    const confirmed = runsSortedDesc(state.runs.filter((r) => r.status === "confirmed")).slice(0, historyWindow);
    const weights = new Map();
    for (let i = 0; i < confirmed.length; i++) {
      const weight = historyWindow - i;
      const run = confirmed[i];
      for (const g of run.groups || []) {
        const ids = (g.members || []).map((x) => x.memberId);
        for (let a = 0; a < ids.length; a++) {
          for (let b = a + 1; b < ids.length; b++) {
            const k = pairKey(ids[a], ids[b]);
            weights.set(k, (weights.get(k) || 0) + weight);
          }
        }
      }
    }
    return weights;
  }

  function hashToUint32(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffleInPlace(arr, rnd) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function groupsForDisplay(groups) {
    const list = [...(groups || [])];
    list.sort((a, b) => {
      const aName = findMember(a.parentMemberId)?.name || "";
      const bName = findMember(b.parentMemberId)?.name || "";
      const byParent = aName.localeCompare(bName, "ja");
      if (byParent !== 0) return byParent;
      const byParentId = String(a.parentMemberId).localeCompare(String(b.parentMemberId));
      if (byParentId !== 0) return byParentId;
      return (a.groupNo || 0) - (b.groupNo || 0);
    });
    return list;
  }

  function groupStats(groups) {
    const sizes = (groups || []).map((g) => (g.members || []).length);
    const counts = sizes.reduce((acc, s) => ((acc[String(s)] = (acc[String(s)] || 0) + 1), acc), {});
    const occurrences = new Map();
    for (const g of groups || []) {
      for (const m of g.members || []) {
        if (m.role === "parent") continue;
        occurrences.set(m.memberId, (occurrences.get(m.memberId) || 0) + 1);
      }
    }
    const duplicated = [...occurrences.entries()].filter(([, c]) => c > 1).map(([id, c]) => ({ id, c }));
    return { sizeCounts: counts, duplicated };
  }

  function canJoinGroup(memberId, group, exclusionSet) {
    for (const m of group.members) {
      if (m.memberId === memberId) return false;
      if (exclusionSet.has(pairKey(memberId, m.memberId))) return false;
    }
    return true;
  }

  function incrementalPairScore(memberId, group, historyWeights) {
    let s = 0;
    for (const m of group.members) {
      s += historyWeights.get(pairKey(memberId, m.memberId)) || 0;
    }
    return s;
  }

  function pickBestMemberForGroup(remainingIds, group, exclusionSet, historyWeights, rnd) {
    let best = null;
    let bestScore = Infinity;
    for (const id of remainingIds) {
      if (!canJoinGroup(id, group, exclusionSet)) continue;
      const score = incrementalPairScore(id, group, historyWeights);
      if (score < bestScore) {
        bestScore = score;
        best = id;
      } else if (score === bestScore && rnd() < 0.25) {
        best = id;
      }
    }
    return best;
  }

  function toYmd(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function currentYm() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function formatMonthLabel(ym) {
    const [y, m] = String(ym || "").split("-");
    if (!y || !m) return String(ym || "");
    return `${y}年${Number.parseInt(m, 10)}月`;
  }

  function formatMdLabel(ymd) {
    const [y, m, d] = String(ymd || "").split("-");
    if (!y || !m || !d) return String(ymd || "");
    return `${Number.parseInt(m, 10)}/${Number.parseInt(d, 10)}`;
  }

  function mondaysInMonth(ym) {
    const [yStr, mStr] = String(ym || "").split("-");
    const y = Number.parseInt(yStr, 10);
    const m = Number.parseInt(mStr, 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return [];
    const first = new Date(y, m - 1, 1);
    const out = [];
    for (let d = new Date(first); d.getMonth() === m - 1; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 1) out.push(toYmd(d));
    }
    return out;
  }

  function generateMonthlyPlan({ month, historyWindow, seed }) {
    const active = activeMembers();
    const parents = activeParents().sort(byName);
    if (parents.length === 0) throw new Error("親（責任者）が0人です。社員画面で親フラグをONにしてください。");

    const parentIds = parents.map((p) => p.id);
    const nonParentIds = active.filter((m) => !m.isParent).map((m) => m.id);
    const allMondays = mondaysInMonth(month);
    if (allMondays.length === 0) throw new Error("指定月が不正です。");

    const p = parentIds.length;
    const np = nonParentIds.length;
    const slotsPerSession = p * 3; // 1グループ4人固定（親+3）
    if (np < slotsPerSession) {
      throw new Error(`有効社員（親以外）が不足しています。親が${p}人の場合、同一月曜に最低でも親以外が${slotsPerSession}人必要です（現在: ${np}人）。`);
    }

    const sessionsNeeded = Math.max(1, Math.ceil(np / slotsPerSession));
    if (sessionsNeeded > allMondays.length) {
      throw new Error(`この月の月曜回数（${allMondays.length}回）では全員を割り当てられません。親を増やすか、別の月で生成してください。`);
    }

    const dates = allMondays.slice(0, sessionsNeeded);
    const exclusionSet = buildExclusionSet();
    const historyWeights = buildHistoryPairWeights(historyWindow);

    const attempts = 220;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const attemptSeed = `${seed}:${attempt}`;
      const r = mulberry32(hashToUint32(attemptSeed));

      const nonParentsShuffled = shuffleInPlace([...nonParentIds], r);
      const pools = dates.map(() => new Set());
      const assignedCounts = new Map();

      for (let i = 0; i < nonParentsShuffled.length; i++) {
        const id = nonParentsShuffled[i];
        const di = i % dates.length;
        pools[di].add(id);
        assignedCounts.set(id, (assignedCounts.get(id) || 0) + 1);
      }

      let failed = false;
      for (let di = 0; di < dates.length; di++) {
        const pool = pools[di];
        while (pool.size < slotsPerSession) {
          const candidates = nonParentIds.filter((id) => !pool.has(id));
          if (candidates.length === 0) {
            failed = true;
            break;
          }
          let best = candidates[0];
          let bestCount = assignedCounts.get(best) || 0;
          for (let i = 1; i < candidates.length; i++) {
            const id = candidates[i];
            const c = assignedCounts.get(id) || 0;
            if (c < bestCount) {
              best = id;
              bestCount = c;
            } else if (c === bestCount && r() < 0.25) {
              best = id;
            }
          }
          pool.add(best);
          assignedCounts.set(best, (assignedCounts.get(best) || 0) + 1);
        }
        if (failed) break;
      }
      if (failed) continue;

      const sessions = [];
      for (let di = 0; di < dates.length; di++) {
        const date = dates[di];
        const groups = parentIds.map((parentId, idx) => ({
          id: uuid(),
          groupNo: idx + 1,
          parentMemberId: parentId,
          members: [{ memberId: parentId, role: "parent" }],
        }));

        const remaining = shuffleInPlace([...pools[di]], r);
        const groupOrder = shuffleInPlace([...groups.keys()], r);
        for (const gi of groupOrder) {
          const g = groups[gi];
          while (g.members.length < 4 && remaining.length > 0) {
            const pick = pickBestMemberForGroup(remaining, g, exclusionSet, historyWeights, r);
            if (!pick) {
              failed = true;
              break;
            }
            g.members.push({ memberId: pick, role: "member" });
            remaining.splice(remaining.indexOf(pick), 1);
          }
          if (failed) break;
        }
        if (failed) break;
        if (groups.some((g) => g.members.length !== 4)) {
          failed = true;
          break;
        }
        if (remaining.length !== 0) {
          failed = true;
          break;
        }

        sessions.push({ runDate: date, groups });
      }
      if (failed) continue;

      const seenNonParents = new Set();
      for (const s of sessions) {
        for (const g of s.groups) {
          for (const m of g.members) if (m.role !== "parent") seenNonParents.add(m.memberId);
        }
      }
      if (nonParentIds.some((id) => !seenNonParents.has(id))) continue;

      const occurrences = new Map();
      for (const s of sessions) {
        for (const g of s.groups) {
          for (const m of g.members) {
            if (m.role === "parent") continue;
            occurrences.set(m.memberId, (occurrences.get(m.memberId) || 0) + 1);
          }
        }
      }
      const duplicated = [...occurrences.entries()].filter(([, c]) => c > 1).map(([id, c]) => ({ id, c }));

      return { month, dates, sessions, stats: { duplicated, totalNonParents: np, sessionsNeeded } };
    }

    throw new Error("月次生成に失敗しました。同席NGが多い可能性があります。");
  }

  function createMonthPicker({ name, valueYm, placeholder, allowClear, onChange }) {
    let value = String(valueYm || "").trim();
    const now = new Date();
    let viewYear = (() => {
      const y = Number.parseInt((value.split("-")[0] || "").trim(), 10);
      return Number.isFinite(y) ? y : now.getFullYear();
    })();

    const root = el("div", { class: "monthpicker" });
    const hidden = el("input", { type: "hidden", name, value });
    const inputBtn = el("button", { class: "monthpicker__input", type: "button" });
    const pop = el("div", { class: "monthpicker__popover", role: "dialog", "aria-modal": "true" });

    function labelText() {
      if (!value) return placeholder || "月を選択";
      return formatMonthLabel(value);
    }

    function setValue(next) {
      value = String(next || "").trim();
      hidden.value = value;
      inputBtn.querySelector(".monthpicker__input-text").textContent = labelText();
      root.classList.toggle("is-empty", !value);
      if (typeof onChange === "function") onChange(value);
    }

    function close() {
      root.classList.remove("is-open");
      document.removeEventListener("pointerdown", onDocPointerDown, true);
      document.removeEventListener("keydown", onDocKeyDown, true);
    }

    function open() {
      if (root.classList.contains("is-open")) return;
      root.classList.add("is-open");
      const y = Number.parseInt((value.split("-")[0] || "").trim(), 10);
      if (Number.isFinite(y)) viewYear = y;
      renderPopover();
      document.addEventListener("pointerdown", onDocPointerDown, true);
      document.addEventListener("keydown", onDocKeyDown, true);
    }

    function toggle() {
      if (root.classList.contains("is-open")) close();
      else open();
    }

    function onDocPointerDown(e) {
      if (!root.contains(e.target)) close();
    }

    function onDocKeyDown(e) {
      if (e.key === "Escape") close();
    }

    function monthButton(ym, label) {
      const isSelected = value === ym;
      return el("button", {
        type: "button",
        class: `monthpicker__month ${isSelected ? "is-selected" : ""}`.trim(),
        text: label,
        onclick: () => {
          setValue(ym);
          close();
        },
      });
    }

    function renderPopover() {
      const months = [];
      for (let i = 1; i <= 12; i++) {
        const mm = String(i).padStart(2, "0");
        months.push(monthButton(`${viewYear}-${mm}`, `${i}月`));
      }
      pop.replaceChildren(
        el("div", { class: "monthpicker__yearbar" }, [
          el("button", { type: "button", class: "monthpicker__nav", text: "‹", onclick: () => ((viewYear -= 1), renderPopover()) }),
          el("div", { class: "monthpicker__year", text: `${viewYear}年` }),
          el("button", { type: "button", class: "monthpicker__nav", text: "›", onclick: () => ((viewYear += 1), renderPopover()) }),
        ]),
        el("div", { class: "monthpicker__grid" }, months),
        el("div", { class: "monthpicker__footer" }, [
          el("button", {
            type: "button",
            class: "monthpicker__footer-btn",
            text: "今月",
            onclick: () => {
              setValue(currentYm());
              close();
            },
          }),
          allowClear
            ? el("button", {
                type: "button",
                class: "monthpicker__footer-btn monthpicker__footer-btn--ghost",
                text: "クリア",
                onclick: () => {
                  setValue("");
                  close();
                },
              })
            : el("div"),
        ])
      );
    }

    inputBtn.addEventListener("click", toggle);
    inputBtn.appendChild(el("span", { class: "monthpicker__input-text", text: labelText() }));
    inputBtn.appendChild(
      el("span", { class: "monthpicker__icon", "aria-hidden": "true" }, [
        el("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none" }, [
          el("path", {
            d: "M7 3v2M17 3v2M4 8h16M6 6h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z",
            stroke: "currentColor",
            "stroke-width": "1.6",
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
          }),
        ]),
      ])
    );

    root.appendChild(hidden);
    root.appendChild(inputBtn);
    root.appendChild(pop);
    root.classList.toggle("is-empty", !value);

    return { root, getValue: () => value, setValue };
  }

  function markActiveNav(route) {
    const links = document.querySelectorAll(".nav__link");
    links.forEach((a) => a.classList.remove("is-active"));
    const mapping = [
      ["/", "#/"],
      ["/runs/new", "#/runs/new"],
      ["/members", "#/members"],
      ["/exclusions", "#/exclusions"],
      ["/runs", "#/runs"],
    ];
    for (const [key, href] of mapping) {
      if (route === key || (key !== "/" && route.startsWith(key))) {
        const hit = [...links].find((a) => a.getAttribute("href") === href);
        if (hit) hit.classList.add("is-active");
      }
    }
  }

  function routeInfo() {
    const raw = location.hash.replace(/^#/, "") || "/";
    const [path] = raw.split("?");
    const parts = path.split("/").filter(Boolean);
    if (parts.length === 0) return { path: "/", params: {} };
    if (parts[0] === "runs" && parts[1] && parts[1] !== "new") return { path: "/runs/:id", params: { id: parts[1] } };
    if (parts[0] === "plans" && parts[1]) return { path: "/plans/:id", params: { id: parts[1] } };
    return { path: `/${parts.join("/")}`, params: {} };
  }

  function mountPage(title, rightNode, contentNode) {
    return el("div", { class: "page" }, [
      el("div", { class: "page__title" }, [el("h1", { text: title }), rightNode || el("div", { class: "muted", text: "" })]),
      contentNode,
    ]);
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function buildPlans() {
    const byBatch = new Map();
    for (const r of state.runs) {
      if (!r.batchId) continue;
      const month = r.batchMonth || String(r.runDate || "").slice(0, 7);
      const createdAt = String(r.createdAt || "");
      const existing = byBatch.get(r.batchId) || { batchId: r.batchId, month, createdAt, anyConfirmed: false, dates: [], historyWindow: r.historyWindow ?? 3 };
      if (createdAt > existing.createdAt) existing.createdAt = createdAt;
      existing.anyConfirmed = existing.anyConfirmed || r.status === "confirmed";
      existing.month = existing.month || month;
      existing.dates.push(r.runDate);
      if (typeof r.historyWindow === "number") existing.historyWindow = r.historyWindow;
      byBatch.set(r.batchId, existing);
    }
    return [...byBatch.values()].sort((a, b) => (a.createdAt !== b.createdAt ? String(b.createdAt).localeCompare(String(a.createdAt)) : String(b.month || "").localeCompare(String(a.month || ""))));
  }

  function renderDashboard() {
    const active = activeMembers();
    const parents = activeParents();
    const plans = buildPlans();
    const latest = runsSortedDesc(state.runs)[0] || null;

    const right = el("div", { class: "row" }, [
      el("button", { class: "btn btn--ghost", text: "エクスポート", onclick: () => downloadJson("lunch-grouping-export.json", state) }),
      el("label", { class: "btn btn--ghost" }, [
        el("span", { text: "インポート" }),
        el("input", {
          type: "file",
          accept: "application/json",
          style: "display:none",
          onchange: async (e) => {
            const file = e.target.files && e.target.files[0];
            e.target.value = "";
            if (!file) return;
            if (!confirm("現在のデータを上書きします。インポートしますか？")) return;
            try {
              const imported = JSON.parse(await file.text());
              setState({
                version: 1,
                members: Array.isArray(imported.members) ? imported.members : [],
                exclusions: Array.isArray(imported.exclusions) ? imported.exclusions : [],
                runs: Array.isArray(imported.runs) ? imported.runs : [],
              });
              alert("インポートしました。");
            } catch {
              alert("JSONの読み込みに失敗しました。");
            }
          },
        }),
      ]),
      el("button", {
        class: "btn btn--danger",
        text: "全データ初期化",
        onclick: () => {
          if (!confirm("本当に全データを削除しますか？（取り消せません）")) return;
          setState(buildDefaultState());
        },
      }),
    ]);

    const kpi = el("div", { class: "card" }, [
      el("div", { class: "card__title", text: "サマリ" }),
      el("div", { class: "row" }, [
        el("span", { class: "pill" }, [el("span", { class: "muted", text: "有効社員" }), el("span", { class: "mono", text: String(active.length) })]),
        el("span", { class: "pill" }, [el("span", { class: "muted", text: "親（責任者）" }), el("span", { class: "mono", text: String(parents.length) })]),
        el("span", { class: "pill" }, [el("span", { class: "muted", text: "同席NG" }), el("span", { class: "mono", text: String(state.exclusions.length) })]),
        el("span", { class: "pill" }, [el("span", { class: "muted", text: "履歴" }), el("span", { class: "mono", text: String(state.runs.length) })]),
      ]),
    ]);

    const latestCard = (() => {
      if (!latest) {
        return el("div", { class: "card" }, [
          el("div", { class: "card__title", text: "直近の生成" }),
          el("div", { class: "muted", text: "まだ履歴がありません。まずは社員/同席NGを確認して、月次生成してください。" }),
          el("div", { class: "hr" }),
          el("div", { class: "row" }, [el("a", { class: "btn btn--primary", href: "#/runs/new", text: "グループ生成へ" }), el("a", { class: "btn", href: "#/members", text: "社員" })]),
        ]);
      }
      const isPlan = !!latest.batchId;
      const plan = isPlan ? plans.find((p) => p.batchId === latest.batchId) : null;
      const month = (plan?.month || latest.batchMonth || String(latest.runDate || "").slice(0, 7)).trim();
      const mondayCount = plan?.dates?.length || null;
      const historyWindow = latest.historyWindow ?? plan?.historyWindow ?? 3;
      const badge = latest.status === "confirmed" ? el("span", { class: "badge badge--ok", text: "確定" }) : el("span", { class: "badge", text: "ドラフト" });
      const href = isPlan ? `#/plans/${latest.batchId}` : `#/runs/${latest.id}`;
      return el("div", { class: "card" }, [
        el("div", { class: "card__title" }, [el("span", { text: isPlan ? "直近の月次プラン" : "直近の実行" }), badge]),
        el("div", { class: "row" }, [
          isPlan ? el("span", { class: "pill" }, [el("span", { class: "muted", text: "対象月" }), el("span", { text: formatMonthLabel(month) })]) : null,
          isPlan && mondayCount ? el("span", { class: "pill" }, [el("span", { class: "muted", text: "月曜" }), el("span", { class: "mono", text: `${mondayCount}回` })]) : null,
          el("span", { class: "pill" }, [el("span", { class: "muted", text: "履歴参照" }), el("span", { class: "mono", text: `直近${historyWindow}回` })]),
        ]),
        el("div", { class: "hr" }),
        el("div", { class: "row" }, [el("a", { class: "btn btn--primary", href, text: "詳細を見る" }), el("a", { class: "btn", href: "#/runs/new", text: "新規生成" })]),
      ]);
    })();

    const recentPlans = (() => {
      if (plans.length === 0) return null;
      const table = el("table", { class: "table" });
      table.appendChild(
        el("thead", {}, [
          el("tr", {}, [el("th", { text: "対象月" }), el("th", { text: "月曜回数" }), el("th", { text: "状態" }), el("th", { text: "操作" })]),
        ])
      );
      const tbody = el("tbody");
      for (const p of plans.slice(0, 6)) {
        const badge = p.anyConfirmed ? el("span", { class: "badge badge--ok", text: "確定あり" }) : el("span", { class: "badge", text: "ドラフト" });
        tbody.appendChild(el("tr", {}, [el("td", { text: formatMonthLabel(p.month) }), el("td", { text: String((p.dates || []).length) }), el("td", {}, [badge]), el("td", {}, [el("a", { class: "btn btn--primary", href: `#/plans/${p.batchId}`, text: "開く" })])]));
      }
      table.appendChild(tbody);
      return el("div", { class: "card" }, [el("div", { class: "card__title", text: "最近の月次プラン" }), table]);
    })();

    const tips = el("div", { class: "card" }, [
      el("div", { class: "card__title", text: "使い方（最短）" }),
      el("ol", {}, [
        el("li", { class: "muted" }, ["社員で「親（責任者）」を4人ONにする"]),
        el("li", { class: "muted" }, ["同席NGがあれば登録する"]),
        el("li", { class: "muted" }, ["グループ生成で対象月を選んで月次生成→（必要なら）一括再生成→一括確定"]),
      ]),
    ]);

    const calendarTest = (() => {
      const target = state.members.find((m) => m.name === "吉田（や）") || null;
      const targetEmail = String(target?.email || "").trim();
      const note = el("div", { class: "muted" }, [
        "Googleカレンダー登録は、ログイン時に権限許可が必要です（権限追加後は一度ログアウト→再ログイン推奨）。",
      ]);
      const hint = el("div", { class: "muted", style: "margin-top:8px" }, [
        `テスト: ログイン中のあなた + 吉田（や）で次の月曜 12:00-13:00（JST）を作成します。`,
      ]);
      const btn = el("button", {
        class: "btn btn--primary",
        text: "テスト予定を作成",
        onclick: async () => {
          const other = targetEmail;
          if (!other) return alert("吉田（や）のメールが未登録です。社員画面でメールを登録してください。");
          if (!isValidEmail(other)) return alert("吉田（や）のメール形式が不正です。社員画面で修正してください。");
          if (!confirm(`Googleカレンダーにテスト予定を作成します。\n\n招待先: ${other}\n通知: sendUpdates=all`)) return;
          try {
            const res = await createCalendarTestEvent(other);
            const link = res?.htmlLink ? `\n\n${res.htmlLink}` : "";
            alert(`作成しました（${res?.date || ""}）。${link}`);
          } catch (err) {
            alert(String(err?.message || err));
          }
        },
      });
      return el("div", { class: "card" }, [
        el("div", { class: "card__title", text: "Googleカレンダー（テスト）" }),
        note,
        hint,
        el("div", { class: "hr" }),
        el("div", { class: "row" }, [btn, el("a", { class: "btn", href: "#/members", text: "社員でメールを編集" })]),
      ]);
    })();

    return mountPage(
      "ダッシュボード",
      right,
      el("div", { class: "grid" }, [
        el("div", { class: "col-12" }, kpi),
        el("div", { class: "col-8" }, el("div", { class: "grid" }, [el("div", { class: "col-12" }, latestCard), recentPlans ? el("div", { class: "col-12" }, recentPlans) : null])),
        el("div", { class: "col-4" }, el("div", { class: "grid" }, [el("div", { class: "col-12" }, tips), el("div", { class: "col-12" }, calendarTest)])),
      ])
    );
  }

  function renderMembers() {
    let editingId = null;
    const membersSorted = [...state.members].sort(byName);

    function resetForm(form) {
      editingId = null;
      form.querySelector('[name="name"]').value = "";
      form.querySelector('[name="email"]').value = "";
      form.querySelector('[name="isParent"]').checked = false;
      form.querySelector('[name="isActive"]').checked = true;
      form.querySelector("#edit-badge").textContent = "新規";
    }

    const form = el("form", { class: "card" }, [
      el("div", { class: "card__title" }, [el("span", { text: "社員の追加 / 編集" }), el("span", { class: "badge", id: "edit-badge", text: "新規" })]),
      el("div", { class: "grid" }, [
        el("div", { class: "col-6" }, [el("label", {}, [el("span", { text: "氏名" }), el("input", { name: "name", placeholder: "例: 松澤", autocomplete: "off" })])]),
        el("div", { class: "col-6" }, [el("label", {}, [el("span", { text: "メール（招待用）" }), el("input", { name: "email", placeholder: "例: foo@yadokari.tv", autocomplete: "off" })])]),
        el("div", { class: "col-12" }, [
          el("div", { class: "row" }, [
            el("label", { class: "pill" }, [el("input", { type: "checkbox", name: "isParent" }), el("span", { text: "親（責任者）" })]),
            el("label", { class: "pill" }, [el("input", { type: "checkbox", name: "isActive", checked: true }), el("span", { text: "有効" })]),
          ]),
        ]),
      ]),
      el("div", { class: "row" }, [
        el("button", { class: "btn btn--primary", type: "submit", text: "保存" }),
        el("button", { class: "btn btn--ghost", type: "button", text: "編集解除", onclick: () => resetForm(form) }),
      ]),
    ]);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = String(form.querySelector('[name="name"]').value || "").trim();
      const email = String(form.querySelector('[name="email"]').value || "").trim();
      const isParent = !!form.querySelector('[name="isParent"]').checked;
      const isActive = !!form.querySelector('[name="isActive"]').checked;
      if (!name) return alert("氏名を入力してください。");
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert("メール形式が不正です。");
      setState((draft) => {
        const ts = nowIso();
        if (!editingId) {
          draft.members.push({ id: uuid(), name, email, isActive, isParent, createdAt: ts, updatedAt: ts });
        } else {
          const m = draft.members.find((x) => x.id === editingId);
          if (m) {
            m.name = name;
            m.email = email;
            m.isActive = isActive;
            m.isParent = isParent;
            m.updatedAt = ts;
          }
        }
        return draft;
      });
    });

    const table = el("table", { class: "table" });
    table.appendChild(
      el("thead", {}, [
        el("tr", {}, [el("th", { text: "氏名" }), el("th", { text: "メール" }), el("th", { text: "有効" }), el("th", { text: "親" }), el("th", { text: "操作" })]),
      ])
    );
    const tbody = el("tbody");
    for (const m of membersSorted) {
      const editBtn = el("button", {
        class: "btn",
        text: "編集",
        onclick: () => {
          editingId = m.id;
          form.querySelector('[name="name"]').value = m.name;
          form.querySelector('[name="email"]').value = m.email || "";
          form.querySelector('[name="isParent"]').checked = !!m.isParent;
          form.querySelector('[name="isActive"]').checked = !!m.isActive;
          form.querySelector("#edit-badge").textContent = "編集中";
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
      });
      const toggleBtn = el("button", {
        class: "btn btn--ghost",
        text: m.isActive ? "無効化" : "有効化",
        onclick: () =>
          setState((draft) => {
            const x = draft.members.find((mm) => mm.id === m.id);
            if (x) {
              x.isActive = !x.isActive;
              x.updatedAt = nowIso();
            }
            return draft;
          }),
      });
      tbody.appendChild(
        el("tr", {}, [
          el("td", { text: m.name }),
          el("td", {}, [m.email ? el("span", { class: "mono", text: m.email }) : el("span", { class: "muted", text: "-" })]),
          el("td", {}, [m.isActive ? el("span", { class: "badge badge--ok", text: "有効" }) : el("span", { class: "badge", text: "無効" })]),
          el("td", {}, [m.isParent ? el("span", { class: "badge", text: "親" }) : el("span", { class: "muted", text: "-" })]),
          el("td", {}, [el("div", { class: "row" }, [editBtn, toggleBtn])]),
        ])
      );
    }
    table.appendChild(tbody);

    const hint = el("div", { class: "card" }, [
      el("div", { class: "card__title", text: "一括投入" }),
      el("div", { class: "muted", text: "初期社員リストを追加します（同名はスキップ。親4人は親フラグONにします）。" }),
      el("div", { class: "hr" }),
      el("div", { class: "row" }, [
        el("button", {
          class: "btn",
          type: "button",
          text: "初期社員を追加",
          onclick: () => {
            if (!confirm("初期社員リストを追加しますか？")) return;
            setState((draft) => {
              addMembersByNames(draft, DEFAULT_MEMBER_NAMES, DEFAULT_PARENT_NAMES);
              ensureDefaultParents(draft);
              return draft;
            });
          },
        }),
      ]),
    ]);

    return mountPage("社員", null, el("div", { class: "grid" }, [el("div", { class: "col-12" }, form), el("div", { class: "col-8" }, table), el("div", { class: "col-4" }, hint)]));
  }

  function renderExclusions() {
    const active = activeMembers().sort(byName);
    const buildOptions = () => active.map((m) => el("option", { value: m.id, text: m.name }));

    const form = el("form", { class: "card" }, [
      el("div", { class: "card__title", text: "同席NG（ペア）を追加" }),
      el("div", { class: "grid" }, [
        el("div", { class: "col-4" }, [el("label", {}, [el("span", { text: "社員A" }), el("select", { name: "a" }, [el("option", { value: "", text: "選択してください" }), ...buildOptions()])])]),
        el("div", { class: "col-4" }, [el("label", {}, [el("span", { text: "社員B" }), el("select", { name: "b" }, [el("option", { value: "", text: "選択してください" }), ...buildOptions()])])]),
        el("div", { class: "col-4" }, [el("label", {}, [el("span", { text: "理由メモ（任意）" }), el("input", { name: "note", placeholder: "例: 同チームなので避けたい" })])]),
      ]),
      el("div", { class: "row" }, [el("button", { class: "btn btn--primary", type: "submit", text: "追加" })]),
    ]);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const a = form.querySelector('[name="a"]').value;
      const b = form.querySelector('[name="b"]').value;
      const note = String(form.querySelector('[name="note"]').value || "").trim();
      if (!a || !b) return alert("社員A/Bを選択してください。");
      if (a === b) return alert("同一人物は指定できません。");
      const [na, nb] = normalizePair(a, b);
      const exists = state.exclusions.some((p) => pairKey(p.memberAId, p.memberBId) === pairKey(na, nb));
      if (exists) return alert("同じペアの同席NGが既に登録されています。");
      setState((draft) => {
        draft.exclusions.push({ id: uuid(), memberAId: na, memberBId: nb, note, createdAt: nowIso() });
        return draft;
      });
    });

    const table = el("table", { class: "table" });
    table.appendChild(
      el("thead", {}, [
        el("tr", {}, [el("th", { text: "社員A" }), el("th", { text: "社員B" }), el("th", { text: "理由" }), el("th", { text: "操作" })]),
      ])
    );
    const tbody = el("tbody");
    const list = [...state.exclusions].map((p) => ({ ...p, aName: findMember(p.memberAId)?.name || "(不明)", bName: findMember(p.memberBId)?.name || "(不明)" }));
    list.sort((x, y) => `${x.aName}|${x.bName}`.localeCompare(`${y.aName}|${y.bName}`, "ja"));
    for (const p of list) {
      tbody.appendChild(
        el("tr", {}, [
          el("td", { text: p.aName }),
          el("td", { text: p.bName }),
          el("td", { text: p.note || "" }),
          el("td", {}, [
            el("button", {
              class: "btn btn--ghost",
              text: "削除",
              onclick: () => {
                if (!confirm("この同席NGを削除しますか？")) return;
                setState((draft) => {
                  draft.exclusions = draft.exclusions.filter((x) => x.id !== p.id);
                  return draft;
                });
              },
            }),
          ]),
        ])
      );
    }
    table.appendChild(tbody);

    return mountPage("同席NG", null, el("div", { class: "grid" }, [el("div", { class: "col-12" }, form), el("div", { class: "col-12" }, table)]));
  }

  function groupCard(group) {
    const parentName = findMember(group.parentMemberId)?.name || "(不明)";
    const members = (group.members || []).filter((m) => m.role !== "parent").map((m) => findMember(m.memberId)?.name || "(不明)");
    return el("div", { class: "card" }, [
      el("div", { class: "card__title group-title" }, [el("div", {}, [el("div", { class: "group-parent", text: parentName }), el("div", { class: "muted", text: `グループ #${group.groupNo}` })]), el("span", { class: "badge", text: "親" })]),
      el("ul", { style: "margin:0; padding-left:18px;" }, members.map((name) => el("li", {}, [el("span", { text: name })]))),
    ]);
  }

  function renderRunCards(run) {
    return el("div", { class: "cards" }, groupsForDisplay(run.groups).map((g) => groupCard(g)));
  }

  function renderRunTable(run) {
    const table = el("table", { class: "table" });
    table.appendChild(
      el("thead", {}, [
        el("tr", {}, [el("th", { text: "親（責任者）" }), el("th", { text: "メンバー1" }), el("th", { text: "メンバー2" }), el("th", { text: "メンバー3" })]),
      ])
    );
    const tbody = el("tbody");
    for (const g of groupsForDisplay(run.groups)) {
      const parentName = findMember(g.parentMemberId)?.name || "(不明)";
      const memberNames = (g.members || []).filter((m) => m.role !== "parent").map((m) => findMember(m.memberId)?.name || "(不明)");
      while (memberNames.length < 3) memberNames.push("");
      tbody.appendChild(el("tr", {}, [el("td", { text: parentName }), el("td", { text: memberNames[0] }), el("td", { text: memberNames[1] }), el("td", { text: memberNames[2] })]));
    }
    table.appendChild(tbody);
    return table;
  }

  function renderRunNew() {
    const active = activeMembers();
    const parents = activeParents();
    const monthPicker = createMonthPicker({ name: "month", valueYm: currentYm(), placeholder: "月を選択", allowClear: false });

    const form = el("form", { class: "card" }, [
      el("div", { class: "card__title" }, [el("span", { text: "月次グループ生成（指定月の月曜）" }), el("span", { class: "badge", text: "ドラフト作成" })]),
      el("div", { class: "grid" }, [
        el("div", { class: "col-4" }, [el("label", {}, [el("span", { text: "対象月" }), monthPicker.root])]),
        el("div", { class: "col-4" }, [el("label", {}, [el("span", { text: "履歴参照（直近N回）" }), el("input", { type: "number", name: "historyWindow", min: "0", max: "12", value: "3" })])]),
        el("div", { class: "col-4" }, [el("label", {}, [el("span", { text: "実行者メモ（任意）" }), el("input", { name: "actorNote", placeholder: "例: 2026-02" })])]),
      ]),
      el("div", { class: "row" }, [el("button", { class: "btn btn--primary", type: "submit", text: "月次生成" }), el("a", { class: "btn", href: "#/members", text: "社員" }), el("a", { class: "btn", href: "#/exclusions", text: "同席NG" })]),
      el("div", { class: "muted", style: "margin-top:10px" }, [`有効社員: ${active.length} / 親（責任者）: ${parents.length} / 同席NG: ${state.exclusions.length}`]),
    ]);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const month = monthPicker.getValue();
      const historyWindow = clampInt(form.querySelector('[name="historyWindow"]').value, 0, 12, 3);
      const actorNote = String(form.querySelector('[name="actorNote"]').value || "").trim();
      if (!month) return alert("対象月を入力してください。");
      try {
        const seed = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
        const plan = generateMonthlyPlan({ month, historyWindow, seed });
        const batchId = uuid();
        const createdAt = nowIso();
        const runs = plan.sessions.map((s) => ({
          id: uuid(),
          batchId,
          batchMonth: month,
          runDate: s.runDate,
          status: "draft",
          historyWindow,
          actorNote: actorNote || month,
          seed,
          createdAt,
          confirmedAt: null,
          groups: s.groups,
          stats: groupStats(s.groups),
        }));
        setState((draft) => {
          draft.runs.push(...runs);
          return draft;
        });
        location.hash = `#/plans/${batchId}`;
      } catch (err) {
        alert(String(err?.message || err));
      }
    });

    const hint = el("div", { class: "card" }, [
      el("div", { class: "card__title", text: "ポイント" }),
      el("div", { class: "muted" }, [
        "・各月曜は「親A,B,C,D」が必ず出ます（親の数だけグループ）。",
        el("br"),
        "・各グループは必ず4人（親 + メンバー3人）。",
        el("br"),
        "・同じ月曜の中で同一メンバーは重複しません。",
      ]),
    ]);

    return mountPage("グループ生成", null, el("div", { class: "grid" }, [el("div", { class: "col-12" }, form), el("div", { class: "col-12" }, hint)]));
  }

  function renderRuns() {
    let selectedMonth = "";
    const monthPicker = createMonthPicker({
      name: "monthFilter",
      valueYm: "",
      placeholder: "月を選択",
      allowClear: true,
      onChange: (ym) => {
        selectedMonth = ym;
        renderList();
      },
    });

    const listArea = el("div", { class: "card" }, [el("div", { class: "card__title", text: "履歴" }), el("div", { class: "muted", text: "月で絞り込みできます。" })]);

    function renderList() {
      const runs = runsSortedDesc(state.runs).filter((r) => {
        if (!selectedMonth) return true;
        return String(r.runDate || "").startsWith(selectedMonth);
      });
      const table = el("table", { class: "table" });
      table.appendChild(
        el("thead", {}, [
          el("tr", {}, [el("th", { text: "実施日" }), el("th", { text: "状態" }), el("th", { text: "グループ数" }), el("th", { text: "履歴参照" }), el("th", { text: "操作" })]),
        ])
      );
      const tbody = el("tbody");
      for (const r of runs) {
        const badge = r.status === "confirmed" ? el("span", { class: "badge badge--ok", text: "確定" }) : el("span", { class: "badge", text: "ドラフト" });
        tbody.appendChild(
          el("tr", {}, [
            el("td", { text: r.runDate || "" }),
            el("td", {}, [badge]),
            el("td", { text: String((r.groups || []).length) }),
            el("td", { text: `直近${r.historyWindow ?? 3}回` }),
            el("td", {}, [
              el("div", { class: "row" }, [
                el("a", { class: "btn btn--primary", href: `#/runs/${r.id}`, text: "詳細" }),
                r.batchId ? el("a", { class: "btn", href: `#/plans/${r.batchId}`, text: "プラン" }) : null,
              ]),
            ]),
          ])
        );
      }
      if (runs.length === 0) tbody.appendChild(el("tr", {}, [el("td", { colspan: "5", class: "muted", text: "該当する履歴がありません。" })]));
      table.appendChild(tbody);
      listArea.replaceChildren(el("div", { class: "card__title" }, [el("span", { text: "履歴" }), el("span", { class: "badge", text: `件数: ${runs.length}` })]), table);
    }

    renderList();

    const filterBar = el("div", { class: "card" }, [el("div", { class: "card__title", text: "月フィルタ" }), el("div", { class: "row" }, [el("label", { class: "grow" }, [el("span", { text: "対象月" }), monthPicker.root])])]);

    return mountPage("履歴", null, el("div", { class: "grid" }, [el("div", { class: "col-4" }, filterBar), el("div", { class: "col-8" }, listArea)]));
  }

  function renderPlanDetail(batchId) {
    const runs = state.runs
      .filter((r) => r.batchId === batchId)
      .sort((a, b) => String(a.runDate || "").localeCompare(String(b.runDate || "")));
    if (runs.length === 0) {
      return mountPage("月次プラン", null, el("div", { class: "card card--danger" }, [el("div", { class: "card__title", text: "見つかりません" }), el("a", { class: "btn", href: "#/runs", text: "履歴へ" })]));
    }

    const month = runs[0].batchMonth || String(runs[0].runDate || "").slice(0, 7);
    const isAnyConfirmed = runs.some((r) => r.status === "confirmed");
    const dates = runs.map((r) => r.runDate);
    const parentIds = [...new Set(runs.flatMap((r) => (r.groups || []).map((g) => g.parentMemberId)))].sort((a, b) => (findMember(a)?.name || "").localeCompare(findMember(b)?.name || "", "ja"));

    let viewMode = "matrix";
    const content = el("div");

    function rerollAll() {
      if (isAnyConfirmed) return alert("確定済みが含まれるため、一括再生成できません。");
      if (!confirm("この月次プランを一括で再生成しますか？")) return;
      const historyWindow = runs[0].historyWindow ?? 3;
      const seed = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      try {
        const plan = generateMonthlyPlan({ month, historyWindow, seed });
        setState((draft) => {
          const targets = draft.runs
            .filter((r) => r.batchId === batchId)
            .sort((a, b) => String(a.runDate || "").localeCompare(String(b.runDate || "")));
          if (targets.length !== plan.sessions.length) {
            draft.runs = draft.runs.filter((r) => r.batchId !== batchId);
            const createdAt = nowIso();
            const actorNote = runs[0].actorNote || month;
            for (const s of plan.sessions) {
              draft.runs.push({
                id: uuid(),
                batchId,
                batchMonth: month,
                runDate: s.runDate,
                status: "draft",
                historyWindow,
                actorNote,
                seed,
                createdAt,
                confirmedAt: null,
                groups: s.groups,
                stats: groupStats(s.groups),
              });
            }
            return draft;
          }
          for (let i = 0; i < targets.length; i++) {
            const t = targets[i];
            const s = plan.sessions[i];
            t.seed = seed;
            t.groups = s.groups;
            t.stats = groupStats(s.groups);
            t.updatedAt = nowIso();
          }
          return draft;
        });
      } catch (err) {
        alert(String(err?.message || err));
      }
    }

    function confirmAll() {
      if (!confirm("この月次プラン（全ての月曜分）を確定しますか？")) return;
      setState((draft) => {
        const ts = nowIso();
        for (const r of draft.runs) {
          if (r.batchId !== batchId) continue;
          r.status = "confirmed";
          r.confirmedAt = ts;
        }
        return draft;
      });
    }

    function deletePlan() {
      if (!confirm("この月次プランを削除しますか？（取り消せません）")) return;
      setState((draft) => {
        draft.runs = draft.runs.filter((r) => r.batchId !== batchId);
        return draft;
      });
      location.hash = "#/runs";
    }

    async function registerCalendar() {
      const totalGroups = runs.reduce((acc, r) => acc + (r.groups || []).length, 0);
      if (!confirm(`この月次プランの全グループ（${totalGroups}件）をGoogleカレンダーに登録します。\n招待通知: sendUpdates=all\n\n※メール未登録の社員がいると失敗します。`)) return;

      const missing = [];
      const events = [];
      for (let i = 0; i < runs.length; i++) {
        const run = runs[i];
        const weekNo = i + 1;
        const date = String(run.runDate || "").trim();
        for (const g of run.groups || []) {
          const ids = (g.members || []).map((m) => m.memberId);
          const emails = [];
          const names = [];
          for (const id of ids) {
            const m = findMember(id);
            const name = m?.name || "(不明)";
            names.push(name);
            const email = String(m?.email || "").trim();
            if (!email) missing.push(`${name}（${date} 第${weekNo}週）`);
            else if (!isValidEmail(email)) missing.push(`${name}（形式不正: ${email}）`);
            else emails.push(email);
          }

          if (emails.length !== ids.length) continue;

          const parentName = findMember(g.parentMemberId)?.name || "(不明)";
          events.push({
            summary: `ランチ会（第${weekNo}週）`,
            description: `対象月: ${formatMonthLabel(month)}\n実施日: ${date}（月）\n親: ${parentName}\n参加者: ${names.join(" / ")}\n`,
            start: { dateTime: `${date}T12:00:00+09:00`, timeZone: "Asia/Tokyo" },
            end: { dateTime: `${date}T13:00:00+09:00`, timeZone: "Asia/Tokyo" },
            attendees: emails.map((email) => ({ email })),
          });
        }
      }

      if (missing.length > 0) {
        const list = missing.slice(0, 12).join("\n");
        const more = missing.length > 12 ? `\n...他${missing.length - 12}件` : "";
        alert(`メール未登録/形式不正の社員があります。社員画面でメールを登録してから再実行してください。\n\n${list}${more}`);
        return;
      }
      if (events.length === 0) return alert("作成対象のイベントが0件です。");

      try {
        const res = await createCalendarEvents(events);
        const okCount = (res?.results || []).filter((x) => x.ok).length;
        const ngCount = (res?.results || []).length - okCount;
        const firstLink = (res?.results || []).find((x) => x.ok && x.htmlLink)?.htmlLink || "";
        const linkMsg = firstLink ? `\n\n例: ${firstLink}` : "";
        alert(`カレンダー登録しました。成功: ${okCount} / 失敗: ${ngCount}${linkMsg}`);
      } catch (err) {
        alert(String(err?.message || err));
      }
    }

    const headerRight = el("div", { class: "row" }, [
      el("a", { class: "btn", href: "#/runs", text: "履歴へ" }),
      el("button", { class: "btn", text: "一括再生成", onclick: rerollAll }),
      el("button", { class: "btn btn--primary", text: "一括確定", onclick: confirmAll }),
      el("button", { class: "btn", text: "Googleカレンダー登録", onclick: registerCalendar }),
      el("button", { class: "btn btn--danger", text: "プラン削除", onclick: deletePlan }),
    ]);

    function buildMatrixTable() {
      const table = el("table", { class: "table table--matrix" });
      const theadRow = el("tr");
      theadRow.appendChild(el("th", { text: "親（責任者）" }));
      for (const d of dates) theadRow.appendChild(el("th", { text: formatMdLabel(d) }));
      table.appendChild(el("thead", {}, [theadRow]));

      const tbody = el("tbody");
      for (const parentId of parentIds) {
        const parentName = findMember(parentId)?.name || "(不明)";
        const tr = el("tr");
        tr.appendChild(el("td", { class: "table--sticky", text: parentName }));
        for (const d of dates) {
          const run = runs.find((r) => r.runDate === d);
          const group = run?.groups?.find((g) => g.parentMemberId === parentId) || null;
          const members = (group?.members || [])
            .filter((m) => m.role !== "parent")
            .map((m) => ({ id: m.memberId, name: findMember(m.memberId)?.name || "(不明)" }))
            .sort((a, b) => a.name.localeCompare(b.name, "ja"));
          const cell = el("div", { class: "cell-list" }, members.map((m) => el("div", { class: "cell-item" }, [el("span", { text: m.name })])));
          tr.appendChild(el("td", {}, [cell]));
        }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      return el("div", { class: "table-wrap" }, [table]);
    }

    function buildWeeklyCards() {
      const container = el("div", { class: "grid" });
      for (const run of runs) {
        const badge = run.status === "confirmed" ? el("span", { class: "badge badge--ok", text: "確定" }) : el("span", { class: "badge", text: "ドラフト" });
        container.appendChild(
          el("div", { class: "col-12" }, [
            el("div", { class: "card" }, [
              el("div", { class: "card__title" }, [el("span", { text: `${run.runDate}（月）` }), badge]),
              el("div", { class: "hr" }),
              renderRunCards(run),
            ]),
          ])
        );
      }
      return container;
    }

    function buildSummary() {
      const activeCount = activeMembers().length;
      const parentCount = activeParents().length;
      const badge = isAnyConfirmed ? el("span", { class: "badge badge--ok", text: "確定あり" }) : el("span", { class: "badge", text: "全ドラフト" });
      return el("div", { class: "card" }, [
        el("div", { class: "card__title" }, [el("span", { text: "サマリ" }), badge]),
        el("div", { class: "row" }, [
          el("span", { class: "pill" }, [el("span", { class: "muted", text: "対象月" }), el("span", { text: formatMonthLabel(month) })]),
          el("span", { class: "pill" }, [el("span", { class: "muted", text: "月曜回数" }), el("span", { class: "mono", text: String(runs.length) })]),
          el("span", { class: "pill" }, [el("span", { class: "muted", text: "有効社員" }), el("span", { class: "mono", text: String(activeCount) })]),
          el("span", { class: "pill" }, [el("span", { class: "muted", text: "親" }), el("span", { class: "mono", text: String(parentCount) })]),
          el("span", { class: "pill" }, [el("span", { class: "muted", text: "履歴参照" }), el("span", { class: "mono", text: `直近${runs[0].historyWindow ?? 3}回` })]),
        ]),
      ]);
    }

    const modeToggle = el("div", { class: "row" }, [
      el("span", { class: "muted", text: "表示:" }),
      el("button", { class: `btn ${viewMode === "matrix" ? "btn--primary" : ""}`.trim(), text: "表（親×月曜）", onclick: () => ((viewMode = "matrix"), rerender()) }),
      el("button", { class: `btn ${viewMode === "weekly" ? "btn--primary" : ""}`.trim(), text: "週カード", onclick: () => ((viewMode = "weekly"), rerender()) }),
    ]);

    function rerender() {
      content.replaceChildren(modeToggle, el("div", { class: "hr" }), buildSummary(), el("div", { class: "hr" }), viewMode === "weekly" ? buildWeeklyCards() : buildMatrixTable());
    }
    rerender();

    return mountPage("月次プラン", headerRight, el("div", { class: "grid" }, [el("div", { class: "col-12" }, content)]));
  }

  function renderRunDetail(runId) {
    const run = state.runs.find((r) => r.id === runId);
    if (!run) return mountPage("履歴詳細", null, el("div", { class: "card card--danger" }, [el("div", { class: "card__title", text: "見つかりません" }), el("a", { class: "btn", href: "#/runs", text: "履歴へ" })]));

    let viewMode = "cards";
    const isBatched = !!run.batchId;
    const badge = run.status === "confirmed" ? el("span", { class: "badge badge--ok", text: "確定" }) : el("span", { class: "badge", text: "ドラフト" });

    const headerRight = el("div", { class: "row" }, [
      el("a", { class: "btn", href: "#/runs", text: "一覧へ" }),
      isBatched ? el("a", { class: "btn btn--primary", href: `#/plans/${run.batchId}`, text: "月次プランへ" }) : null,
    ]);

    const modeToggle = el("div", { class: "row" }, [
      el("span", { class: "muted", text: "表示:" }),
      el("button", { class: `btn ${viewMode === "cards" ? "btn--primary" : ""}`.trim(), text: "カード", onclick: () => ((viewMode = "cards"), renderBody()) }),
      el("button", { class: `btn ${viewMode === "table" ? "btn--primary" : ""}`.trim(), text: "表", onclick: () => ((viewMode = "table"), renderBody()) }),
    ]);

    const body = el("div", { class: "card" });

    function renderBody() {
      body.replaceChildren(
        el("div", { class: "card__title" }, [el("span", { text: `実施日: ${run.runDate}` }), badge]),
        el("div", { class: "row" }, [
          el("span", { class: "pill" }, [el("span", { class: "muted", text: "履歴参照" }), el("span", { class: "mono", text: `直近${run.historyWindow ?? 3}回` })]),
          modeToggle,
        ]),
        el("div", { class: "hr" }),
        viewMode === "table" ? renderRunTable(run) : renderRunCards(run)
      );
    }
    renderBody();

    return mountPage("履歴詳細", headerRight, el("div", { class: "grid" }, [el("div", { class: "col-12" }, body)]));
  }

  function renderNotFound() {
    return mountPage("Not Found", null, el("div", { class: "card card--danger" }, [el("div", { class: "card__title", text: "ページが見つかりません" }), el("a", { class: "btn", href: "#/", text: "ダッシュボードへ" })]));
  }

  function render() {
    const { path, params } = routeInfo();
    markActiveNav(path === "/runs/:id" ? "/runs" : path === "/plans/:id" ? "/runs/new" : path);

    let page;
    if (path === "/") page = renderDashboard();
    else if (path === "/members") page = renderMembers();
    else if (path === "/exclusions") page = renderExclusions();
    else if (path === "/runs/new") page = renderRunNew();
    else if (path === "/runs") page = renderRuns();
    else if (path === "/plans/:id") page = renderPlanDetail(params.id);
    else if (path === "/runs/:id") page = renderRunDetail(params.id);
    else page = renderNotFound();

    appRoot.replaceChildren(page);
  }

  window.addEventListener("hashchange", render);
  render();
})();
