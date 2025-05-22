import { cn } from "@/lib/utils";

interface WizardProgressProps {
  steps: string[];
  currentStep: number;
}

export default function WizardProgress({
  steps,
  currentStep,
}: WizardProgressProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center relative">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border-2 z-10",
                index < currentStep
                  ? "bg-primary text-primary-foreground border-primary"
                  : index === currentStep
                  ? "bg-primary/20 text-primary border-primary"
                  : "bg-muted text-muted-foreground border-muted-foreground/30"
              )}
            >
              {index < currentStep ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            <span
              className={cn(
                "text-xs mt-2 font-medium",
                index <= currentStep ? "text-primary" : "text-muted-foreground"
              )}
            >
              {step}
            </span>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "absolute top-5 w-[calc(100%-2.5rem)] h-[2px] -right-1/2",
                  index < currentStep ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
