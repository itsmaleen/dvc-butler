import { InfoIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface HelpTooltipProps {
  content: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  iconClassName?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

export default function HelpTooltip({
  content,
  children,
  className = "",
  iconClassName = "h-4 w-4",
  side = "right",
  align = "center",
}: HelpTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {children ? (
            <span className={`inline-flex items-center ${className}`}>
              {children}
              <InfoIcon
                className={`ml-1 text-muted-foreground ${iconClassName}`}
              />
            </span>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className={`h-6 w-6 rounded-full ${className}`}
            >
              <InfoIcon className={`text-muted-foreground ${iconClassName}`} />
            </Button>
          )}
        </TooltipTrigger>
        <TooltipContent side={side} align={align} className="max-w-xs">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
