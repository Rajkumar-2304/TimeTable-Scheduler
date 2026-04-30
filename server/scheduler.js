/**
 * CRT Timetable Scheduler — Genetic Algorithm Engine
 *
 * Key constraint: Lab sessions (isLab=true) are scheduled as
 * CONSECUTIVE DOUBLE-PERIOD blocks (duration=2).
 * They cannot straddle the lunch break and must fit within the same day.
 */
class TimetableScheduler {
  constructor(data, options = {}) {
    this.faculty  = data.faculty  || [];
    this.subjects = data.subjects || [];
    this.rooms    = data.rooms    || [];
    this.groups   = data.groups   || [];
    this.config   = data.config   || {};

    this.DAYS    = this.config.days || ['Monday','Tuesday','Wednesday','Thursday','Friday'];
    this.PERIODS = this.config.periodsPerDay || 6;
    this.BREAK   = (this.config.breakAfterPeriod || 3) - 1; // 0-indexed last period BEFORE lunch break

    this.POP_SIZE = options.populationSize || 60;
    this.MAX_GEN  = options.maxGenerations  || 400;
    this.MUT_RATE = options.mutationRate    || 0.15;
    this.ELITISM  = 4;

    this.PENALTY = {
      FACULTY:   20,   // faculty double-booked in same slot
      ROOM:      15,   // room double-booked in same slot
      GROUP:     20,   // student group double-booked in same slot
      NO_ROOM:   10,   // no room assigned
      LAB_BREAK: 50,   // lab session straddles lunch break
      LAB_OVERFLOW: 50 // lab session overflows end of day
    };

    this.requiredSessions = [];
  }

  // ─── Public API ──────────────────────────────────────────────
  generate() {
    this.requiredSessions = this._buildSessions();
    if (this.requiredSessions.length === 0)
      return { success: false, error: 'No sessions to schedule' };

    let population = Array.from({ length: this.POP_SIZE }, () => this._randomChromosome());
    let best = null, bestFitness = -1;

    for (let gen = 0; gen < this.MAX_GEN; gen++) {
      const evaluated = population
        .map(ch => ({ ch, fit: this._fitness(ch) }))
        .sort((a, b) => b.fit - a.fit);

      if (evaluated[0].fit > bestFitness) {
        bestFitness = evaluated[0].fit;
        best = JSON.parse(JSON.stringify(evaluated[0].ch));
      }
      if (bestFitness >= 0.999) break;

      const next = evaluated.slice(0, this.ELITISM).map(e => JSON.parse(JSON.stringify(e.ch)));
      while (next.length < this.POP_SIZE) {
        const pA = this._tournament(evaluated);
        const pB = this._tournament(evaluated);
        let child = Math.random() < 0.8 ? this._crossover(pA, pB) : JSON.parse(JSON.stringify(pA));
        child = this._mutate(child);
        next.push(child);
      }
      population = next;
    }

    return {
      success:    true,
      sessions:   best,
      fitness:    bestFitness,
      violations: this._getConflicts(best),
      stats:      { totalSessions: best.length, fitness: bestFitness }
    };
  }

  // ─── Session Building ──────────────────────────────────────────
  /**
   * For lab subjects (isLab=true):
   *   - Each session has duration=2 (two consecutive periods)
   *   - periodsPerWeek / 2 sessions are created (each is a 2-period block)
   *   e.g., periodsPerWeek=2 → 1 double-period lab session per week
   *   e.g., periodsPerWeek=4 → 2 double-period lab sessions per week
   *
   * For theory subjects (isLab=false):
   *   - Each session has duration=1
   *   - periodsPerWeek sessions are created
   */
  _buildSessions() {
    const sessions = [];
    let n = 0;
    this.groups.forEach(group => {
      (group.curriculum || []).forEach(item => {
        const sub = this.subjects.find(s => s.id === item.subjectId);
        if (!sub) return;

        const isLab      = !!sub.isLab;
        const duration   = isLab ? (+sub.labDuration || 2) : 1;
        const ppw        = item.periodsPerWeek || sub.periodsPerWeek || 3;
        // Labs: 1 entry = 1 multi-period block; theory: 1 entry = 1 single period
        const numBlocks  = isLab ? Math.max(1, Math.round(ppw / duration)) : ppw;

        for (let i = 0; i < numBlocks; i++) {
          sessions.push({
            id:        `s${n++}`,
            groupId:   group.id,
            subjectId: item.subjectId,
            facultyId: item.facultyId,
            roomId:    null,
            day:       0,
            period:    0,
            isLab,
            duration   // 2 for labs, 1 for theory
          });
        }
      });
    });
    return sessions;
  }

  // ─── Valid Lab Start Periods ──────────────────────────────────
  /**
   * A lab starting at period p occupies p TO p+duration-1.
   * INVALID if:
   *   - p+duration > PERIODS (overflows end of day)
   *   - straddles the break (p <= BREAK && p+duration-1 > BREAK)
   */
  _validLabStarts(duration) {
    const valid = [];
    for (let p = 0; p <= this.PERIODS - duration; p++) {
      if (p <= this.BREAK && p + duration - 1 > this.BREAK) continue;
      valid.push(p);
    }
    return valid;
  }

