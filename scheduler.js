/**
 * CRT Timetable Scheduler - Genetic Algorithm Engine
 * Solves the constraint satisfaction problem for college timetabling
 */

class TimetableScheduler {
  constructor(data, options = {}) {
    this.faculty = data.faculty || [];
    this.subjects = data.subjects || [];
    this.rooms = data.rooms || [];
    this.groups = data.groups || [];
    this.config = data.config || {};

    this.DAYS = this.config.days || ['Monday','Tuesday','Wednesday','Thursday','Friday'];
    this.PERIODS = this.config.periodsPerDay || 6;
    this.POPULATION_SIZE = options.populationSize || 60;
    this.MAX_GENERATIONS = options.maxGenerations || 400;
    this.CROSSOVER_RATE = options.crossoverRate || 0.8;
    this.MUTATION_RATE = options.mutationRate || 0.15;
    this.ELITISM_COUNT = options.elitismCount || 4;

    // Penalty weights
    this.PENALTY = {
      FACULTY_CONFLICT: 20,
      ROOM_CONFLICT: 15,
      GROUP_CONFLICT: 20,
      FACULTY_OVERLOAD: 8,
      UNASSIGNED_ROOM: 10,
      CONSECUTIVE_PENALTY: 3,
    };

    this.onProgress = options.onProgress || null;
    this.requiredSessions = [];
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  generate() {
    this.requiredSessions = this._buildRequiredSessions();

    if (this.requiredSessions.length === 0) {
      return { success: false, error: 'No sessions to schedule. Add groups with curriculum.' };
    }

    const population = this._initPopulation();
    let bestChromosome = null;
    let bestFitness = -1;
    let stagnation = 0;

    for (let gen = 0; gen < this.MAX_GENERATIONS; gen++) {
      // Evaluate fitness
      const evaluated = population.map(ch => ({
        chromosome: ch,
        fitness: this._evaluateFitness(ch)
      }));

      // Sort by fitness descending
      evaluated.sort((a, b) => b.fitness - a.fitness);

      if (evaluated[0].fitness > bestFitness) {
        bestFitness = evaluated[0].fitness;
        bestChromosome = JSON.parse(JSON.stringify(evaluated[0].chromosome));
        stagnation = 0;
      } else {
        stagnation++;
      }

      // Report progress
      if (this.onProgress) {
        this.onProgress({
          generation: gen + 1,
          totalGenerations: this.MAX_GENERATIONS,
          bestFitness: bestFitness,
          violations: this._countViolations(bestChromosome),
          progress: Math.round(((gen + 1) / this.MAX_GENERATIONS) * 100)
        });
      }

      // Early stop if perfect
      if (bestFitness >= 0.999) break;

      // Adaptive mutation
      const mutationRate = stagnation > 30
        ? Math.min(this.MUTATION_RATE * 3, 0.5)
        : this.MUTATION_RATE;

      // Build next generation
      const nextPop = [];

      // Elitism - carry over best
      for (let i = 0; i < this.ELITISM_COUNT; i++) {
        nextPop.push(JSON.parse(JSON.stringify(evaluated[i].chromosome)));
      }

      while (nextPop.length < this.POPULATION_SIZE) {
        const parentA = this._tournamentSelect(evaluated);
        const parentB = this._tournamentSelect(evaluated);

        let child = (Math.random() < this.CROSSOVER_RATE)
          ? this._crossover(parentA, parentB)
          : JSON.parse(JSON.stringify(parentA));

        child = this._mutate(child, mutationRate);
        nextPop.push(child);
      }

      population.length = 0;
      population.push(...nextPop);
    }

    const violations = this._countViolations(bestChromosome);
    return {
      success: true,
      sessions: bestChromosome,
      fitness: bestFitness,
      violations,
      stats: this._buildStats(bestChromosome)
    };
  }

  // ─── Session Building ──────────────────────────────────────────────────────

  _buildRequiredSessions() {
    const sessions = [];
    let idCounter = 0;

    this.groups.forEach(group => {
      if (!group.curriculum) return;
      group.curriculum.forEach(item => {
        const subject = this.subjects.find(s => s.id === item.subjectId);
        if (!subject) return;

        const periodsNeeded = item.periodsPerWeek || subject.periodsPerWeek || 3;
        for (let i = 0; i < periodsNeeded; i++) {
          sessions.push({
            id: `sess_${idCounter++}`,
            groupId: group.id,
            subjectId: item.subjectId,
            facultyId: item.facultyId,
            roomId: null,
            day: 0,
            period: 0,
            isLab: subject.isLab || false
          });
        }
      });
    });

    return sessions;
  }

  // ─── Population Initialization ─────────────────────────────────────────────

  _initPopulation() {
    const pop = [];
    for (let i = 0; i < this.POPULATION_SIZE; i++) {
      pop.push(this._createRandomChromosome());
    }
    return pop;
  }

  _createRandomChromosome() {
    return this.requiredSessions.map(session => {
      const availableRooms = this._getCompatibleRooms(session);
      const room = availableRooms.length > 0
        ? availableRooms[Math.floor(Math.random() * availableRooms.length)]
        : null;

      return {
        ...session,
        day: Math.floor(Math.random() * this.DAYS.length),
        period: Math.floor(Math.random() * this.PERIODS),
        roomId: room ? room.id : null
      };
    });
  }

  _getCompatibleRooms(session) {
    return this.rooms.filter(r => session.isLab ? r.isLab : !r.isLab || true);
  }

  // ─── Fitness Evaluation ────────────────────────────────────────────────────

  _evaluateFitness(chromosome) {
    const violations = this._countViolations(chromosome);
    return 1 / (1 + violations);
  }

  _countViolations(chromosome) {
    let violations = 0;
    const n = chromosome.length;

    // Build maps for quick lookup
    const bySlot = {}; // "day-period" -> list of sessions
    chromosome.forEach(sess => {
      const key = `${sess.day}-${sess.period}`;
      if (!bySlot[key]) bySlot[key] = [];
      bySlot[key].push(sess);
    });

    // Check conflicts in each time slot
    Object.values(bySlot).forEach(slotSessions => {
      const facSet = new Set();
      const roomSet = new Set();
      const groupSet = new Set();

      slotSessions.forEach(sess => {
        if (sess.facultyId) {
          if (facSet.has(sess.facultyId)) violations += this.PENALTY.FACULTY_CONFLICT;
          facSet.add(sess.facultyId);
        }
        if (sess.roomId) {
          if (roomSet.has(sess.roomId)) violations += this.PENALTY.ROOM_CONFLICT;
          roomSet.add(sess.roomId);
        }
        if (groupSet.has(sess.groupId)) violations += this.PENALTY.GROUP_CONFLICT;
        groupSet.add(sess.groupId);

        if (!sess.roomId) violations += this.PENALTY.UNASSIGNED_ROOM;
      });
    });

    // Faculty daily overload (max 4 periods/day by default)
    const facultyDayLoad = {};
    chromosome.forEach(sess => {
      if (!sess.facultyId) return;
      const key = `${sess.facultyId}-${sess.day}`;
      facultyDayLoad[key] = (facultyDayLoad[key] || 0) + 1;
    });
    Object.values(facultyDayLoad).forEach(load => {
      const facultyData = this.faculty.find(f => f.id);
      const maxLoad = (facultyData && facultyData.maxPeriodsPerDay) || 4;
      if (load > maxLoad) violations += (load - maxLoad) * this.PENALTY.FACULTY_OVERLOAD;
    });

    return violations;
  }

  // ─── Selection ─────────────────────────────────────────────────────────────

  _tournamentSelect(evaluated, k = 4) {
    let best = null;
    for (let i = 0; i < k; i++) {
      const idx = Math.floor(Math.random() * evaluated.length);
      const candidate = evaluated[idx];
      if (!best || candidate.fitness > best.fitness) {
        best = candidate;
      }
    }
    return JSON.parse(JSON.stringify(best.chromosome));
  }

  // ─── Crossover ─────────────────────────────────────────────────────────────

  _crossover(parentA, parentB) {
    const len = parentA.length;
    const point1 = Math.floor(Math.random() * len);
    const point2 = Math.floor(Math.random() * len);
    const start = Math.min(point1, point2);
    const end = Math.max(point1, point2);

    const child = parentA.map((sess, i) => {
      if (i >= start && i <= end) {
        return { ...parentB[i] };
      }
      return { ...sess };
    });

    return child;
  }

  // ─── Mutation ──────────────────────────────────────────────────────────────

  _mutate(chromosome, rate) {
    return chromosome.map(sess => {
      if (Math.random() > rate) return sess;

      const mutationType = Math.random();
      const mutated = { ...sess };

      if (mutationType < 0.35) {
        mutated.day = Math.floor(Math.random() * this.DAYS.length);
      } else if (mutationType < 0.65) {
        mutated.period = Math.floor(Math.random() * this.PERIODS);
      } else if (mutationType < 0.85) {
        const compatible = this._getCompatibleRooms(sess);
        if (compatible.length > 0) {
          mutated.roomId = compatible[Math.floor(Math.random() * compatible.length)].id;
        }
      } else {
        mutated.day = Math.floor(Math.random() * this.DAYS.length);
        mutated.period = Math.floor(Math.random() * this.PERIODS);
      }

      return mutated;
    });
  }

  // ─── Stats Builder ─────────────────────────────────────────────────────────

  _buildStats(chromosome) {
    if (!chromosome) return {};

    const totalSlots = this.DAYS.length * this.PERIODS;
    const usedSlots = new Set(chromosome.map(s => `${s.day}-${s.period}-${s.groupId}`)).size;
    const conflicts = this._getConflictDetails(chromosome);

    return {
      totalSessions: chromosome.length,
      daysUsed: this.DAYS.length,
      periodsPerDay: this.PERIODS,
      totalSlots,
      usedSlots,
      conflicts,
      utilizationPct: Math.round((usedSlots / totalSlots) * 100)
    };
  }

  _getConflictDetails(chromosome) {
    const conflicts = [];
    const bySlot = {};

    chromosome.forEach(sess => {
      const key = `${sess.day}-${sess.period}`;
      if (!bySlot[key]) bySlot[key] = [];
      bySlot[key].push(sess);
    });

    Object.entries(bySlot).forEach(([slot, sessions]) => {
      const [day, period] = slot.split('-').map(Number);
      const facSeen = {};
      const roomSeen = {};
      const groupSeen = {};

      sessions.forEach(sess => {
        if (sess.facultyId && facSeen[sess.facultyId]) {
          conflicts.push({ type: 'faculty', day, period, id: sess.facultyId });
        }
        if (sess.facultyId) facSeen[sess.facultyId] = true;

        if (sess.roomId && roomSeen[sess.roomId]) {
          conflicts.push({ type: 'room', day, period, id: sess.roomId });
        }
        if (sess.roomId) roomSeen[sess.roomId] = true;

        if (groupSeen[sess.groupId]) {
          conflicts.push({ type: 'group', day, period, id: sess.groupId });
        }
        groupSeen[sess.groupId] = true;
      });
    });

    return conflicts;
  }
}

// Export for use in app.js
window.TimetableScheduler = TimetableScheduler;
