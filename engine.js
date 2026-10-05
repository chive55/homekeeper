/* HomeKeeper - task engine (pure logic, no DOM).
   Safe to require() in Node for tests; in the browser it attaches to window.HMC. */

const FREQUENCY_DAYS = { monthly: 30, quarterly: 91, semiannual: 182, annual: 365 };

const FREQUENCY_LABEL = {
  monthly: 'Every month',
  quarterly: 'Every 3 months',
  semiannual: 'Every 6 months',
  annual: 'Every year'
};

/* Each template:
   id, title, frequency, months (optional preferred months 1-12),
   howTo (2-4 short steps), needs (all conditions must hold):
     systems: [keys that must be true in profile.systems]
     hvac: [allowed profile.systems.hvac values]
     homeTypes: [allowed profile.homeType values]
     climates: [allowed profile.climate values]
*/
const TEMPLATES = [
  {
    id: 'test-detectors',
    title: 'Test smoke and CO detectors',
    frequency: 'monthly',
    howTo: ['Press the test button on each detector and listen for the alarm.', 'Vacuum dust from the vents with a soft brush.', 'Replace batteries right away if the sound is weak.'],
    needs: { systems: ['smokeCo'] }
  },
  {
    id: 'hvac-filter',
    title: 'Check or replace the HVAC filter',
    frequency: 'monthly',
    howTo: ['Turn the system off, then slide the filter out of its slot.', 'Hold it up to a light. If you cannot see light through it, replace it.', 'Write the date on the new filter frame so you know when it went in.'],
    needs: { hvac: ['forced-air', 'heat-pump'] }
  },
  {
    id: 'clean-dishwasher-filter',
    title: 'Clean the dishwasher filter',
    frequency: 'monthly',
    howTo: ['Twist out the cylindrical filter from the dishwasher floor.', 'Rinse it under hot water and scrub with an old toothbrush.', 'Lock it back in place.'],
    needs: { systems: ['dishwasher'] }
  },
  {
    id: 'clean-washer',
    title: 'Run a washer cleaning cycle',
    frequency: 'monthly',
    howTo: ['Run the hottest, longest cycle with the washer empty.', 'Add two cups of white vinegar or a washer cleaner tablet.', 'Wipe the door seal and leave the door ajar to dry.'],
    needs: { systems: ['washerDryer'] }
  },
  {
    id: 'garage-reverse-test',
    title: 'Test the garage door auto-reverse',
    frequency: 'monthly',
    howTo: ['Place a roll of paper towels on the floor under the door.', 'Close the door with the remote. It should reverse on contact.', 'If it does not reverse, adjust the opener settings or call a pro.'],
    needs: { systems: ['garageDoor'] }
  },
  {
    id: 'irrigation-check',
    title: 'Inspect sprinkler heads for leaks and coverage',
    frequency: 'monthly',
    months: [4, 5, 6, 7, 8, 9],
    howTo: ['Run each zone and walk the line.', 'Look for heads that spray the sidewalk, sputter, or leak at the base.', 'Adjust, clean, or replace bad heads.'],
    needs: { systems: ['irrigation'] }
  },
  {
    id: 'test-gfci',
    title: 'Test GFCI outlets',
    frequency: 'quarterly',
    howTo: ['Find GFCI outlets in kitchens, baths, garage, and outdoors.', 'Press TEST. The RESET button should pop out and power should cut.', 'Press RESET to restore power. Call an electrician if one fails.'],
    needs: {}
  },
  {
    id: 'inspect-plumbing',
    title: 'Check under sinks and around toilets for leaks',
    frequency: 'quarterly',
    howTo: ['Open every sink cabinet and look for damp spots, stains, or musty smells.', 'Check toilet bases for wobble or water on the floor.', 'Tighten supply connections gently if you see slow drips.'],
    needs: {}
  },
  {
    id: 'clean-range-hood',
    title: 'Clean the range hood filter',
    frequency: 'quarterly',
    howTo: ['Slide or pop the metal filter out of the hood.', 'Soak it in hot water with dish soap and baking soda for 15 minutes.', 'Scrub, rinse, dry fully, and reinstall.'],
    needs: {}
  },
  {
    id: 'deep-clean-oven',
    title: 'Deep clean the oven',
    frequency: 'quarterly',
    howTo: ['Remove racks and soak them in hot soapy water.', 'Wipe the interior with a baking soda paste, then vinegar.', 'Rinse clean and dry before the next use.'],
    needs: {}
  },
  {
    id: 'pest-check',
    title: 'Inspect for pests and seal entry points',
    frequency: 'quarterly',
    howTo: ['Walk the exterior and look for gaps around pipes, vents, and the foundation.', 'Check attic and basement corners for droppings or nests.', 'Seal small gaps with caulk or steel wool.'],
    needs: {}
  },
  {
    id: 'test-sump-pump',
    title: 'Test the sump pump',
    frequency: 'quarterly',
    howTo: ['Pour a bucket of water into the sump pit.', 'The pump should kick on and drain the pit quickly.', 'If it hums without pumping, clean the intake or call a pro.'],
    needs: { systems: ['sumpPump'] }
  },
  {
    id: 'condensate-drain',
    title: 'Flush the AC condensate drain line',
    frequency: 'quarterly',
    howTo: ['Find the white PVC drain pipe near the indoor air handler.', 'Pour one cup of white vinegar into the access opening.', 'Wait 30 minutes. A clogged line can flood the drain pan.'],
    needs: { hvac: ['forced-air', 'heat-pump'] }
  },
  {
    id: 'clean-vents',
    title: 'Vacuum supply vents and return grilles',
    frequency: 'quarterly',
    howTo: ['Remove vent covers and vacuum inside the duct opening.', 'Wash metal covers with soap and water, then dry.', 'Replace covers and make sure furniture is not blocking airflow.'],
    needs: { hvac: ['forced-air', 'heat-pump', 'boiler'] }
  },
  {
    id: 'fertilize-lawn',
    title: 'Fertilize the lawn',
    frequency: 'quarterly',
    howTo: ['Mow first, then apply fertilizer with a broadcast spreader.', 'Follow the bag rate for your grass type and season.', 'Water it in unless rain is coming within a day.'],
    needs: { systems: ['lawn'] }
  },
  {
    id: 'rotate-mattress',
    title: 'Rotate the mattress',
    frequency: 'quarterly',
    howTo: ['Strip the bed, then rotate the mattress 180 degrees.', 'If it is double-sided, flip it instead every other time.', 'Vacuum the bed base while it is exposed.'],
    needs: {}
  },
  {
    id: 'check-extinguisher',
    title: 'Inspect the fire extinguisher',
    frequency: 'semiannual',
    howTo: ['Check that the pressure gauge needle is in the green zone.', 'Confirm the pin and tamper seal are intact.', 'Turn a dry-chemical unit upside down and tap it to loosen powder.'],
    needs: {}
  },
  {
    id: 'clean-bath-fans',
    title: 'Clean bathroom exhaust fans',
    frequency: 'semiannual',
    howTo: ['Turn off the breaker, then pop off the fan cover.', 'Vacuum dust from the fan blades and motor housing.', 'Wash the cover, dry it, and snap it back on.'],
    needs: {}
  },
  {
    id: 'vacuum-fridge-coils',
    title: 'Vacuum the refrigerator coils',
    frequency: 'semiannual',
    howTo: ['Unplug the fridge or flip its breaker.', 'Find the coils (behind the kick plate or on the back) and vacuum them.', 'Plug back in and confirm it starts cooling.'],
    needs: {}
  },
  {
    id: 'descale-showerheads',
    title: 'Descale showerheads',
    frequency: 'semiannual',
    howTo: ['Fill a sturdy bag with white vinegar and tie it over the showerhead.', 'Leave it for one hour, longer for heavy buildup.', 'Remove, rinse, and run hot water for a minute.'],
    needs: {}
  },
  {
    id: 'inspect-washer-hoses',
    title: 'Inspect washer hoses for bulges and cracks',
    frequency: 'semiannual',
    howTo: ['Pull the washer out enough to see both hoses.', 'Look for bulges, cracks, fraying, or damp spots at the fittings.', 'Replace both hoses if either looks worn. Braided steel lasts longest.'],
    needs: { systems: ['washerDryer'] }
  },
  {
    id: 'clean-dryer-vent',
    title: 'Clean the dryer vent duct',
    frequency: 'semiannual',
    howTo: ['Unplug the dryer and pull it away from the wall.', 'Detach the vent hose and vacuum lint from the hose and wall duct.', 'Check the outside vent flap opens freely, then reconnect.'],
    needs: { systems: ['washerDryer'] }
  },
  {
    id: 'lubricate-garage',
    title: 'Lubricate the garage door rollers and hinges',
    frequency: 'semiannual',
    howTo: ['Close the door and wipe grime from the tracks, rollers, and hinges.', 'Apply silicone or garage-door lubricant to rollers, hinges, and springs.', 'Open and close the door twice to work it in. Do not grease the tracks.'],
    needs: { systems: ['garageDoor'] }
  },
  {
    id: 'check-attic',
    title: 'Peek into the attic for leaks, pests, and insulation gaps',
    frequency: 'semiannual',
    months: [4, 10],
    howTo: ['Bring a bright flashlight and step only on joists or the attic floor.', 'Look for water stains on the roof deck, droppings, and thin insulation spots.', 'Note anything odd with a photo and date for your records.'],
    needs: { homeTypes: ['house', 'townhouse'] }
  },
  {
    id: 'clean-gutters',
    title: 'Clean gutters and downspouts',
    frequency: 'semiannual',
    months: [4, 10],
    howTo: ['Scoop leaves and debris from the gutters with a trowel or gloved hands.', 'Flush with a hose and watch that downspouts drain away from the house.', 'Reattach any sagging sections.'],
    needs: { systems: ['gutters'] }
  },
  {
    id: 'inspect-roof',
    title: 'Do a ground-level roof inspection',
    frequency: 'semiannual',
    months: [4, 10],
    howTo: ['Walk around the house and scan the roof with binoculars.', 'Look for missing, curled, or cracked shingles and damaged flashing.', 'Call a roofer for anything you cannot see clearly from the ground.'],
    needs: { homeTypes: ['house', 'townhouse'] }
  },
  {
    id: 'toilet-flapper-test',
    title: 'Test toilets for silent leaks',
    frequency: 'annual',
    howTo: ['Add a few drops of food coloring to each toilet tank.', 'Wait 20 minutes without flushing.', 'Color in the bowl means the flapper leaks and should be replaced.'],
    needs: {}
  },
  {
    id: 'clean-window-tracks',
    title: 'Clean window tracks and weep holes',
    frequency: 'annual',
    months: [4],
    howTo: ['Vacuum loose dirt from every window track.', 'Scrub tracks with soapy water and an old toothbrush.', 'Clear the small weep holes on the outside frame so water can drain.'],
    needs: {}
  },
  {
    id: 'check-water-pressure',
    title: 'Check home water pressure',
    frequency: 'annual',
    howTo: ['Screw a pressure gauge onto an outdoor hose bib.', 'Turn the water on full and read the gauge. 40 to 80 psi is normal.', 'If it is high, consider a pressure-reducing valve to protect pipes.'],
    needs: {}
  },
  {
    id: 'flush-water-heater',
    title: 'Flush sediment from the water heater',
    frequency: 'annual',
    howTo: ['Turn off power or gas to the heater and let the water cool.', 'Attach a hose to the drain valve and run it to a safe drain.', 'Drain several gallons until the water runs clear, then close up.'],
    needs: { systems: ['waterHeater'] }
  },
  {
    id: 'furnace-tuneup',
    title: 'Schedule a professional furnace tune-up',
    frequency: 'annual',
    months: [9],
    howTo: ['Book a licensed HVAC tech before heating season.', 'Ask for a burner, heat exchanger, and safety controls check.', 'Replace the filter after the visit if the tech did not.'],
    needs: { hvac: ['forced-air', 'boiler'] }
  },
  {
    id: 'ac-tuneup',
    title: 'Schedule a professional AC tune-up',
    frequency: 'annual',
    months: [4],
    howTo: ['Book a licensed HVAC tech before cooling season.', 'Ask for a refrigerant, coil, and drain line check.', 'Clear leaves and debris from around the outdoor unit first.'],
    needs: { hvac: ['forced-air', 'heat-pump'] }
  },
  {
    id: 'check-caulking',
    title: 'Inspect exterior caulk around windows and doors',
    frequency: 'annual',
    months: [5],
    howTo: ['Walk the exterior and look for cracked or missing caulk beads.', 'Scrape out failed caulk and apply fresh exterior-grade caulk.', 'Smooth the bead and let it cure before rain.'],
    needs: { homeTypes: ['house', 'townhouse'] }
  },
  {
    id: 'inspect-foundation',
    title: 'Walk the foundation for new cracks',
    frequency: 'annual',
    months: [5],
    howTo: ['Circle the house and look closely at the visible foundation.', 'Hairline cracks are common. Mark anything wider than a pencil with tape.', 'Call a structural pro if a crack grows or lets water in.'],
    needs: { homeTypes: ['house', 'townhouse'] }
  },
  {
    id: 'trim-branches',
    title: 'Trim branches touching the roof or siding',
    frequency: 'annual',
    months: [6],
    howTo: ['Look for limbs rubbing the roof, siding, or power lines.', 'Cut branches back at least 6 feet from the roof edge.', 'Hire an arborist for anything near power lines or too high to reach safely.'],
    needs: { homeTypes: ['house', 'townhouse'] }
  },
  {
    id: 'inspect-deck',
    title: 'Check the deck for rot and loose fasteners',
    frequency: 'annual',
    months: [4],
    howTo: ['Probe boards and posts with a screwdriver. Soft spots mean rot.', 'Tighten loose screws and check railings for wobble.', 'Plan a reseal if water no longer beads on the surface.'],
    needs: { homeTypes: ['house', 'townhouse'] }
  },
  {
    id: 'winterize-pipes',
    title: 'Winterize outdoor faucets and exposed pipes',
    frequency: 'annual',
    months: [10],
    howTo: ['Shut off interior valves to outdoor spigots and drain the lines.', 'Remove hoses and install insulated faucet covers.', 'Wrap exposed pipes in unheated areas with foam sleeves.'],
    needs: { climates: ['cold', 'temperate'] }
  },
  {
    id: 'storm-prep',
    title: 'Check storm shutters and emergency supplies',
    frequency: 'annual',
    months: [5],
    howTo: ['Test-fit storm shutters or panels and replace missing fasteners.', 'Check flashlights, batteries, and the first aid kit.', 'Confirm your emergency water and documents are in one grab-ready spot.'],
    needs: { climates: ['coastal'] }
  },
  {
    id: 'inspect-siding',
    title: 'Inspect siding and exterior paint',
    frequency: 'annual',
    months: [5],
    howTo: ['Walk the perimeter and look for cracked, warped, or rotting siding.', 'Note peeling or blistered paint, which lets moisture into the wood.', 'Caulk small gaps now; plan repainting before bare wood is exposed.'],
    needs: { homeTypes: ['house', 'townhouse'] }
  },
  {
    id: 'service-chimney',
    title: 'Get the chimney inspected and swept',
    frequency: 'annual',
    months: [9],
    howTo: ['Hire a certified chimney sweep before the first fire of the season.', 'Ask about creosote buildup and the damper seal.', 'Burn only seasoned hardwood to slow future buildup.'],
    needs: { systems: ['fireplace'] }
  }
];

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
  return h;
}

