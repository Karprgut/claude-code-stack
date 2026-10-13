import type { GenericTool } from "./chat-providers/types";

export const chatTools: GenericTool[] = [
  {
    name: "read_file",
    description: "Read a file from the knowledge base. Path is relative to the data directory (e.g. 'work/people/example-person/log.md').",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative file path" },
      },
      required: ["path"],
    },
  },
  {
    name: "list_files",
    description: "List files in a directory. Path is relative to the data directory.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative directory path" },
      },
      required: ["path"],
    },
  },
  {
    name: "mongodb_query",
    description: "Query a MongoDB collection. Returns up to 50 documents.",
    parameters: {
      type: "object",
      properties: {
        collection: { type: "string", description: "Collection name (e.g. 'todos', 'engineer_scores')" },
        filter: { type: "object", description: "MongoDB filter object" },
        sort: { type: "object", description: "MongoDB sort object" },
        limit: { type: "number", description: "Max documents to return (default 20)" },
      },
      required: ["collection"],
    },
  },
  {
    name: "create_todo",
    description: "Create a new todo item.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "Todo text" },
        project: { type: "string", description: "Project tag: WORK, PER, ADG, KCL, CER, KAB, TBP, or RUT" },
        priority: { type: "string", description: "Priority: critical, first-thing, or normal" },
        section: { type: "string", description: "Section to add to (default: today)" },
      },
      required: ["text", "project"],
    },
  },
  {
    name: "complete_todo",
    description: "Mark a todo as complete by its ID.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Todo _id" },
      },
      required: ["id"],
    },
  },
  {
    name: "add_note",
    description: "Append a dated note to a person's log file.",
    parameters: {
      type: "object",
      properties: {
        project: { type: "string", description: "Project code (e.g. 'fc', 'fvr', 'fs')" },
        person_slug: { type: "string", description: "Person slug (e.g. 'nombre-apellido')" },
        note: { type: "string", description: "Note text to append" },
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
      },
      required: ["project", "person_slug", "note"],
    },
  },
  {
    name: "search",
    description: "Search across all knowledge base files for a term.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
  },
  {
    name: "save_memory",
    description: "Save a memory to the shared AI memory store. All AIs (Claude Code, dashboard chat, Codex, etc.) can read these. Use this to persist important context, decisions, corrections, or facts that should carry across sessions.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Short name for the memory (e.g. 'deploy freeze', 'team morale high')" },
        content: { type: "string", description: "The memory content — what to remember" },
        type: { type: "string", description: "Memory type: user, feedback, project, reference, or context" },
        tags: { type: "string", description: "Comma-separated tags for searchability (e.g. 'fc,brent,scoring')" },
      },
      required: ["name", "content", "type"],
    },
  },
  {
    name: "request_code_change",
    description: "Dispatch a coding task to Claude Code running on <usuaria>'s Mac. Use this when the user asks to modify the repo, fix a bug, ship a feature, deploy, etc — anything that requires writing/editing files, running git, or shell commands. The task is queued in MongoDB. A push notification with Approve/Reject buttons goes to her iPhone (and the /tasks page on web). When she taps Approve, her Mac runs Claude Code with --dangerously-skip-permissions on the prompt. Return the task_id so she can check status later. DO NOT use this for read-only questions about the code — for those just use read_file/list_files.",
    parameters: {
      type: "object",
      properties: {
        description: { type: "string", description: "Detailed prompt for Claude Code. Include WHAT to change, WHY, and any context the agent needs (file paths, expected behavior). The Mac agent has zero conversation history — be self-contained." },
      },
      required: ["description"],
    },
  },
  {
    name: "check_code_task",
    description: "Check status/result of a previously dispatched code task. Use when the user asks 'is it done?', 'what happened with that task?', etc.",
    parameters: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "Task _id returned by request_code_change" },
      },
      required: ["task_id"],
    },
  },
  {
    name: "log_mood",
    description: "Log <usuaria>'s end-of-day mood. Saves to mental_health collection (one doc per day, keyed by date). NEVER infer the score from keywords — always use the explicit number she gives. If she just says how she feels without a number, ASK her for a 1-10 score before calling this.",
    parameters: {
      type: "object",
      properties: {
        mood: { type: "string", description: "Free-text mood label, e.g. 'Great / energized', 'Tired but happy', 'Anxious'." },
        moodScore: { type: "number", description: "1-10 numeric score she gave you. REQUIRED — do not invent." },
        notes: { type: "string", description: "Optional context about the day." },
        date: { type: "string", description: "Optional YYYY-MM-DD; defaults to today." },
      },
      required: ["mood", "moodScore"],
    },
  },
  {
    name: "log_sleep",
    description: "Log <usuaria>'s start-of-day sleep. Saves to mental_health collection (same doc as mood, keyed by date). NEVER infer the score — always use the explicit number she gives.",
    parameters: {
      type: "object",
      properties: {
        sleepScore: { type: "number", description: "1-10 numeric score she gave you. REQUIRED — do not invent." },
        sleepNotes: { type: "string", description: "Optional notes about quality, dreams, wakeups, etc." },
        sleepAid: { type: "string", description: "Optional sleep aid used (e.g. 'melatonin', 'none')." },
        date: { type: "string", description: "Optional YYYY-MM-DD; defaults to today." },
      },
      required: ["sleepScore"],
    },
  },
  {
    name: "wishlist_add",
    description: "Add a new item to the wishlist.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Item name." },
        price: { type: "number", description: "Optional price as a number." },
        currency: { type: "string", description: "Optional ISO currency code (USD, MXN, etc.)." },
        url: { type: "string", description: "Optional product URL." },
        category: { type: "string", description: "Optional category." },
        notes: { type: "string", description: "Optional notes." },
      },
      required: ["name"],
    },
  },
  {
    name: "wishlist_toggle_purchased",
    description: "Toggle the purchased state of a wishlist item by id.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Wishlist item _id." },
      },
      required: ["id"],
    },
  },
  {
    name: "toggle_person_favorite",
    description: "Toggle the favorite flag for a person profile.",
    parameters: {
      type: "object",
      properties: {
        project: { type: "string", description: "Project code (WORK, PER, ADG, KCL, CER, KAB, TBP, RUT)." },
        slug: { type: "string", description: "Person slug." },
        favorite: { type: "boolean", description: "true to mark favorite, false to unmark." },
      },
      required: ["project", "slug", "favorite"],
    },
  },
  {
    name: "ceramics_add_batch",
    description: "Create a new ceramics production batch (a batch represents N pieces made the same day).",
    parameters: {
      type: "object",
      properties: {
        count: { type: "number", description: "Number of pieces in the batch." },
        series: { type: "string", description: "Optional series/collection name." },
        formulaPasta: { type: "string", description: "Optional pasta formula slug used (e.g. 'pasta_alta-temperatura')." },
        state: { type: "string", description: "Initial state: wet | leather_hard | bone_dry | bisque | glazed | fired | broken (defaults to wet)." },
        notes: { type: "string", description: "Optional notes about the batch." },
      },
      required: ["count"],
    },
  },
  {
    name: "ceramics_update_batch_state",
    description: "Move a ceramics batch to a new production state (e.g. wet -> leather_hard).",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Batch _id." },
        state: { type: "string", description: "New state: wet | leather_hard | bone_dry | bisque | glazed | fired | broken." },
      },
      required: ["id", "state"],
    },
  },
  {
    name: "todo_move",
    description: "Move a todo to a different date/section.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Todo _id." },
        targetDate: { type: "string", description: "YYYY-MM-DD to move it to." },
      },
      required: ["id", "targetDate"],
    },
  },
  {
    name: "todo_delete",
    description: "Delete a todo entirely (use complete_todo for normal completion — this is for cancelling/removing).",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Todo _id." },
      },
      required: ["id"],
    },
  },
  {
    name: "ceramics_upsert_formula",
    description: "Create or update a ceramics formula (pasta or esmalte). Pass _id to edit; omit _id to create. Ingredients each have material, percent, optional category (Arcillas|Fundentes|Estructurante|Coloración|Otros) and role (free-text like 'Da temperatura').",
    parameters: {
      type: "object",
      properties: {
        _id: { type: "string", description: "Optional. If present, updates that formula. Format: pasta_<slug> or esmalte_<slug>." },
        type: { type: "string", description: "pasta | esmalte" },
        name: { type: "string", description: "Display name." },
        description: { type: "string" },
        temperatura: { type: "string", description: "Alta | Media | Baja" },
        tecnica: { type: "string", description: "Torno, Construcción, etc." },
        textura: { type: "string", description: "Poroso fino, Porosa, etc." },
        color: { type: "string", description: "Observed fired color." },
        firingCones: { type: "string", description: "Comma-separated cones, e.g. '06, 6, 10'." },
        ingredients: { type: "string", description: "JSON array: [{material, percent, category?, role?}, ...]. NOTE: percent is relative WITHIN the ingredient's group/category (each group must sum to 100%)." },
        groupWeights: { type: "string", description: "JSON object mapping each category in use to its relative weight on the total batch. MUST sum to 100. Example: '{\"Arcillas\":50,\"Fundentes\":40,\"Estructurante\":10}'. Required when ingredients use multiple categories." },
        plasticity: { type: "number" },
        shrinkage: { type: "number" },
        wheelEase: { type: "number" },
        handBuildEase: { type: "number" },
        porosity: { type: "number" },
        notes: { type: "string" },
      },
      required: ["type", "name"],
    },
  },
  {
    name: "ceramics_delete_formula",
    description: "Delete a ceramics formula by _id.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "ceramics_duplicate_formula",
    description: "Duplicate a formula keeping lineage (creates v2/v3/etc). Returns the new formula _id so you can immediately update it via ceramics_upsert_formula.",
    parameters: {
      type: "object",
      properties: { id: { type: "string", description: "Source formula _id." } },
      required: ["id"],
    },
  },
  {
    name: "ceramics_add_firing",
    description: "Log a kiln firing.",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", description: "bizcocho | alta | media | baja | reduccion | neutra | oxidacion | raku | saggar | lustre" },
        cone: { type: "string", description: "e.g. '06', '6', '10'." },
        date: { type: "string", description: "YYYY-MM-DD; defaults to today." },
        results: { type: "string", description: "Markdown notes about the firing results." },
        batchIds: { type: "string", description: "Comma-separated batch _ids that went in this firing." },
        formulasUsed: { type: "string", description: "Comma-separated formula slugs used." },
      },
      required: ["type"],
    },
  },
  {
    name: "add_director_score",
    description: "Score an Adglow director on the 6 leadership dimensions. ALL scores 1-10. Determination MUST be markdown-formatted explaining each score with evidence.",
    parameters: {
      type: "object",
      properties: {
        directorSlug: { type: "string" },
        project: { type: "string", description: "Default ADG." },
        date: { type: "string", description: "YYYY-MM-DD; defaults to today." },
        responsiveness: { type: "number" },
        delegation: { type: "number" },
        strategicThinking: { type: "number" },
        collaboration: { type: "number" },
        execution: { type: "number" },
        leadership: { type: "number" },
        note: { type: "string" },
        determination: { type: "string", description: "Markdown reasoning. ### headers, **bold** dim names with (score) in parens, bullet evidence." },
      },
      required: ["directorSlug", "responsiveness", "delegation", "strategicThinking", "collaboration", "execution", "leadership", "determination"],
    },
  },
  {
    name: "add_client_health",
    description: "Log a client health check entry (8 dimensions, 1-10). Used by /client-health to track how each Karma Creative Lab client is to work with.",
    parameters: {
      type: "object",
      properties: {
        clientCode: { type: "string", description: "KAB | RTH | TBP | etc." },
        paymentReliability: { type: "number" },
        responsiveness: { type: "number" },
        briefQuality: { type: "number" },
        collaboration: { type: "number" },
        feedbackQuality: { type: "number" },
        technicalLiteracy: { type: "number" },
        predictability: { type: "number" },
        respectfulness: { type: "number" },
        note: { type: "string" },
      },
      required: ["clientCode", "paymentReliability", "responsiveness", "briefQuality", "collaboration", "feedbackQuality", "technicalLiteracy", "predictability", "respectfulness"],
    },
  },
  {
    name: "add_engineer_score",
    description: "Score an engineer on the 11 engineering dimensions for today. ALL scores 1-10. Determination MUST be markdown-formatted explaining each score with concrete evidence (PRs, Jira, comms). One doc per engineer per day.",
    parameters: {
      type: "object",
      properties: {
        engineer: { type: "string", description: "Engineer slug, e.g. 'nombre-apellido'." },
        date: { type: "string", description: "YYYY-MM-DD; defaults to today." },
        velocity: { type: "number" },
        quality: { type: "number" },
        reliability: { type: "number" },
        communication: { type: "number" },
        collaboration: { type: "number" },
        initiative: { type: "number" },
        technicalDepth: { type: "number" },
        ownership: { type: "number" },
        coachability: { type: "number" },
        autonomy: { type: "number" },
        attitude: { type: "number" },
        note: { type: "string" },
        determination: { type: "string", description: "Markdown reasoning with ### headers + **bold** dim names with (score) + bullets of evidence + --- separators." },
      },
      required: ["engineer", "velocity", "quality", "reliability", "communication", "collaboration", "initiative", "technicalDepth", "ownership", "coachability", "autonomy", "attitude", "determination"],
    },
  },
  {
    name: "add_manager_feedback",
    description: "Daily leadership self-assessment for <usuaria> (one doc per day). Scores 1-10 on 8 dimensions. Determination MUST be markdown-formatted with evidence from today's leadership activities.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-MM-DD; defaults to today." },
        delegation: { type: "number" },
        growthConversations: { type: "number" },
        biasAwareness: { type: "number" },
        decisionQuality: { type: "number" },
        peerDynamics: { type: "number" },
        timeManagement: { type: "number" },
        communication: { type: "number" },
        strategicThinking: { type: "number" },
        topStrength: { type: "string" },
        biggestGrowthArea: { type: "string" },
        actionItem: { type: "string" },
        determination: { type: "string", description: "Markdown reasoning with evidence." },
      },
      required: ["delegation", "growthConversations", "biasAwareness", "decisionQuality", "peerDynamics", "timeManagement", "communication", "strategicThinking", "determination"],
    },
  },
  {
    name: "log_food",
    description: "Log a food entry for <usuaria>. The macros (calories, protein, etc.) are auto-looked-up server-side from the description, so just describe what she ate naturally. Use whenever she mentions eating something, OR when she explicitly asks to log/save a meal.",
    parameters: {
      type: "object",
      properties: {
        meal: { type: "string", description: "Meal type: desayuno | comida | cena | snack" },
        what: { type: "string", description: "What she ate, in natural language. E.g. 'avena con arándanos y café', '2 tacos al pastor con piña'." },
        date: { type: "string", description: "Optional date YYYY-MM-DD; defaults to today" },
      },
      required: ["meal", "what"],
    },
  },
  {
    name: "log_exercise",
    description: "Log an exercise/activity entry. Use when <usuaria> mentions she worked out, ran, did yoga, etc., OR when she asks to log it.",
    parameters: {
      type: "object",
      properties: {
        activity: { type: "string", description: "Activity name. E.g. 'corrida 5k', 'yoga 30 min', 'pesas espalda'." },
        notes: { type: "string", description: "Optional notes (intensity, how she felt, etc.)" },
        date: { type: "string", description: "Optional date YYYY-MM-DD; defaults to today" },
      },
      required: ["activity"],
    },
  },
  {
    name: "get_overview",
    description: "Get the current Overview snapshot: today's todos, daily metrics, latest mood, focus today, projects. Same data shown on <usuaria>'s home screen.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_recurring_due",
    description: "List ALL recurring tasks (rutinas, tareas recurrentes), grouped by status: DUE TODAY, UPCOMING, PAUSED. Use this whenever the user asks ANYTHING about recurring/rutinas — 'qué recurring tengo', '¿dónde están mis rutinas matutinas?', 'mis tareas recurrentes', '¿qué tengo pendiente que se repite?'. NEVER use mongodb_query collection=todos for this — recurring tasks live in collection=recurring_tasks, not todos.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "trigger_recurring",
    description: "Trigger a recurring task — creates a new todo from the template and advances nextDue. Use when the user says 'trigger X' or 'ya hice la tarea recurrente X'.",
    parameters: {
      type: "object",
      properties: { id: { type: "string", description: "Recurring task _id" } },
      required: ["id"],
    },
  },
  {
    name: "get_wellness_today",
    description: "Get today's wellness entries: food logs + exercise logs + computed macros. Useful when asked about 'qué he comido hoy' or calories/macros.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_apple_health_today",
    description: "Get today's Apple Health sync: steps, sleep hours, heart rate, weight, workouts, etc.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_mental_health_history",
    description: "Get the last N days of mental health entries (mood + sleep scores). Defaults to last 30 days.",
    parameters: {
      type: "object",
      properties: { days: { type: "number", description: "How many days back (default 30)" } },
      required: [],
    },
  },
  {
    name: "get_engineer_scores",
    description: "Get recent engineer performance scores. Use when asked 'how is X engineer doing' or to review yesterday's scoring session.",
    parameters: {
      type: "object",
      properties: {
        engineer: { type: "string", description: "Optional slug to filter (e.g. 'nombre-apellido')" },
        limit: { type: "number", description: "Max docs (default 20)" },
      },
      required: [],
    },
  },
  {
    name: "get_director_scores",
    description: "Get recent director (Adglow leadership) scores.",
    parameters: {
      type: "object",
      properties: {
        directorSlug: { type: "string", description: "Optional filter" },
        limit: { type: "number" },
      },
      required: [],
    },
  },
  {
    name: "get_manager_feedback",
    description: "Get recent daily leadership self-assessments.",
    parameters: {
      type: "object",
      properties: { limit: { type: "number", description: "Max docs (default 14)" } },
      required: [],
    },
  },
  {
    name: "get_client_health",
    description: "Get latest client health assessments per client (payment reliability, responsiveness, brief quality, etc).",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_ceramics_summary",
    description: "Get ceramics production summary: batch counts by state, recent firings, formulas in use.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_milestones",
    description: "Get all active milestones. Use when reviewing progress or planning.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_daily_summary",
    description: "Get a daily summary by date (defaults to yesterday).",
    parameters: {
      type: "object",
      properties: { date: { type: "string", description: "YYYY-MM-DD; defaults to yesterday" } },
      required: [],
    },
  },
  {
    name: "get_ai_costs",
    description: "Get AI usage costs over the last N days (defaults to 30). Shows cost by model + provider.",
    parameters: {
      type: "object",
      properties: { days: { type: "number", description: "Days back (default 30)" } },
      required: [],
    },
  },
  {
    name: "search_memory",
    description: "Search the shared AI memory store. Returns memories matching the query. Use this to recall context from previous sessions.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search text (matches name, content, tags)" },
        type: { type: "string", description: "Filter by type: user, feedback, project, reference, context" },
        limit: { type: "number", description: "Max results (default 10)" },
      },
      required: ["query"],
    },
  },
];
