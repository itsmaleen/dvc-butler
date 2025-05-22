import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
// import WizardProgress from "@/src/components/wizard-progress";
import WizardProgress from "./wizard-progress";

interface WizardLayoutProps {
  children: React.ReactNode;
  steps: string[];
  currentStep: number;
  onNext: () => void;
  onPrevious: () => void;
  onComplete?: () => void;
  isNextDisabled?: boolean;
  isPreviousDisabled?: boolean;
  isLastStep?: boolean;
}

export default function WizardLayout({
  children,
  steps,
  currentStep,
  onNext,
  onPrevious,
  onComplete,
  isNextDisabled = false,
  isPreviousDisabled = false,
  isLastStep = false,
}: WizardLayoutProps) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="shadow-md">
        <div className="p-6 border-b">
          <WizardProgress steps={steps} currentStep={currentStep} />
        </div>
        <CardContent className="p-6 min-h-[400px]">{children}</CardContent>
        <CardFooter className="p-6 border-t flex justify-between">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={isPreviousDisabled || currentStep === 0}
          >
            Previous
          </Button>
          <div className="flex gap-2">
            {isLastStep ? (
              <Button onClick={onComplete} disabled={isNextDisabled}>
                Complete Setup
              </Button>
            ) : (
              <Button onClick={onNext} disabled={isNextDisabled}>
                Next
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