  // ─── Random Chromosome ────────────────────────────────────────
  _randomChromosome() {
    return this.requiredSessions.map(s => {
      const compatRooms = this.rooms.filter(r => s.isLab ? r.isLab : !r.isLab || true);
      const prefRooms   = s.isLab ? this.rooms.filter(r => r.isLab) : this.rooms.filter(r => !r.isLab);
      const roomPool    = prefRooms.length ? prefRooms : this.rooms;
      const room        = roomPool[Math.floor(Math.random() * roomPool.length)];

      let period;
      if (s.isLab) {
        const labStarts = this._validLabStarts(s.duration);
        period = labStarts.length ? labStarts[Math.floor(Math.random() * labStarts.length)] : 0;
      } else {
        period = Math.floor(Math.random() * this.PERIODS);
      }

      return {
        ...s,
        day:    Math.floor(Math.random() * this.DAYS.length),
        period,
        roomId: room?.id || null
      };
    });
  }

  // ─── Fitness & Violations ─────────────────────────────────────
  _fitness(ch) { return 1 / (1 + this._violations(ch)); }

  _violations(ch) {
    let v = 0;

    // Build slot map — expand labs to occupy multiple consecutive slots
    const bySlot = {};
    ch.forEach(s => {
      const slots = [];
      for (let i = 0; i < s.duration; i++) {
        if (s.period + i < this.PERIODS) slots.push([s.day, s.period + i]);
      }
      slots.forEach(([d, p]) => {
        const k = `${d}-${p}`;
        (bySlot[k] = bySlot[k] || []).push(s);
      });

      // Penalise invalid lab placement
      if (s.isLab) {
        if (s.period <= this.BREAK && s.period + s.duration - 1 > this.BREAK) v += this.PENALTY.LAB_BREAK;
        if (s.period + s.duration > this.PERIODS) v += this.PENALTY.LAB_OVERFLOW;
      }
      if (!s.roomId) v += this.PENALTY.NO_ROOM;
    });

    // Slot-level conflict checks
    Object.values(bySlot).forEach(slot => {
      const facSeen = {}, roomSeen = {}, grpSeen = {};
      slot.forEach(s => {
        if (s.facultyId) {
          if (facSeen[s.facultyId]) v += this.PENALTY.FACULTY;
          facSeen[s.facultyId] = true;
        }
        if (s.roomId) {
          if (roomSeen[s.roomId]) v += this.PENALTY.ROOM;
          roomSeen[s.roomId] = true;
        }
        if (grpSeen[s.groupId]) v += this.PENALTY.GROUP;
        grpSeen[s.groupId] = true;
      });
    });

    return v;
  }

  // ─── Tournament Selection ─────────────────────────────────────
  _tournament(evaluated, k = 4) {
    let best = null;
    for (let i = 0; i < k; i++) {
      const c = evaluated[Math.floor(Math.random() * evaluated.length)];
      if (!best || c.fit > best.fit) best = c;
    }
    return JSON.parse(JSON.stringify(best.ch));
  }

  // ─── Crossover ────────────────────────────────────────────────
  _crossover(a, b) {
    const len = a.length;
    const [s, e] = [Math.floor(Math.random() * len), Math.floor(Math.random() * len)].sort((x, y) => x - y);
    return a.map((sess, i) => (i >= s && i <= e) ? { ...b[i] } : { ...sess });
  }

  // ─── Mutation ─────────────────────────────────────────────────
  _mutate(ch) {
    return ch.map(s => {
      if (Math.random() > this.MUT_RATE) return s;
      const mut = { ...s };
      const m   = Math.random();

      if (m < 0.35) {
        // Mutate day
        mut.day = Math.floor(Math.random() * this.DAYS.length);
      } else if (m < 0.65) {
        // Mutate period — respect lab constraints
        if (s.isLab) {
          const labStarts = this._validLabStarts(s.duration);
          if (labStarts.length) mut.period = labStarts[Math.floor(Math.random() * labStarts.length)];
        } else {
          mut.period = Math.floor(Math.random() * this.PERIODS);
        }
      } else {
        // Mutate room — prefer lab rooms for lab sessions
        const preferred = s.isLab
          ? this.rooms.filter(r => r.isLab)
          : this.rooms.filter(r => !r.isLab);
        const pool = preferred.length ? preferred : this.rooms;
        if (pool.length) mut.roomId = pool[Math.floor(Math.random() * pool.length)].id;
      }
      return mut;
    });
  }

  // ─── Conflict Report ──────────────────────────────────────────
  _getConflicts(ch) {
    const conflicts = [];
    const bySlot = {};

    ch.forEach(s => {
      const slots = [];
      for (let i = 0; i < s.duration; i++) {
        if (s.period + i < this.PERIODS) slots.push([s.day, s.period + i]);
      }
      slots.forEach(([d, p]) => {
        const k = `${d}-${p}`;
        (bySlot[k] = bySlot[k] || []).push(s);
      });
    });

    Object.entries(bySlot).forEach(([key, sessions]) => {
      const [day, period] = key.split('-').map(Number);
      const fSeen = {}, rSeen = {}, gSeen = {};
      sessions.forEach(s => {
        if (s.facultyId && fSeen[s.facultyId])
          conflicts.push({ type: 'faculty', day, period, id: s.facultyId });
        if (s.facultyId) fSeen[s.facultyId] = true;

        if (s.roomId && rSeen[s.roomId])
          conflicts.push({ type: 'room', day, period, id: s.roomId });
        if (s.roomId) rSeen[s.roomId] = true;

        if (gSeen[s.groupId])
          conflicts.push({ type: 'group', day, period, id: s.groupId });
        gSeen[s.groupId] = true;
      });
    });
    return conflicts;
  }
}

module.exports = { TimetableScheduler };