function startOfDay(d) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function isApplicable(t, profile) {
  const n = t.needs || {};
  const sys = profile.systems || {};
  if (n.systems) {
    for (const k of n.systems) if (!sys[k]) return false;
  }
  if (n.hvac && !n.hvac.includes(sys.hvac)) return false;
  if (n.homeTypes && !n.homeTypes.includes(profile.homeType)) return false;
  if (n.climates && !n.climates.includes(profile.climate)) return false;
  return true;
}

/* First due date for a new task: preferred month if given, else staggered
   across one period so everything is not due on the same day. */
function initialDue(template, now) {
  const today = startOfDay(now || new Date());
  if (template.months && template.months.length) {
    let best = null;
    for (let y = today.getFullYear(); y <= today.getFullYear() + 1; y++) {
      for (const m of template.months) {
        const cand = new Date(y, m - 1, 15);
        if (cand >= today && (!best || cand < best)) best = cand;
      }
    }
    return best;
  }
  const period = FREQUENCY_DAYS[template.frequency];
  const offset = 1 + (hashStr(template.id) % period);
  const due = new Date(today);
  due.setDate(due.getDate() + offset);
  return due;
}

function tasksForProfile(profile, now) {
  const at = now || new Date();
  return TEMPLATES
    .filter(t => isApplicable(t, profile))
    .map(t => ({
      id: 'task-' + t.id,
      templateId: t.id,
      title: t.title,
      howTo: t.howTo.slice(),
      frequency: t.frequency,
      frequencyLabel: FREQUENCY_LABEL[t.frequency],
      nextDueAt: initialDue(t, at).toISOString(),
      lastCompletedAt: null,
      createdAt: new Date(at).toISOString(),
      /* Snoozing pushes visibility out without changing the schedule. */
      snoozedUntil: null,
      /* Reminder-ready: per-task notification preferences. The actual
         scheduling hook lives in app.js (see scheduleReminder stub). */
      notify: { enabled: true, daysBefore: 1, channel: 'push' }
    }));
}

