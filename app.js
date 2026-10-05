/* HomeKeeper - UI wiring. Depends on window.HMC from engine.js. */
(function () {
  'use strict';

  var STORE_KEY = 'hmc_state_v1';

  /* ---------- static option data ---------- */

  var HOME_TYPES = [
    { v: 'house', t: 'House', d: 'Detached single-family home' },
    { v: 'townhouse', t: 'Townhouse', d: 'Attached home, maybe a small yard' },
    { v: 'condo', t: 'Condo', d: 'Owned unit in a shared building' },
    { v: 'apartment', t: 'Apartment', d: 'Rented unit' }
  ];

  var AGE_RANGES = [
    { v: 'under-5', t: 'Under 5 years', d: 'Newer build' },
    { v: '5-15', t: '5 to 15 years', d: '' },
    { v: '15-30', t: '15 to 30 years', d: '' },
    { v: 'over-30', t: 'Over 30 years', d: 'Older homes need extra love' }
  ];

  var CLIMATES = [
    { v: 'hot-humid', t: 'Hot and humid', d: 'Florida, Gulf Coast, the Southeast' },
    { v: 'hot-dry', t: 'Hot and dry', d: 'Arizona, inland Texas, the desert Southwest' },
    { v: 'temperate', t: 'Temperate', d: 'Four mild seasons' },
    { v: 'cold', t: 'Cold', d: 'Harsh winters and freezing temps' },
    { v: 'coastal', t: 'Coastal', d: 'Salt air and storm season' }
  ];

  var HVAC_OPTIONS = [
    { v: 'forced-air', t: 'Forced air' },
    { v: 'heat-pump', t: 'Heat pump' },
    { v: 'boiler', t: 'Boiler / radiators' },
    { v: 'none', t: 'None / not sure' }
  ];

  var SYSTEM_TOGGLES = [
    { k: 'waterHeater', t: 'Water heater', d: 'Tank or tankless' },
    { k: 'gutters', t: 'Gutters', d: 'Roof gutters and downspouts' },
    { k: 'fireplace', t: 'Fireplace or wood stove', d: '' },
    { k: 'sumpPump', t: 'Sump pump', d: 'Basement or crawl space' },
    { k: 'dishwasher', t: 'Dishwasher', d: '' },
    { k: 'washerDryer', t: 'Washer and dryer', d: '' },
    { k: 'lawn', t: 'Lawn to maintain', d: '' },
    { k: 'irrigation', t: 'Irrigation / sprinklers', d: '' },
    { k: 'smokeCo', t: 'Smoke and CO detectors', d: 'Most homes have these' },
    { k: 'garageDoor', t: 'Garage door opener', d: '' }
  ];

  var HOME_DEFAULTS = {
    house:     { hvac: 'forced-air', waterHeater: true,  gutters: true,  fireplace: false, sumpPump: false, dishwasher: true, washerDryer: true,  lawn: true,  irrigation: false, smokeCo: true, garageDoor: true },
    townhouse: { hvac: 'forced-air', waterHeater: true,  gutters: true,  fireplace: false, sumpPump: false, dishwasher: true, washerDryer: true,  lawn: false, irrigation: false, smokeCo: true, garageDoor: true },
    condo:     { hvac: 'heat-pump',  waterHeater: true,  gutters: false, fireplace: false, sumpPump: false, dishwasher: true, washerDryer: true,  lawn: false, irrigation: false, smokeCo: true, garageDoor: false },
    apartment: { hvac: 'none',       waterHeater: false, gutters: false, fireplace: false, sumpPump: false, dishwasher: true, washerDryer: false, lawn: false, irrigation: false, smokeCo: true, garageDoor: false }
  };

  var PREMIUM = [
    { k: 'contractors', t: 'Contractor contacts', d: 'Keep your trusted plumber, electrician, and HVAC tech one tap away, with notes on who did what and when.' },
    { k: 'ai-help', t: 'AI troubleshooting', d: 'Describe a drip, a noise, or a smell and get step-by-step triage: what it likely is, what to check first, and when to call a pro.' }
  ];

  /* ---------- state ---------- */

  function blankState() {
    return {
      version: 1,
      onboarded: false,
      profile: null,
      tasks: [],
      history: [],
      notifyInterest: {},
      // Reminder-ready: push not wired at MVP. When a service worker +
      // push subscription exists, set notifications.enabled and use
      // remindAt / daysAhead to schedule local or push reminders from
      // each task's nextDueAt timestamp.
      prefs: {
        notifications: { enabled: false, remindAt: '08:00', daysAhead: 1 }
      }
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return blankState();
      var s = JSON.parse(raw);
      if (!s || s.version !== 1) return blankState();
      return s;
    } catch (e) {
      return blankState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) { /* storage full or blocked: app still works for the session */ }
  }

  var state = loadState();
  var view = document.getElementById('view');
  var header = document.getElementById('app-header');
  var badge = document.getElementById('due-badge');
  var activeTab = 'tasks';

  /* ---------------- reminders (stubbed at MVP) ----------------
     REMINDER HOOK: this is where push/local notification scheduling
     attaches later. Each task carries:
       task.notify = { enabled, daysBefore, channel }
       task.nextDueAt = ISO timestamp of the next occurrence
     A future implementation would:
       1. Ask Notification permission on first dashboard visit.
       2. For each task with notify.enabled, schedule a notification at
          (effectiveDue - daysBefore) via the service worker.
       3. Re-run this refresh on every state change (done / snooze /
          skip / regenerate). The header badge is the in-app stand-in
       at MVP. See README for the full plan. */
  function scheduleReminder(task) {
    if (!task.notify || !task.notify.enabled) return false;
    if (typeof task.notify.daysBefore !== 'number') return false;
    /* No-op at MVP: notification scheduling not yet implemented. */
    return true;
  }

  function refreshReminderModel() {
    /* Validate the reminder data model on every state change so the shape
       is already correct when real scheduling ships. */
    state.tasks.forEach(scheduleReminder);
  }

  /* ---------- helpers ---------- */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function dueLabel(task) {
    var eff = HMC.effectiveDue(task, new Date()).toISOString();
    var d = HMC.daysUntil(eff);
    var snoozed = HMC.isSnoozed(task, new Date());
    var tag = snoozed ? ' <span class="snooze-tag">Snoozed</span>' : '';
    if (d < 0) {
      var n = Math.abs(d);
      return { text: (n === 1 ? '1 day overdue' : n + ' days overdue') + tag, cls: 'overdue-tag' };
    }
    if (d === 0) return { text: 'Due today' + tag, cls: 'due-tag' };
    if (d === 1) return { text: 'Due tomorrow' + tag, cls: 'due-tag' };
    if (d <= 7) return { text: 'Due in ' + d + ' days' + tag, cls: 'due-tag' };
    var dt = new Date(eff);
    return { text: 'Due ' + dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + tag, cls: '' };
  }

  function fmtDate(iso) {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function labelFor(list, v) {
    for (var i = 0; i < list.length; i++) if (list[i].v === v) return list[i].t;
    return v;
  }

  /* ---------- onboarding ---------- */

  var draft = null;
  var stepIndex = 0;
  var TOTAL_STEPS = 5; // steps 1..5 after welcome

  function startOnboarding() {
    draft = {
      homeType: null,
      ageRange: null,
      climate: null,
      systems: null
    };
    stepIndex = 0;
    renderOnboarding();
  }

  function applyDefaults() {
    if (!draft.homeType) draft.homeType = 'house';
    if (!draft.ageRange) draft.ageRange = '5-15';
    if (!draft.climate) draft.climate = 'temperate';
    if (!draft.systems) draft.systems = Object.assign({}, HOME_DEFAULTS[draft.homeType]);
  }

  function progressBar() {
    if (stepIndex === 0) return '';
    var pct = Math.round((stepIndex / TOTAL_STEPS) * 100);
    return '<div class="progress"><div style="width:' + pct + '%"></div></div>' +
      '<div class="step-count">Step ' + stepIndex + ' of ' + TOTAL_STEPS + '</div>';
  }

  function optionList(options, selected, onPick) {
    return '<div class="option-list">' + options.map(function (o) {
      var sel = selected === o.v ? ' selected' : '';
      var sub = o.d ? '<small>' + esc(o.d) + '</small>' : '';
      return '<button class="option' + sel + '" data-v="' + esc(o.v) + '"><span>' + esc(o.t) + sub + '</span></button>';
    }).join('') + '</div>';
  }

  function navButtons(opts) {
    opts = opts || {};
    var back = stepIndex > 0
      ? '<button class="btn btn-secondary" id="btn-back">Back</button>' : '';
    var nextLabel = stepIndex === TOTAL_STEPS ? 'Build my plan' : 'Continue';
    var next = '<button class="btn btn-primary" id="btn-next"' +
      (opts.nextDisabled ? ' disabled style="opacity:0.4"' : '') + '>' + nextLabel + '</button>';
    return '<div class="onboard-nav">' + back + next + '</div>' +
      (stepIndex > 0 && stepIndex < TOTAL_STEPS
        ? '<div class="skip-row"><button class="btn-link" id="btn-skip">Skip for now</button></div>' : '');
  }

  function renderOnboarding() {
    header.hidden = true;
    var html = '<div class="onboard-wrap">' + progressBar();
    html += '<div class="onboard-card">';

    if (stepIndex === 0) {
      html += '<h2>Never miss home maintenance again</h2>' +
        '<p class="lead">Answer a few quick questions and we will build a personalized maintenance schedule for your home. Big buttons, no jargon, about a minute.</p>' +
        '<button class="btn btn-primary" id="btn-start">Get started</button>';
    } else if (stepIndex === 1) {
      html += '<h2>What kind of home?</h2><p class="lead">This shapes which tasks apply to you.</p>' +
        optionList(HOME_TYPES, draft.homeType) + navButtons({ nextDisabled: !draft.homeType });
    } else if (stepIndex === 2) {
      html += '<h2>How old is your home?</h2><p class="lead">Older homes get a few extra checks.</p>' +
        optionList(AGE_RANGES, draft.ageRange) + navButtons({ nextDisabled: !draft.ageRange });
    } else if (stepIndex === 3) {
      html += '<h2>What is your climate like?</h2><p class="lead">Weather drives a lot of maintenance timing.</p>' +
        optionList(CLIMATES, draft.climate) + navButtons({ nextDisabled: !draft.climate });
    } else if (stepIndex === 4) {
      if (!draft.systems) draft.systems = Object.assign({}, HOME_DEFAULTS[draft.homeType || 'house']);
      html += '<h2>Your systems and appliances</h2><p class="lead">Toggle what your home has. We have pre-checked the usual ones.</p>';
      html += '<div class="step-count" style="margin-bottom:4px">Heating and cooling</div>';
      html += '<div class="seg-row">' + HVAC_OPTIONS.map(function (o) {
        var sel = draft.systems.hvac === o.v ? ' selected' : '';
        return '<button class="seg' + sel + '" data-hvac="' + esc(o.v) + '">' + esc(o.t) + '</button>';
      }).join('') + '</div>';
      html += SYSTEM_TOGGLES.map(function (s) {
        var on = !!draft.systems[s.k];
        var sub = s.d ? '<small>' + esc(s.d) + '</small>' : '';
        return '<div class="toggle-row"><span>' + esc(s.t) + sub + '</span>' +
          '<button class="switch" role="switch" aria-checked="' + on + '" data-k="' + esc(s.k) + '" aria-label="' + esc(s.t) + '"></button></div>';
      }).join('');
      html += navButtons();
    } else if (stepIndex === 5) {
      applyDefaults();
      var sys = draft.systems;
      var onList = SYSTEM_TOGGLES.filter(function (s) { return sys[s.k]; }).map(function (s) { return s.t; });
      html += '<h2>Your home profile</h2><p class="lead">Here is what we will base your plan on.</p>' +
        '<div class="toggle-row"><span>Type</span><span>' + esc(labelFor(HOME_TYPES, draft.homeType)) + '</span></div>' +
        '<div class="toggle-row"><span>Age</span><span>' + esc(labelFor(AGE_RANGES, draft.ageRange)) + '</span></div>' +
        '<div class="toggle-row"><span>Climate</span><span>' + esc(labelFor(CLIMATES, draft.climate)) + '</span></div>' +
        '<div class="toggle-row"><span>Heating / cooling</span><span>' + esc(labelFor(HVAC_OPTIONS, sys.hvac)) + '</span></div>' +
        '<div class="toggle-row"><span>Systems</span><span style="text-align:right;max-width:60%">' + esc(onList.join(', ') || 'None selected') + '</span></div>' +
        navButtons();
    }

    html += '</div></div>';
    view.innerHTML = html;
    wireOnboarding();
  }

  function wireOnboarding() {
    var b;

    b = document.getElementById('btn-start');
    if (b) b.addEventListener('click', function () { stepIndex = 1; renderOnboarding(); });

    view.querySelectorAll('.option').forEach(function (el) {
      el.addEventListener('click', function () {
        var v = el.getAttribute('data-v');
        if (stepIndex === 1) {
          draft.homeType = v;
          draft.systems = Object.assign({}, HOME_DEFAULTS[v]); // refresh presets
        }
        else if (stepIndex === 2) draft.ageRange = v;
        else if (stepIndex === 3) draft.climate = v;
        renderOnboarding();
      });
    });

    view.querySelectorAll('.seg').forEach(function (el) {
      el.addEventListener('click', function () {
        draft.systems.hvac = el.getAttribute('data-hvac');
        renderOnboarding();
      });
    });

    view.querySelectorAll('.switch').forEach(function (el) {
      el.addEventListener('click', function () {
        var k = el.getAttribute('data-k');
        draft.systems[k] = !draft.systems[k];
        el.setAttribute('aria-checked', String(!!draft.systems[k]));
      });
    });

    b = document.getElementById('btn-back');
    if (b) b.addEventListener('click', function () { stepIndex -= 1; renderOnboarding(); });

    b = document.getElementById('btn-skip');
    if (b) b.addEventListener('click', function () {
      applyDefaults();
      stepIndex = TOTAL_STEPS;
      renderOnboarding();
    });

    b = document.getElementById('btn-next');
    if (b && !b.disabled) b.addEventListener('click', function () {
      if (stepIndex < TOTAL_STEPS) {
        stepIndex += 1;
        renderOnboarding();
      } else {
        finishOnboarding();
      }
    });
  }

  function finishOnboarding() {
    applyDefaults();
    view.innerHTML = '<div class="generating"><div class="spin"></div><p>Building your maintenance plan...</p></div>';
    setTimeout(function () {
      var profile = {
        homeType: draft.homeType,
        ageRange: draft.ageRange,
        climate: draft.climate,
        systems: draft.systems
      };
      state.profile = profile;
      state.tasks = HMC.tasksForProfile(profile);
      state.history = [];
      state.onboarded = true;
      saveState();
      activeTab = 'tasks';
      renderMain();
    }, 900);
  }

  /* ---------- home inventory (premium) ----------
     Insurance-ready documentation for the things you own: what you paid,
     serial numbers, and photos. Everything stays on this device under
     the homekeeper_inventory_v1 key, separate from task data. */

  var INV_KEY = 'homekeeper_inventory_v1';
  var INV_WARN_BYTES = 4.5 * 1024 * 1024; // warn before the ~5MB localStorage ceiling

  var INV_CATEGORIES = [
    { v: 'appliance', t: 'Appliance' },
    { v: 'electronics', t: 'Electronics' },
    { v: 'furniture', t: 'Furniture' },
    { v: 'tools', t: 'Tools' },
    { v: 'jewelry', t: 'Jewelry' },
    { v: 'other', t: 'Other' }
  ];

  var INV_ROOMS = ['Living room', 'Kitchen', 'Primary bedroom', 'Bedroom', 'Bathroom',
    'Garage', 'Laundry room', 'Home office', 'Dining room', 'Basement', 'Attic', 'Patio'];

  function loadInventory() {
    try {
      var raw = localStorage.getItem(INV_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveInventory() {
    try {
      localStorage.setItem(INV_KEY, JSON.stringify(inventory));
      return true;
    } catch (e) {
      return false; // quota exceeded or storage blocked
    }
  }

  function invFind(id) {
    for (var i = 0; i < inventory.length; i++) {
      if (inventory[i].id === id) return inventory[i];
    }
    return null;
  }

  function invNewId() {
    return 'inv_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function catLabel(v) {
    return labelFor(INV_CATEGORIES, v);
  }

  function fmtMoney(n) {
    n = Number(n) || 0;
    return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtMB(bytes) {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function storageUsageBytes() {
    var total = 0;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        var v = localStorage.getItem(k) || '';
        total += (k.length + v.length) * 2; // localStorage stores UTF-16
      }
    } catch (e) { /* storage blocked: report 0 */ }
    return total;
  }

  /* Compress a photo on-device before storing. Never keeps the raw file:
     max 1280px on the longest side, JPEG quality 0.8. */
  function compressPhoto(file) {
    return new Promise(function (resolve, reject) {
      function finish(source, w, h) {
        try {
          var maxSide = 1280;
          var scale = Math.min(1, maxSide / Math.max(w, h));
          var cw = Math.max(1, Math.round(w * scale));
          var ch = Math.max(1, Math.round(h * scale));
          var canvas = document.createElement('canvas');
          canvas.width = cw;
          canvas.height = ch;
          canvas.getContext('2d').drawImage(source, 0, 0, cw, ch);
          if (source.close) source.close();
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } catch (e) {
          reject(e);
        }
      }
      function fallback() {
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () {
          URL.revokeObjectURL(url);
          finish(img, img.naturalWidth, img.naturalHeight);
        };
        img.onerror = function () {
          URL.revokeObjectURL(url);
          reject(new Error('Could not read that image.'));
        };
        img.src = url;
      }
      if (window.createImageBitmap) {
        window.createImageBitmap(file, { imageOrientation: 'from-image' }).then(
          function (bmp) { finish(bmp, bmp.width, bmp.height); },
          fallback
        );
      } else {
        fallback();
      }
    });
  }

  var inventory = loadInventory();
  var invView = 'list'; // list | form | detail | report
  var invFormId = null; // id being edited, or null for a new item
  var invDetailId = null;
  var invQuery = '';
  var invDraft = null;
  var invFormError = '';

  function blankInvDraft() {
    return {
      id: null, name: '', category: 'appliance', room: '',
      purchaseDate: '', price: '', serial: '', warrantyExpires: '',
      notes: '', photo: null, receiptPhoto: null
    };
  }

  function invTotals() {
    var total = 0;
    for (var i = 0; i < inventory.length; i++) total += Number(inventory[i].price) || 0;
    return { total: total, count: inventory.length };
  }

  function invFiltered() {
    var q = invQuery.trim().toLowerCase();
    if (!q) return inventory.slice();
    return inventory.filter(function (it) {
      var hay = [it.name, catLabel(it.category), it.room, it.serial].join(' ').toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  function invCard(it) {
    var thumb = it.photo
      ? '<img class="inv-thumb" src="' + it.photo + '" alt="">'
      : '<span class="inv-thumb inv-thumb-empty">No photo</span>';
    return '<button class="inv-card" data-inv-open="' + esc(it.id) + '">' + thumb +
      '<span class="inv-card-body"><span class="inv-card-name">' + esc(it.name || 'Unnamed item') + '</span>' +
      '<span class="inv-card-meta">' + esc(catLabel(it.category)) +
      (it.room ? ' &middot; ' + esc(it.room) : '') + '</span></span>' +
      '<span class="inv-card-price">' + fmtMoney(it.price) + '</span></button>';
  }

  function invResultsHTML() {
    var items = invFiltered();
    if (!items.length) {
      return '<div class="empty">' +
        (inventory.length ? 'No items match your search.' : 'No items yet. Add your first item so an insurance claim is never a guessing game.') +
        '</div>';
    }
    return items.map(invCard).join('');
  }

  function renderInventoryList() {
    var t = invTotals();
    var usage = storageUsageBytes();
    var html = '<div class="inv-head"><div>' +
      '<div class="inv-total">Your inventory: ' + fmtMoney(t.total) + '</div>' +
      '<div class="inv-sub">' + t.count + (t.count === 1 ? ' item' : ' items') +
      ' documented &middot; ' + fmtMB(usage) + ' stored on this device</div></div>' +
      '<span class="premium-badge">Premium</span></div>';
    if (usage >= INV_WARN_BYTES) {
      html += '<div class="inv-warn">Storage is getting full (' + fmtMB(usage) +
        ' of about 5 MB). If saving fails, remove old receipt photos to free space.</div>';
    }
    html += '<div class="inv-actions no-print">' +
      '<button class="btn btn-primary" id="inv-add">Add an item</button>' +
      '<button class="btn-sub" id="inv-report"' + (inventory.length ? '' : ' disabled style="opacity:0.4"') + '>Claim report</button>' +
      '</div>';
    html += '<input class="inv-search no-print" id="inv-search" type="search" autocomplete="off"' +
      ' placeholder="Search name, category, room, serial" value="' + esc(invQuery) + '">';
    html += '<div id="inv-results">' + invResultsHTML() + '</div>';
    html += '<div class="footer-note">Item photos stay on this device. Nothing is uploaded.</div>';
    return html;
  }

  function photoPicker(key, dataUrl, hint) {
    var preview = dataUrl
      ? '<div class="photo-preview"><img src="' + dataUrl + '" alt="Photo preview">' +
        '<button class="btn-sub photo-remove" data-photo-remove="' + key + '">Remove</button></div>'
      : '';
    return '<div class="photo-picker">' + preview +
      '<label class="btn-sub photo-label">' + (dataUrl ? 'Replace photo' : 'Add photo') +
      '<input type="file" id="file-' + key + '" accept="image/*" capture="environment" hidden></label>' +
      '<div class="photo-hint">' + hint + ' Photos are compressed on this device before saving.</div></div>';
  }

  function renderInventoryForm() {
    var d = invDraft;
    var isEdit = !!invFormId;
    var html = '<div class="inv-form-head no-print"><button class="btn-link" id="inv-back">&larr; Back</button></div>';
    html += '<h2 class="inv-title">' + (isEdit ? 'Edit item' : 'Add an item') + '</h2>';
    if (invFormError) html += '<div class="inv-error">' + esc(invFormError) + '</div>';
    html += '<label class="field"><span>Item name *</span>' +
      '<input id="f-name" type="text" maxlength="80" value="' + esc(d.name) + '" placeholder="e.g. Samsung 65 inch TV"></label>';
    html += '<div class="field"><span>Category</span><div class="seg-row">' +
      INV_CATEGORIES.map(function (c) {
        return '<button class="seg' + (d.category === c.v ? ' selected' : '') + '" data-cat="' + c.v + '">' + c.t + '</button>';
      }).join('') + '</div></div>';
    html += '<label class="field"><span>Room</span>' +
      '<input id="f-room" type="text" list="inv-rooms" maxlength="40" value="' + esc(d.room) + '" placeholder="e.g. Living room">' +
      '<datalist id="inv-rooms">' + INV_ROOMS.map(function (r) { return '<option value="' + esc(r) + '">'; }).join('') + '</datalist></label>';
    html += '<div class="field-row">' +
      '<label class="field"><span>Purchase date</span><input id="f-date" type="date" value="' + esc(d.purchaseDate) + '"></label>' +
      '<label class="field"><span>Price paid</span><input id="f-price" type="number" inputmode="decimal" min="0" step="0.01" value="' + esc(d.price) + '" placeholder="0.00"></label></div>';
    html += '<label class="field"><span>Serial number</span>' +
      '<input id="f-serial" type="text" maxlength="60" value="' + esc(d.serial) + '" placeholder="Usually on the back or bottom"></label>';
    html += '<label class="field"><span>Warranty expires (optional)</span>' +
      '<input id="f-warranty" type="date" value="' + esc(d.warrantyExpires) + '"></label>';
    html += '<div class="field"><span>Item photo</span>' +
      photoPicker('photo', d.photo, 'Take or choose a photo of the item.') + '</div>';
    html += '<div class="field"><span>Receipt photo (optional)</span>' +
      photoPicker('receiptPhoto', d.receiptPhoto, 'Snap the receipt as proof of purchase.') + '</div>';
    html += '<label class="field"><span>Notes</span>' +
      '<textarea id="f-notes" rows="3" maxlength="500" placeholder="Model number, where you bought it, anything an adjuster should know">' + esc(d.notes) + '</textarea></label>';
    html += '<button class="btn btn-primary no-print" id="inv-save">' + (isEdit ? 'Save changes' : 'Save item') + '</button>';
    return html;
  }

  function invDetailRow(label, value) {
    return '<div class="toggle-row"><span>' + esc(label) + '</span><span style="text-align:right;max-width:60%">' + esc(value) + '</span></div>';
  }

  function invDate(isoDay) {
    if (!isoDay) return 'Not set';
    return new Date(isoDay + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function renderInventoryDetail() {
    var it = invFind(invDetailId);
    if (!it) { invView = 'list'; return renderInventoryList(); }
    var html = '<div class="inv-form-head no-print"><button class="btn-link" id="inv-back">&larr; Back to inventory</button></div>';
    html += '<h2 class="inv-title">' + esc(it.name || 'Unnamed item') + '</h2>';
    if (it.photo) html += '<img class="inv-detail-photo" src="' + it.photo + '" alt="' + esc(it.name || 'Item photo') + '">';
    html += '<div class="inv-detail-rows">' +
      invDetailRow('Category', catLabel(it.category)) +
      invDetailRow('Room', it.room || 'Not set') +
      invDetailRow('Price paid', fmtMoney(it.price)) +
      invDetailRow('Purchase date', invDate(it.purchaseDate)) +
      invDetailRow('Serial number', it.serial || 'Not set') +
      invDetailRow('Warranty expires', invDate(it.warrantyExpires)) +
      '</div>';
    if (it.notes) html += '<div class="field"><span>Notes</span><p class="inv-notes">' + esc(it.notes) + '</p></div>';
    if (it.receiptPhoto) html += '<div class="field"><span>Receipt</span><img class="inv-detail-photo inv-receipt" src="' + it.receiptPhoto + '" alt="Receipt"></div>';
    html += '<div class="inv-detail-actions no-print">' +
      '<button class="btn btn-primary" id="inv-edit">Edit</button>' +
      '<button class="btn btn-secondary" id="inv-delete">Delete</button></div>';
    return html;
  }

  function renderInventoryReport() {
    var t = invTotals();
    var dateLine = new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    var html = '<div class="inv-form-head no-print"><button class="btn-link" id="inv-back">&larr; Back</button>' +
      '<button class="btn-sub" id="inv-print" style="flex:0 0 auto;padding:10px 18px">Print</button></div>';
    html += '<div class="report"><h2>Home Inventory Claim Report</h2>' +
      '<p class="report-meta">Generated on ' + esc(dateLine) + ' by HomeKeeper. Keep this report with your insurance policy.</p>' +
      '<p class="report-total">Total documented value: ' + fmtMoney(t.total) + ' across ' +
      t.count + (t.count === 1 ? ' item' : ' items') + '</p>';
    html += inventory.map(function (it) {
      var thumb = it.photo ? '<img class="report-thumb" src="' + it.photo + '" alt="">' : '';
      var facts = '<span>Paid ' + fmtMoney(it.price) + '</span>';
      if (it.purchaseDate) facts += '<span>Bought ' + esc(it.purchaseDate) + '</span>';
      if (it.serial) facts += '<span>SN ' + esc(it.serial) + '</span>';
      return '<div class="report-item">' + thumb +
        '<div class="report-item-body"><div class="report-item-name">' + esc(it.name || 'Unnamed item') + '</div>' +
        '<div class="report-item-meta">' + esc(catLabel(it.category) + (it.room ? ' - ' + it.room : '')) + '</div>' +
        '<div class="report-item-facts">' + facts + '</div></div></div>';
    }).join('');
    html += '</div>';
    return html;
  }

  function renderInventoryTab() {
    if (invView === 'form') return renderInventoryForm();
    if (invView === 'detail') return renderInventoryDetail();
    if (invView === 'report') return renderInventoryReport();
    return renderInventoryList();
  }

  function readFormIntoDraft() {
    var v = function (id) {
      var el = document.getElementById(id);
      return el ? el.value.trim() : '';
    };
    invDraft.name = v('f-name');
    invDraft.room = v('f-room');
    invDraft.purchaseDate = v('f-date');
    invDraft.price = v('f-price');
    invDraft.serial = v('f-serial');
    invDraft.warrantyExpires = v('f-warranty');
    invDraft.notes = v('f-notes');
  }

  function saveInvForm() {
    readFormIntoDraft();
    if (!invDraft.name) {
      invFormError = 'Give the item a name so you can find it later.';
      renderMain();
      return;
    }
    invFormError = '';
    var item;
    if (invFormId) {
      item = invFind(invFormId);
      if (!item) { invView = 'list'; renderMain(); return; }
      Object.keys(invDraft).forEach(function (k) { item[k] = invDraft[k]; });
    } else {
      // NB: invDraft.id is null for new items, so generate the id AFTER
      // merging the draft, otherwise the null would clobber it.
      item = Object.assign({}, invDraft, { id: invNewId(), createdAt: new Date().toISOString() });
      inventory.unshift(item);
    }
    if (!saveInventory()) {
      if (!invFormId) inventory.shift(); // roll back the optimistic add
      invFormError = 'Could not save. This device is out of storage. Try removing a receipt photo and saving again.';
      renderMain();
      return;
    }
    invDraft = null;
    invFormId = null;
    invDetailId = item.id;
    invView = 'detail';
    renderMain();
  }

  function wireInventory() {
    var b;

    b = document.getElementById('inv-add');
    if (b) b.addEventListener('click', function () {
      invDraft = blankInvDraft();
      invFormId = null;
      invFormError = '';
      invView = 'form';
      renderMain();
    });

    b = document.getElementById('inv-report');
    if (b) b.addEventListener('click', function () {
      invView = 'report';
      renderMain();
    });

    b = document.getElementById('inv-print');
    if (b) b.addEventListener('click', function () { window.print(); });

    b = document.getElementById('inv-back');
    if (b) b.addEventListener('click', function () {
      invDraft = null;
      invFormId = null;
      invFormError = '';
      invView = 'list';
      renderMain();
    });

    var search = document.getElementById('inv-search');
    if (search) search.addEventListener('input', function () {
      invQuery = search.value;
      var results = document.getElementById('inv-results');
      if (results) {
        results.innerHTML = invResultsHTML();
        wireInvCards(results);
      }
    });

    wireInvCards(view);

    // form fields write into the draft without re-rendering (keeps focus)
    ['f-name', 'f-room', 'f-date', 'f-price', 'f-serial', 'f-warranty', 'f-notes'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', readFormIntoDraft);
    });

    view.querySelectorAll('[data-cat]').forEach(function (el) {
      el.addEventListener('click', function () {
        readFormIntoDraft();
        invDraft.category = el.getAttribute('data-cat');
        invFormError = '';
        renderMain();
      });
    });

    ['photo', 'receiptPhoto'].forEach(function (key) {
      var input = document.getElementById('file-' + key);
      if (input) input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (!file) return;
        readFormIntoDraft();
        compressPhoto(file).then(function (dataUrl) {
          invDraft[key] = dataUrl;
          invFormError = '';
          renderMain();
        }).catch(function () {
          invFormError = 'That photo could not be read. Try a different image.';
          renderMain();
        });
        input.value = '';
      });
    });

    view.querySelectorAll('[data-photo-remove]').forEach(function (el) {
      el.addEventListener('click', function () {
        readFormIntoDraft();
        invDraft[el.getAttribute('data-photo-remove')] = null;
        renderMain();
      });
    });

    b = document.getElementById('inv-save');
    if (b) b.addEventListener('click', saveInvForm);

    b = document.getElementById('inv-edit');
    if (b) b.addEventListener('click', function () {
      var it = invFind(invDetailId);
      if (!it) return;
      invDraft = Object.assign(blankInvDraft(), JSON.parse(JSON.stringify(it)));
      invFormId = it.id;
      invFormError = '';
      invView = 'form';
      renderMain();
    });

    b = document.getElementById('inv-delete');
    if (b) b.addEventListener('click', function () {
      var it = invFind(invDetailId);
      if (!it) return;
      if (confirm('Delete "' + (it.name || 'this item') + '"? This cannot be undone.')) {
        inventory = inventory.filter(function (x) { return x.id !== it.id; });
        saveInventory();
        invDetailId = null;
        invView = 'list';
        renderMain();
      }
    });
  }

  function wireInvCards(root) {
    root.querySelectorAll('[data-inv-open]').forEach(function (el) {
      el.addEventListener('click', function () {
        invDetailId = el.getAttribute('data-inv-open');
        invDraft = null;
        invFormId = null;
        invView = 'detail';
        renderMain();
      });
    });
  }

  /* ---------- main app ---------- */

  function updateBadge() {
    var buckets = HMC.bucketTasks(state.tasks);
    var attention = buckets.overdue.length +
      buckets.dueNow.filter(function (t) { return HMC.daysUntil(HMC.effectiveDue(t, new Date()).toISOString()) <= 0; }).length;
    if (attention > 0) {
      badge.textContent = attention === 1 ? '1 needs attention' : attention + ' need attention';
      badge.classList.remove('quiet');
    } else {
      badge.textContent = 'All clear';
      badge.classList.add('quiet');
    }
  }

  function taskCard(t, bucket) {
    var dl = dueLabel(t);
    var steps = t.howTo.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    return '<div class="task-card is-' + bucket + '" data-card="' + esc(t.id) + '">' +
      '<p class="task-title">' + esc(t.title) + '</p>' +
      '<p class="task-meta">' + esc(t.frequencyLabel) + ' &middot; <span class="' + dl.cls + '">' + dl.text + '</span></p>' +
      '<details><summary>How to do it</summary><ol class="howto">' + steps + '</ol></details>' +
      '<button class="btn btn-done" data-done="' + esc(t.id) + '">Mark done</button>' +
      '<div class="task-sub-actions">' +
        '<button class="btn-sub" data-snooze="' + esc(t.id) + '">Snooze</button>' +
        '<button class="btn-sub" data-skip="' + esc(t.id) + '">Skip</button>' +
      '</div>' +
      '<div class="snooze-opts" data-snooze-opts="' + esc(t.id) + '" hidden>' +
        '<span class="snooze-label">Remind me in</span>' +
        '<button class="btn-sub" data-snooze-days="7" data-id="' + esc(t.id) + '">1 week</button>' +
        '<button class="btn-sub" data-snooze-days="14" data-id="' + esc(t.id) + '">2 weeks</button>' +
        '<button class="btn-sub" data-snooze-days="30" data-id="' + esc(t.id) + '">1 month</button>' +
      '</div>' +
      '</div>';
  }

  function renderTasksTab() {
    var buckets = HMC.bucketTasks(state.tasks);
    var html = '';

    html += '<div class="section-title danger">Overdue (' + buckets.overdue.length + ')</div>';
    html += buckets.overdue.length
      ? buckets.overdue.map(function (t) { return taskCard(t, 'overdue'); }).join('')
      : '<div class="empty">Nothing overdue. Nice work.</div>';

    html += '<div class="section-title warn">Due now (' + buckets.dueNow.length + ')</div>';
    html += buckets.dueNow.length
      ? buckets.dueNow.map(function (t) { return taskCard(t, 'due'); }).join('')
      : '<div class="empty">Nothing due in the next 7 days.</div>';

    html += '<div class="section-title">Upcoming (' + buckets.upcoming.length + ')</div>';
    html += buckets.upcoming.length
      ? buckets.upcoming.map(function (t) { return taskCard(t, 'upcoming'); }).join('')
      : '<div class="empty">No upcoming tasks.</div>';

    return html;
  }

  function renderHistoryTab() {
    var html = '';
    if (!state.history.length) {
      html += '<div class="empty">No completed tasks yet. Finish a task and it will show up here.</div>';
    } else {
      html += state.history.map(function (h, i) {
        var undo = i === 0
          ? '<button class="btn-undo" id="btn-undo">Undo</button>' : '';
        var verb = h.action === 'skipped' ? 'Skipped' : 'Completed';
        return '<div class="history-item"><div><div class="h-title">' + esc(h.title) + '</div>' +
          '<div class="h-date">' + verb + ' ' + esc(fmtDate(h.completedAt)) + '</div></div>' + undo + '</div>';
      }).join('');
    }
    html += '<div class="footer-note"><button class="btn-link" id="btn-restart">Edit home profile (starts over)</button></div>';
    return html;
  }

  function renderPremiumTab() {
    return '<div class="section-title">Coming soon</div>' +
      PREMIUM.map(function (p) {
        var interested = !!state.notifyInterest[p.k];
        return '<div class="premium-card"><span class="premium-badge">Premium</span>' +
          '<h3>' + esc(p.t) + '</h3><p>' + esc(p.d) + '</p>' +
          '<button class="btn-notify' + (interested ? ' done' : '') + '" data-premium="' + esc(p.k) + '"' +
          (interested ? ' disabled' : '') + '>' +
          (interested ? 'You are on the list' : 'Notify me when it launches') + '</button></div>';
      }).join('') +
      '<div class="footer-note">Premium features are not built yet. Tapping notify just saves your interest on this device.</div>';
  }

  function renderMain() {
    header.hidden = false;
    updateBadge();
    var html = '<div class="tabs no-print" role="tablist">' +
      '<button class="tab' + (activeTab === 'tasks' ? ' active' : '') + '" data-tab="tasks">Tasks</button>' +
      '<button class="tab' + (activeTab === 'history' ? ' active' : '') + '" data-tab="history">History</button>' +
      '<button class="tab' + (activeTab === 'inventory' ? ' active' : '') + '" data-tab="inventory">Inventory <span class="tab-premium">Premium</span></button>' +
      '<button class="tab' + (activeTab === 'premium' ? ' active' : '') + '" data-tab="premium">Premium</button>' +
      '</div><div id="tab-body">';
    if (activeTab === 'tasks') html += renderTasksTab();
    else if (activeTab === 'history') html += renderHistoryTab();
    else if (activeTab === 'inventory') html += renderInventoryTab();
    else html += renderPremiumTab();
    html += '</div>';
    view.innerHTML = html;

    if (activeTab === 'inventory') wireInventory();

    view.querySelectorAll('.tab').forEach(function (el) {
      el.addEventListener('click', function () {
        activeTab = el.getAttribute('data-tab');
        renderMain();
      });
    });

    view.querySelectorAll('[data-done]').forEach(function (el) {
      el.addEventListener('click', function () {
        HMC.completeTask(state, el.getAttribute('data-done'));
        saveState();
        refreshReminderModel();
        renderMain();
      });
    });

    view.querySelectorAll('[data-snooze]').forEach(function (el) {
      el.addEventListener('click', function () {
        var id = el.getAttribute('data-snooze');
        var opts = view.querySelector('[data-snooze-opts="' + id + '"]');
        if (opts) opts.hidden = !opts.hidden;
      });
    });

    view.querySelectorAll('[data-snooze-days]').forEach(function (el) {
      el.addEventListener('click', function () {
        HMC.snoozeTask(state, el.getAttribute('data-id'), parseInt(el.getAttribute('data-snooze-days'), 10));
        saveState();
        refreshReminderModel();
        renderMain();
      });
    });

    view.querySelectorAll('[data-skip]').forEach(function (el) {
      el.addEventListener('click', function () {
        var id = el.getAttribute('data-skip');
        if (confirm('Skip this task? It will come back on its normal schedule.')) {
          HMC.skipTask(state, id);
          saveState();
          refreshReminderModel();
          renderMain();
        }
      });
    });

    var undo = document.getElementById('btn-undo');
    if (undo) undo.addEventListener('click', function () {
      HMC.undoLastCompletion(state);
      saveState();
      renderMain();
    });

    view.querySelectorAll('[data-premium]').forEach(function (el) {
      el.addEventListener('click', function () {
        state.notifyInterest[el.getAttribute('data-premium')] = true;
        saveState();
        renderMain();
      });
    });

    var restart = document.getElementById('btn-restart');
    if (restart) restart.addEventListener('click', function () {
      if (confirm('Start over? This clears your home profile, tasks, and history.')) {
        try { localStorage.removeItem(STORE_KEY); } catch (e) {}
        location.reload();
      }
    });
  }

  /* ---------- boot ---------- */

  if (state.onboarded && state.profile) {
    renderMain();
  } else {
    startOnboarding();
  }

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./service-worker.js').catch(function () {});
    });
  }
})();
