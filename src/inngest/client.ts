import { EventSchemas, Inngest } from "inngest";

type Events = {
  "session/completed": {
    data: {
      sessionId: string;
      seriesId: string;
      tenantId: string;
      managerId: string;
      reportId: string;
    };
  };
  "session/nudges.refresh": {
    data: {
      seriesId: string;
      tenantId: string;
      managerId: string;
      reportId: string;
      nextSessionAt: string;
    };
  };
  "session/ai.retry": {
    data: {
      sessionId: string;
      tenantId: string;
      managerId: string;
    };
  };
};

export const inngest = new Inngest({
  id: "1on1",
  schemas: new EventSchemas().fromRecord<Events>(),
});