/* The date the user actually sees: snoozing delays visibility, never the schedule. */
function effectiveDue(task, now) {
  const due = startOfDay(new Date(task.nextDueAt));
  if (task.snoozedUntil) {
    const sn = startOfDay(new Date(task.snoozedUntil));
    if (sn > due) return sn;
  }
  return due;
}

/* A snooze is "active" while its date is today or in the future. While active,
   the card shows a Snoozed tag; bucketing uses max(nextDueAt, snoozedUntil)
   so a snooze never makes a task appear due sooner. */
function isSnoozed(task, now) {
  if (!task.snoozedUntil) return false;
  var today = startOfDay(now || new Date());
  return startOfDay(new Date(task.snoozedUntil)) >= today;
}

function rollForwardDate(fromIso, frequency, now) {
  const base = startOfDay(now || new Date());
  const next = new Date(base);
  next.setDate(next.getDate() + FREQUENCY_DAYS[frequency]);
  return next.toISOString();
}

function daysUntil(iso, now) {
  const a = startOfDay(now || new Date());
  const b = startOfDay(new Date(iso));
  return Math.round((b - a) / 86400000);
}

function uid() {
  return 'h' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}

function completeTask(state, taskId, now) {
  const at = now || new Date();
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return null;
  const entry = {
    id: uid(),
    taskId: task.id,
    title: task.title,
    completedAt: new Date(at).toISOString(),
    prevDueAt: task.nextDueAt,
    action: 'done'
  };
  task.nextDueAt = rollForwardDate(task.nextDueAt, task.frequency, at);
  task.lastCompletedAt = entry.completedAt;
  task.snoozedUntil = null;
  state.history.unshift(entry);
  return entry;
}

