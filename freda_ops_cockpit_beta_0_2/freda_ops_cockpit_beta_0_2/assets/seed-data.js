window.FREDA_SEED_DATA = {
  stores: [
    {
      id: "beverly_hills",
      name: "Beverly Hills",
      status: "Amber",
      sales: 7599,
      focus: "Protect lunch and early-afternoon cabinet fullness.",
      notes: "Main volume engine. Strongest risk window is 12:00-16:00."
    },
    {
      id: "penrith",
      name: "Penrith",
      status: "Green",
      sales: 3766,
      focus: "Keep cabinet strong from lunch through afternoon.",
      notes: "Afternoon-led store. Watch 15:00-18:00."
    },
    {
      id: "taren_point",
      name: "Taren Point",
      status: "Amber",
      sales: 1611,
      focus: "Protect early trade and lunch window.",
      notes: "Concentrated between 10:00-15:00. Keep operations simple."
    },
    {
      id: "friedas_pies",
      name: "Frieda’s Pies",
      status: "Amber",
      sales: 40731,
      focus: "Review pie production against actual movement.",
      notes: "Square sales layer and production planning need validation."
    }
  ],
  actions: [
    {
      store: "Beverly Hills",
      priority: "Amber",
      action: "Confirm cabinet photo before lunch and protect premium display."
    },
    {
      store: "Penrith",
      priority: "Green",
      action: "Check afternoon top-up before 3pm."
    },
    {
      store: "Taren Point",
      priority: "Amber",
      action: "Confirm early stock and coffee/pie readiness."
    },
    {
      store: "Frieda’s Pies",
      priority: "Amber",
      action: "Compare bake plan with yesterday’s sales and leftover position."
    }
  ],
  briefing: [
    "Beverly Hills is the main sales engine today; protect lunch and early afternoon availability.",
    "Penrith is stable but should watch the 15:00-18:00 window.",
    "Taren Point needs early trade and lunch readiness checked.",
    "Frieda’s Pies should review production against Square sales and leftover signals.",
    "WhatsApp actions should be checked before the lunch peak."
  ],
  questions: [
    "What needs my attention today?",
    "Which store is underperforming?",
    "Show me open actions.",
    "Draft a message to the Taren Point manager.",
    "What should Beverly Hills protect today?"
  ]
};
