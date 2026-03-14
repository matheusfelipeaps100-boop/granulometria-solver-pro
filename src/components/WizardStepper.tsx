import { cn } from "@/lib/utils";
import { Check, type LucideIcon } from "lucide-react";

interface Step {
  number: number;
  title: string;
  icon?: LucideIcon;
}

interface WizardStepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function WizardStepper({ steps, currentStep, onStepClick }: WizardStepperProps) {
  return (
    <div className="w-full rounded-xl bg-card border p-3 shadow-sm">
      <div className="flex items-center gap-1">
        {steps.map((step, index) => {
          const isLastStep = index === steps.length - 1;
          const isCompleted = currentStep > step.number || (isLastStep && currentStep === step.number);
          const isCurrent = currentStep === step.number && !isLastStep;
          const isClickable = !!onStepClick;
          const Icon = step.icon;

          return (
            <div key={step.number} className="flex items-center flex-1 last:flex-none">
              {/* Step card */}
              <div
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 transition-all duration-200 select-none",
                  isCompleted && "bg-success/10",
                  isCurrent && "bg-primary text-primary-foreground shadow-md",
                  !isCompleted && !isCurrent && "bg-muted/50",
                  isClickable && "cursor-pointer hover:shadow-sm",
                )}
                onClick={() => isClickable && onStepClick?.(step.number)}
              >
                {/* Icon / check circle */}
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all",
                    isCompleted && "bg-success text-white",
                    isCurrent && "bg-primary-foreground/20 text-primary-foreground",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground",
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : Icon ? (
                    <Icon className="h-4 w-4" />
                  ) : (
                    step.number
                  )}
                </div>

                {/* Label — hidden on small screens for non-current */}
                <span
                  className={cn(
                    "text-xs font-semibold whitespace-nowrap hidden sm:block",
                    isCurrent && "text-primary-foreground",
                    isCompleted && "text-success",
                    !isCompleted && !isCurrent && "text-muted-foreground",
                  )}
                >
                  {step.title}
                </span>
              </div>

              {/* Connector */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-1.5">
                  <div
                    className={cn(
                      "h-0.5 w-full rounded-full transition-colors duration-300",
                      currentStep > step.number ? "bg-success" : "bg-border",
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