/* Skipping logs the pass and keeps the normal schedule rolling. */
function skipTask(state, taskId, now) {
  const at = now || new Date();
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return null;
  const entry = {
    id: uid(),
    taskId: task.id,
    title: task.title,
    completedAt: new Date(at).toISOString(),
    prevDueAt: task.nextDueAt,
    action: 'skipped'
  };
  task.nextDueAt = rollForwardDate(task.nextDueAt, task.frequency, at);
  task.snoozedUntil = null;
  state.history.unshift(entry);
  return entry;
}

function snoozeTask(state, taskId, days, now) {
  const at = now || new Date();
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return null;
  const until = startOfDay(at);
  until.setDate(until.getDate() + days);
  task.snoozedUntil = until.toISOString();
  return task;
}

function undoLastCompletion(state) {
  const entry = state.history[0];
  if (!entry) return false;
  const task = state.tasks.find(t => t.id === entry.taskId);
  if (task) {
    task.nextDueAt = entry.prevDueAt;
    task.lastCompletedAt = null;
  }
  state.history.shift();
  return true;
}

function bucketTasks(tasks, now) {
  const at = now || new Date();
  const overdue = [], dueNow = [], upcoming = [];
  for (const t of tasks) {
    const d = daysUntil(effectiveDue(t, at).toISOString(), at);
    if (d < 0) overdue.push(t);
    else if (d <= 7) dueNow.push(t);
    else upcoming.push(t);
  }
  const byDue = (a, b) => effectiveDue(a, at) - effectiveDue(b, at);
  overdue.sort(byDue); dueNow.sort(byDue); upcoming.sort(byDue);
  return { overdue, dueNow, upcoming };
}

const api = {
  FREQUENCY_DAYS, FREQUENCY_LABEL, TEMPLATES,
  isApplicable, initialDue, tasksForProfile,
  rollForwardDate, daysUntil, effectiveDue, isSnoozed,
  completeTask, skipTask, snoozeTask,
  undoLastCompletion, bucketTasks, uid
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
} else if (typeof window !== 'undefined') {
  window.HMC = api;
}
