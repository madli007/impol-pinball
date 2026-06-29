(function () {
  const config = window.ImpolPinballConfig || (window.ImpolPinballConfig = {});
  const { UPPER_ORBIT } = config;
  const COMPANY_STATUS = {
    ready: { label: "Ready", rank: 0 },
    online: { label: "Online", rank: 1 },
    complete: { label: "Complete", rank: 2 },
    bonus: { label: "Bonus", rank: 3 }
  };
  const COMPANY_CONFIG = [
    {
      id: "impol",
      label: "IMPOL",
      events: ["hit:MEASUREMENT", "hit:MES", "hit:ERP", UPPER_ORBIT.event],
      missions: ["measurement", "mes", "erp"]
    },
    {
      id: "seval",
      label: "SEVAL",
      events: ["hit:LEFT_SLINGSHOT", "hit:EODPREMA"],
      missions: ["eodprema"]
    },
    {
      id: "alcad",
      label: "ALCAD",
      events: ["hit:ALCAD"],
      missions: ["alcad"]
    },
    {
      id: "tlm",
      label: "TLM",
      events: ["hit:GREEN", "hit:FURNACE"],
      missions: ["green", "furnace"]
    },
    {
      id: "impol-pc",
      label: "IMPOL-PC",
      events: ["hit:RIGHT_SLINGSHOT", "hit:COIL"],
      missions: ["coil"]
    },
    {
      id: "rondal",
      label: "RONDAL",
      events: ["hit:ROLLOVER", "hit:KOSOVNICA"],
      missions: ["kosovnica"]
    }
  ];
  const COMPANY_BY_EVENT = COMPANY_CONFIG.reduce((companiesByEvent, company) => {
    company.events.forEach((eventName) => {
      companiesByEvent[eventName] = company.id;
    });
    return companiesByEvent;
  }, {});
  const COMPANY_BY_MISSION = COMPANY_CONFIG.reduce((companiesByMission, company) => {
    company.missions.forEach((missionId) => {
      companiesByMission[missionId] = company.id;
    });
    return companiesByMission;
  }, {});
  Object.assign(config, {
    COMPANY_STATUS,
    COMPANY_CONFIG,
    COMPANY_BY_EVENT,
    COMPANY_BY_MISSION
  });
})();
