import brandLogo from "../../../assets/ems-logo-brand.png";
import { cn } from "../../utils/cn";

interface AppBrandProps {
  className?: string;
  logoClassName?: string;
}

export function AppBrand({ className, logoClassName }: AppBrandProps) {
  return (
    <div className={cn("inline-flex items-center", className)}>
      <img
        src={brandLogo}
        alt="EMS AI Marketing Spa"
        className={cn("h-10 w-auto max-w-[220px] object-contain object-center", logoClassName)}
      />
    </div>
  );
}
