import { cn } from "@/lib/utils";

type StepState = "complete" | "current" | "upcoming";

type FlowStep = {
  title: string;
  description: string;
  state: StepState;
};

export function CustomerFlowSteps({ steps }: { steps: FlowStep[] }) {
  return (
    <div className="mt-6 grid gap-3 rounded-[24px] bg-white/8 p-3 backdrop-blur sm:grid-cols-3 sm:rounded-[28px] sm:p-4">
      {steps.map((step, index) => (
        <div
          key={step.title}
          className={cn(
            "rounded-2xl border p-4 transition",
            step.state === "complete" &&
              "border-emerald-300/50 bg-emerald-400/15 text-white",
            step.state === "current" &&
              "border-orange-300/60 bg-orange-300/15 text-white",
            step.state === "upcoming" &&
              "border-white/10 bg-white/5 text-stone-200",
          )}
        >
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                step.state === "complete" && "bg-emerald-300 text-emerald-950",
                step.state === "current" && "bg-orange-300 text-orange-950",
                step.state === "upcoming" && "bg-white/10 text-white",
              )}
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{step.title}</p>
              <p className="mt-1 text-xs leading-5 text-current/80">{step.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
